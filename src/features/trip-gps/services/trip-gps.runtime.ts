import { TripGpsSimulator } from '@/services/location/tripGpsSimulator';
import { generateUUID } from '@/services/storage/recordingDatabase';
import { readStoredAuth } from '@/features/auth/storage';
import { TripGpsSocketService } from './trip-gps.socket';
import { TripGpsUploader } from './trip-gps.upload';
import { listLocalTrips, readLocalTrip, localSamples, packageRoutes, commitControl, changeLocalTrip } from './trip-gps.local';
import { ingestLocations, setCollectorListeners, stopTripCollector } from './trip-gps.collector';
import { getLocalTripDistance } from './trip-gps.result';
import type { GpsSample, EventEnvelope, LocationUpdated, PresenceUpdated } from '../types';
import type { LocalTrip, OfflinePackage } from '../contract';

export interface RuntimeEvent {
  kind: 'refresh' | 'sample' | 'socket' | 'location' | 'presence' | 'state' | 'error'; tripId?: string;
  sample?: GpsSample; connected?: boolean; message?: string;
  location?: EventEnvelope<LocationUpdated>; presence?: EventEnvelope<PresenceUpdated>;
}
type Viewer = { count: number; data: OfflinePackage };
type Publisher = { streamId: string; sequence: number; at: number; busy: boolean; pending?: GpsSample };
export class TripGpsRuntime {
  private account: string | null = null;
  private token: string | null = null;
  private epoch = 0;
  private foreground = true;
  private uploader?: TripGpsUploader;
  private simulator?: TripGpsSimulator;
  private collectorId?: string;
  private collectorRevision = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private simulationWrites: Promise<unknown> = Promise.resolve();
  private simulationFailure: unknown;
  private sockets = new Map<string, TripGpsSocketService>();
  private blockedGroups = new Set<string>();
  private viewers = new Map<string, Viewer>();
  private publishers = new Map<string, Publisher>();
  private listeners = new Set<(event: RuntimeEvent) => void>();
  on(listener: (event: RuntimeEvent) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit(event: RuntimeEvent) { for (const listener of this.listeners) listener(event); }
  private error(e: unknown, tripId?: string) { this.emit({ kind: 'error', tripId, message: e instanceof Error ? e.message : String(e) }); }
  async authenticate(account: string | null, token: string | null) {
    if (account === this.account && token === this.token) return;
    const changed = account !== this.account;
    this.epoch++; this.account = account; this.token = token;
    this.sockets.forEach(s => s.disconnect()); this.sockets.clear(); this.blockedGroups.clear();
    this.uploader?.stop(); this.uploader = undefined;
    await this.suspendCollector();
    if (changed) { this.publishers.clear(); this.viewers.clear(); }
    if (!account) return;
    const epoch = this.epoch;
    this.uploader = new TripGpsUploader(account, () => this.account === account && this.epoch === epoch, tripId => this.emit({ kind: 'refresh', tripId }));
    setCollectorListeners((trip, point) => {
      if (trip.accountId !== this.account) return;
      this.emit({ kind: 'sample', tripId: trip.session.tripId, sample: point });
      void this.offer(trip, point).catch(() => {});
    }, message => this.emit({ kind: 'error', message }));
    await this.reconcileCollector();
    for (const view of this.viewers.values()) this.ensureSocket(view.data);
    void this.sync().catch(e => this.error(e));
  }
  setForeground(value: boolean) {
    if (value === this.foreground) return;
    this.foreground = value;
    if (!value) { this.simulator?.pause(); this.sockets.forEach(s => s.disconnect()); this.sockets.clear(); }
    else { void this.reconcileCollector().catch(e => this.error(e)); void this.reconnect().catch(e => this.error(e)); }
  }
  async reconnect() {
    this.blockedGroups.clear();
    if (!this.foreground) return;
    void this.sync(true).catch(e => this.error(e));
    for (const view of this.viewers.values()) this.ensureSocket(view.data);
    if (this.account) for (const trip of await listLocalTrips(this.account)) if (trip.session.status === 'ACTIVE') this.ensureSocket(trip.package);
  }
  watch(data: OfflinePackage) {
    const id = data.snapshot.tripId;
    this.viewers.set(id, { data, count: (this.viewers.get(id)?.count ?? 0) + 1 });
    this.ensureSocket(data)?.setViewing(true);
    return () => {
      const view = this.viewers.get(id); if (!view) return;
      view.count--; if (view.count <= 0) { this.viewers.delete(id); this.sockets.get(id)?.setViewing(false); void this.release(id); }
    };
  }
  private async release(tripId: string) {
    const account = this.account;
    if (!account || this.viewers.has(tripId)) return;
    if ((await listLocalTrips(account, tripId)).some(t => t.session.status === 'ACTIVE')) return;
    if (this.account !== account || this.viewers.has(tripId)) return;
    this.sockets.get(tripId)?.disconnect(); this.sockets.delete(tripId);
  }
  isConnected(tripId: string) { return this.sockets.get(tripId)?.isConnected() ?? false; }
  private sharingAllowed(data: OfflinePackage) {
    const now = Date.now(); return now >= Date.parse(data.groupSharingFrom) && now <= Date.parse(data.groupSharingUntil);
  }
  private ensureSocket(data: OfflinePackage) {
    const tripId = data.snapshot.tripId;
    if (!this.account || !this.token || !this.foreground || !this.sharingAllowed(data) || this.blockedGroups.has(tripId)) return;
    const existing = this.sockets.get(tripId); if (existing) return existing;
    const socket = new TripGpsSocketService(), epoch = this.epoch;
    const valid = () => this.epoch === epoch;
    this.sockets.set(tripId, socket);
    socket.connect(this.token, tripId, {
      onConnect: () => { if (valid()) this.emit({ kind: 'socket', tripId, connected: true }); },
      onDisconnect: () => { if (valid()) this.emit({ kind: 'socket', tripId, connected: false }); },
      onSubscribed: () => { if (valid()) this.emit({ kind: 'state', tripId }); },
      onLocationUpdated: location => { if (valid() && location.contractVersion === 'trip-gps/3.0.0') this.emit({ kind: 'location', tripId, location }); },
      onPresenceUpdated: presence => { if (valid() && presence.contractVersion === 'trip-gps/3.0.0') this.emit({ kind: 'presence', tripId, presence }); },
      onError: error => {
        const code = error?.data?.error?.code ?? error?.code;
        if (valid() && ['FORBIDDEN', 'GPS_INVALID_SESSION_STATE'].includes(code)) { this.blockedGroups.add(tripId); socket.disconnect(); this.sockets.delete(tripId); }
      },
    }, { viewing: this.viewers.has(tripId), protocolVersion: 3 });
    return socket;
  }
  private async haltCollector() {
    this.simulator?.stop(); this.simulator = undefined; this.collectorId = undefined;
    await this.simulationWrites;
    await stopTripCollector();
    if (this.simulationFailure) { const error = this.simulationFailure; this.simulationFailure = undefined; throw error; }
  }
  async suspendCollector() { this.collectorRevision++; await this.haltCollector(); }
  reconcileCollector(_permissions = false): Promise<void> {
    const ticket = ++this.collectorRevision;
    const run = this.queue.then(async () => {
      const account = this.account, epoch = this.epoch;
      if (!account || ticket !== this.collectorRevision) return;
      const trip = (await listLocalTrips(account)).find(t => t.session.status === 'ACTIVE');
      if (epoch !== this.epoch || ticket !== this.collectorRevision) return;
      if (!trip) { await this.haltCollector(); for (const id of this.sockets.keys()) void this.release(id); return; }
      this.ensureSocket(trip.package);
      if (this.collectorId === trip.session.id && this.simulator) { if (this.foreground) this.simulator.resume(); return; }
      await this.haltCollector();
      const plans = await packageRoutes(trip.package), plan = plans.find(p => p.trailPlanId === trip.package.snapshot.activeTrailPlanId) ?? plans[0];
      const routeSegments = plan?.geometry?.type === 'MultiLineString' ? plan.geometry.coordinates : [plan?.geometry?.coordinates ?? []];
      if (!routeSegments.some(segment => segment.length >= 2)) throw new Error('Tuyến chưa đủ điểm để chạy fake GPS. Hãy tải lại tuyến.');
      if (epoch !== this.epoch || ticket !== this.collectorRevision) return;
      const samples = await localSamples(account, trip.session.id);
      if (epoch !== this.epoch || ticket !== this.collectorRevision) return;
      this.collectorId = trip.session.id;
      this.simulator = new TripGpsSimulator({ routeCoords: [], routeSegments, intervalMs: Math.max(1000, trip.policy.sampleIntervalSeconds * 1000) });
      this.simulator.setProgress(trip.simulatorDistanceM ?? getLocalTripDistance(samples, trip.session.recordingIntervals, trip.policy.signalGapSeconds));
      this.simulator.start((location, segmentIndex = 0) => {
        if (epoch !== this.epoch || this.collectorId !== trip.session.id || !this.foreground) return;
        const progressM = this.simulator?.progressM;
        const write = this.simulationWrites.then(async () => {
          if (epoch !== this.epoch) return;
          let current = await readLocalTrip(account, trip.session.id);
          if (current.session.status !== 'ACTIVE') return;
          if ((current.simulatorSegment ?? 0) !== segmentIndex) {
            // Mark the simulated discontinuity as separate active intervals, not travelled distance.
            await commitControl(account, trip.session.id, 'PAUSE');
            await commitControl(account, trip.session.id, 'RESUME');
            current = await changeLocalTrip(account, trip.session.id, t => { t.simulatorSegment = segmentIndex; });
            this.emit({ kind: 'refresh', tripId: trip.session.tripId });
          }
          const boundary = Date.parse(current.session.recordingIntervals!.at(-1)!.start);
          await ingestLocations(account, trip.session.id, [{ ...location, timestamp: Math.max(location.timestamp, boundary) }], 'SIMULATOR');
          if (progressM !== undefined) await changeLocalTrip(account, trip.session.id, t => { t.simulatorDistanceM = progressM; });
        });
        this.simulationWrites = write.catch(e => { this.simulationFailure = e; this.simulator?.pause(); this.error(e, trip.session.tripId); });
      }, !this.foreground);
    });
    this.queue = run.catch(() => {}); return run;
  }
  async sync(manual = false) { await this.uploader?.sync(manual); }
  private async offer(trip: LocalTrip, point: GpsSample) {
    if (this.account !== trip.accountId || !this.foreground || !this.sharingAllowed(trip.package)) return;
    if (point.accuracyM > trip.policy.maxAcceptedAccuracyM) return;
    const publisher = this.publishers.get(trip.session.id) ?? { streamId: generateUUID(), sequence: 0, at: 0, busy: false };
    this.publishers.set(trip.session.id, publisher); publisher.pending = point;
    const socket = this.ensureSocket(trip.package);
    if (!socket?.isConnected() || publisher.busy || Date.now() - publisher.at < Math.max(5, trip.limits.publishMinIntervalSeconds) * 1000) return;
    const age = Date.now() - Date.parse(point.recordedAt);
    if (age > trip.policy.liveLocationMaxAgeSeconds * 1000 || age < -trip.policy.maxFutureSkewSeconds * 1000) return;
    publisher.busy = true; publisher.at = Date.now(); const epoch = this.epoch;
    try {
      const current = await readLocalTrip(trip.accountId, trip.session.id);
      if (epoch !== this.epoch || current.session.status !== 'ACTIVE' || (await readStoredAuth())?.user.id !== trip.accountId) return;
      await socket.publish({ protocolVersion: 3, eventId: generateUUID(), tripId: trip.session.tripId, deviceId: trip.session.deviceId, streamId: publisher.streamId, sequence: ++publisher.sequence, source: trip.source, location: point });
      if (publisher.pending === point) publisher.pending = undefined;
    } catch (e) {
      if (['FORBIDDEN', 'GPS_INVALID_SESSION_STATE'].includes((e as { code?: string }).code ?? '')) { this.blockedGroups.add(trip.session.tripId); socket.disconnect(); this.sockets.delete(trip.session.tripId); }
    } finally { publisher.busy = false; }
  }
}
export const tripGpsRuntime = new TripGpsRuntime();
