import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';
import { getDatabase } from '@/services/storage/recordingDatabase';
import { getLocalTripDistance, splitLocalTripRoute } from '../services/trip-gps.result';
import { snapToRoute } from '@/utils/mapMatching';
import { fetchGroup } from '../services/trip-gps.client';
import { tripGpsRuntime } from '../services/trip-gps.runtime';
import { getPackage, packageRoutes, readablePackageRoutes, listLocalTrips, localSamples, createLocalTrip, commitControl, downloadPackage, checkPackageGrants } from '../services/trip-gps.local';
import type { CachedPackage, LocalTrip, GroupState } from '../contract';
import type { GpsContextResponse, GpsSample, GpsStateResponse, MemberStateDto, PlannedRouteDto, ActualRouteResponse } from '../types';

const emptyProgress = { applicable: false, total: 0, passed: 0, percentage: null, arrivedCheckpointIds: [], lastArrival: null };
function adaptMember(m: GroupState['members'][number]): MemberStateDto {
  return {
    userId: m.userId, fullName: m.fullName, avatarUrl: m.avatarUrl, tripRole: m.tripRole, source: m.source,
    memberVersion: 0, session: null, lastLocation: m.location ? { ...m.location, altitudeM: m.location.altitudeM ?? null, speedMps: m.location.speedMps ?? null, headingDeg: m.location.headingDeg ?? null, receivedAt: m.receivedAt ?? m.location.recordedAt } : null,
    locationStatus: m.locationStatus === 'FRESH' ? 'LIVE' : m.locationStatus, locationVersion: m.receivedAt ? Date.parse(m.receivedAt) : 0,
    lastSyncAt: m.receivedAt, checkpointProgress: emptyProgress,
    deviation: { status: 'UNKNOWN', eventId: null, distanceToRouteMeters: null, checkedAt: null },
  };
}
export function useTripGps(tripId?: string, localSessionId?: string) {
  const { user, isLoading: authLoading } = useAuth(), account = user?.id;
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [cached, setCached] = useState<CachedPackage | null>(null);
  const [savedLocal, setLocal] = useState<LocalTrip | null>(null);
  const [plans, setPlans] = useState<PlannedRouteDto[]>([]);
  const [samples, setSamples] = useState<GpsSample[]>([]);
  const [groupCache, setGroup] = useState<(GroupState & { owner: string }) | null>(null);
  const group = groupCache?.owner === account && groupCache?.tripId === tripId ? groupCache : null;
  const [otherSession, setOtherSession] = useState<LocalTrip | null>(null);
  const [legacyCount, setLegacyCount] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null), [groupError, setGroupError] = useState<string | null>(null);
  const [isMapMatchingEnabled, setIsMapMatchingEnabled] = useState(true), [clock, setClock] = useState(() => Date.now());
  const [socketConnected, setSocketConnected] = useState(false);
  const active = useRef({ account, tripId });
  useEffect(() => { active.current = { account, tripId }; }, [account, tripId]);
  const mounted = useRef(true), revision = useRef(0), locked = useRef(false), network = useRef<Promise<void> | null>(null);
  const valid = useCallback((owner: string, id: string) => mounted.current && active.current.account === owner && active.current.tripId === id, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { const sub = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => sub.remove(); }, []);
  const local = savedLocal && savedLocal.accountId === account && savedLocal.session.tripId === tripId ? savedLocal : null;
  const packageData = cached && cached.accountId === account && cached.tripId === tripId ? cached.data : local?.package ?? null;
  const packageRef = useRef(packageData);
  useEffect(() => { packageRef.current = packageData; }, [packageData]);
  const packageId = packageData?.packageId, grantId = packageData?.grant.claims.grantId;
  const localRef = useRef(local);
  useEffect(() => { localRef.current = local; }, [local]);

  const loadLocal = useCallback(async () => {
    if (!account || !tripId) return;
    const ticket = ++revision.current;
    const [all, pkg] = await Promise.all([listLocalTrips(account), getPackage(account, tripId)]);
    const own = all.filter(t => t.session.tripId === tripId), current = (localSessionId ? own.find(t => t.session.id === localSessionId) : null) ?? own.find(t => t.session.status !== 'STOPPED') ?? own[0] ?? null;
    const routesPromise = current && current.session.status !== 'STOPPED' ? packageRoutes(current.package) : current ? readablePackageRoutes({ accountId: account, tripId, data: current.package, downloadedAt: current.session.startedAt, grantStatus: pkg?.grantStatus }) : pkg ? readablePackageRoutes(pkg) : Promise.resolve([]);
    const [points, routes] = await Promise.all([current ? localSamples(account, current.session.id) : [], routesPromise]);
    if (!valid(account, tripId) || ticket !== revision.current) return;
    setLocal(current); localRef.current = current; setCached(pkg); setSamples(points); setPlans(routes);
    setOtherSession(all.find(t => t.session.tripId !== tripId && t.session.status !== 'STOPPED') ?? null);
    const db = await getDatabase();
    const exists = await db.getFirstAsync('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'trip_gps_v2_sessions\'');
    if (exists) {
      const legacy = await db.getAllAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_v2_sessions WHERE account_id=?', account);
      if (valid(account, tripId)) setLegacyCount(legacy.filter(r => { try { const t = JSON.parse(r.data_json); return !t.finalProcessed; } catch { return true; } }).length);
    }
  }, [account, tripId, localSessionId, valid]);
  const prepareOffline = useCallback(async () => {
    if (!account || !tripId || downloading) return;
    setDownloading(true); setError(null);
    try { await downloadPackage(account, tripId); if (valid(account, tripId)) await loadLocal(); }
    catch (e) { if (valid(account, tripId)) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (valid(account, tripId)) setDownloading(false); }
  }, [account, tripId, downloading, loadLocal, valid]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
    await Promise.resolve();
    if (cancelled) return;
    setLocal(null); setCached(null); setGroup(null); setPlans([]); setSamples([]); setOtherSession(null); setError(null); setGroupError(null); setLoading(true);
    if (authLoading && !account) return;
    if (!account || !tripId) { setError(!account ? 'Vui lòng đăng nhập để sử dụng GPS.' : 'Thiếu mã chuyến đi.'); setLoading(false); return; }
    await loadLocal().catch(e => { if (!cancelled) setError(String(e)); }).finally(() => { if (!cancelled) setLoading(false); });
    })();
    return () => { cancelled = true; };
  }, [account, tripId, authLoading, loadLocal]);

  // Preparing is explicit: no network request is hidden in start/pause/resume/finish.
  const refreshNetwork = useCallback((): Promise<void> => {
    if (network.current) return network.current;
    if (!account || !tripId || !packageData || !focused || !foreground) return Promise.resolve();
    const now = Date.now();
    if (now < Date.parse(packageData.groupSharingFrom) || now > Date.parse(packageData.groupSharingUntil)) { setGroupError('Vị trí nhóm chỉ hoạt động trong lịch chuyến đi. Ghi local vẫn sử dụng được.'); return Promise.resolve(); }
    const run = (async () => {
      try {
        const state = await fetchGroup(account, tripId);
        if (valid(account, tripId)) {
          setGroup(previous => {
            if (!previous || previous.tripId !== state.tripId || previous.owner !== account) return { ...state, owner: account };
            return { ...state, owner: account, members: state.members.map(m => {
              const old = previous.members.find(o => o.userId === m.userId);
              return old && Date.parse(old.receivedAt ?? '') > Date.parse(m.receivedAt ?? '') ? old : m;
            }) };
          });
          setGroupError(null);
        }
      } catch (e) { if (valid(account, tripId)) setGroupError(e instanceof Error ? e.message : String(e)); }
    })();
    network.current = run; void run.finally(() => { if (network.current === run) network.current = null; }); return run;
  }, [account, tripId, packageData, focused, foreground, valid]);
  const refreshRef = useRef(refreshNetwork);
  useEffect(() => { refreshRef.current = refreshNetwork; }, [refreshNetwork]);
  useEffect(() => {
    if (!account || !tripId) return;
    return tripGpsRuntime.on(event => {
      if (!valid(account, tripId) || (event.tripId && event.tripId !== tripId)) return;
      if (event.kind === 'refresh') void loadLocal().catch(e => setError(String(e)));
      if (event.kind === 'sample' && event.sample) {
        const point = event.sample;
        setSamples(previous => previous.some(p => p.clientSampleId === point.clientSampleId) ? previous : [...previous, point]);
      }
      if (event.kind === 'socket') setSocketConnected(event.connected ?? false);
      if (event.kind === 'state' && focused && foreground) void refreshRef.current();
      if (event.kind === 'error') setError(event.message ?? 'Không ghi được GPS local.');
      if (event.kind === 'location' && event.location) {
        const data = event.location.data;
        setGroup(previous => {
          if (!previous || previous.owner !== account) { if (focused && foreground) void refreshRef.current(); return previous; }
          return { ...previous, members: previous.members.map(m => m.userId !== data.userId || Date.parse(m.receivedAt ?? '') >= data.locationVersion ? m : {
            ...m, location: data.location, receivedAt: data.receivedAt ?? data.location.receivedAt,
            source: data.source ?? m.source, locationStatus: 'FRESH',
          }) };
        });
      }
    });
  }, [account, tripId, focused, foreground, valid, loadLocal]);
  useEffect(() => {
    const data = packageRef.current;
    if (!account || !tripId || !data || !focused || !foreground) return;
    void Promise.resolve().then(() => { if (valid(account, tripId)) setSocketConnected(tripGpsRuntime.isConnected(tripId)); });
    const unwatch = tripGpsRuntime.watch(data);
    void refreshRef.current();
    // Initial snapshot + socket deltas. No context/actual-route polling while recording.
    void checkPackageGrants(account).then(() => loadLocal()).catch(() => {});
    return unwatch;
  }, [account, tripId, packageId, grantId, focused, foreground, loadLocal, valid]);
  useEffect(() => {
    if (!focused || !foreground) return;
    const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer);
  }, [focused, foreground]);

  const startRecording = useCallback(async () => {
    if (!account || !tripId || locked.current) return false;
    locked.current = true; setBusy(true); setError(null);
    try {
      const saved = await createLocalTrip(account, tripId);
      if (!valid(account, tripId)) return false;
      revision.current++; setLocal(saved); localRef.current = saved; setSamples([]); setClock(Date.now());
      setPlans(await packageRoutes(saved.package));
      await tripGpsRuntime.reconcileCollector().catch(e => { if (valid(account, tripId)) setError(e instanceof Error ? e.message : String(e)); });
      return true;
    } catch (e) { if (valid(account, tripId)) { setError(e instanceof Error ? e.message : String(e)); await loadLocal(); } return false; }
    finally { locked.current = false; if (valid(account, tripId)) setBusy(false); }
  }, [account, tripId, valid, loadLocal]);
  const control = useCallback(async (action: 'PAUSE' | 'RESUME' | 'FINISH') => {
    const current = localRef.current;
    if (!account || !tripId || !current || locked.current) return false;
    locked.current = true; setBusy(true); setError(null);
    try {
      await tripGpsRuntime.suspendCollector();
      const updated = await commitControl(account, current.session.id, action);
      if (!valid(account, tripId)) return false;
      revision.current++; setLocal(updated); localRef.current = updated; setClock(Date.now());
      if (action === 'FINISH') setSamples(await localSamples(account, current.session.id));
      await tripGpsRuntime.reconcileCollector();
      if (action === 'FINISH') void tripGpsRuntime.sync(true).catch(() => {});
      return true;
    } catch (e) { if (valid(account, tripId)) setError(`Chưa lưu được thao tác GPS: ${e instanceof Error ? e.message : String(e)}`); void tripGpsRuntime.reconcileCollector().catch(() => {}); return false; }
    finally { locked.current = false; if (valid(account, tripId)) setBusy(false); }
  }, [account, tripId, valid]);

  const effective = local?.package ?? packageData;
  const grant = cached?.data.grant.claims;
  const canStart = !!cached && !!grant && clock >= Date.parse(grant.offlineAccessFrom) && clock < Date.parse(grant.offlineAccessUntil) && !['REVOKED', 'INVALID', 'EXPIRED', 'REVIEW_REQUIRED'].includes(cached.grantStatus ?? '');
  const routeAccess = (!!local && local.session.status !== 'STOPPED') || (plans.length > 0 && !!effective && clock < Date.parse(effective.grant.claims.offlineAccessUntil));
  const context: GpsContextResponse | null = effective ? {
    contractVersion: 'trip-gps/3.0.0', tripId: effective.snapshot.tripId, tripType: 'PRIVATE', tripStatus: 'OPEN', routeSource: plans[0]?.source ?? 'SYSTEM',
    routeVersion: effective.snapshot.tripVersion, rosterVersion: 0, routePlans: routeAccess ? plans : [], activeTrailPlanId: effective.snapshot.activeTrailPlanId,
    checkpointMode: 'NONE', checkpoints: routeAccess ? effective.snapshot.checkpoints : [], policy: effective.snapshot.policy, serverTime: effective.serverTime,
    permissions: { canStartNewSession: canStart, canRecord: canStart, canViewGroupLocations: true, canManageTrip: false, cannotRecordReason: canStart ? null : 'Hãy tải lại dữ liệu và quyền tuyến khi có mạng.' },
  } : null;
  const activePlan = plans.find(p => p.trailPlanId === effective?.snapshot.activeTrailPlanId) ?? plans[0];
  const routeJson = JSON.stringify(!routeAccess ? [] : activePlan?.geometry?.type === 'LineString' ? [activePlan.geometry.coordinates] : activePlan?.geometry?.coordinates ?? []);
  const plannedRouteSegments = useMemo<[number, number][][]>(() => JSON.parse(routeJson), [routeJson]);
  const plannedRouteCoords = useMemo(() => plannedRouteSegments.flat(), [plannedRouteSegments]);
  const displayPoints = useMemo(() => (local ? samples : []).map(p => {
    if (!isMapMatchingEnabled || plannedRouteCoords.length < 2) return p;
    const snap = plannedRouteSegments.filter(part => part.length >= 2).map(part => snapToRoute(p, part, local?.policy.deviationThresholdM ?? 35)).sort((a, b) => a.distanceToRouteM - b.distanceToRouteM)[0];
    return snap?.snapped ? { ...p, latitude: snap.latitude, longitude: snap.longitude } : p;
  }), [samples, plannedRouteSegments, plannedRouteCoords.length, isMapMatchingEnabled, local]);
  const groupPolicy = effective?.snapshot.policy;
  const members = useMemo(() => (group?.members ?? []).map(m => {
    const adapted = adaptMember(m), age = clock - Date.parse(m.location?.recordedAt ?? '');
    const policy = groupPolicy;
    if (m.location && policy && age > policy.offlineAfterSeconds * 1000) adapted.locationStatus = 'OFFLINE';
    else if (m.location && policy && age > policy.staleAfterSeconds * 1000) adapted.locationStatus = 'STALE';
    return adapted;
  }), [group, clock, groupPolicy]);
  const gpsState: GpsStateResponse | null = group && group.tripId === tripId && account ? { tripId: group.tripId, tripStatus: 'OPEN', selfUserId: account, serverTime: group.serverTime, rosterVersion: 0, routeVersion: 0, members } : null;
  const session = local?.session ?? null, currentLocation = displayPoints.at(-1) ?? null;
  const localDistance = useMemo(() => local ? getLocalTripDistance(samples, local.session.recordingIntervals, local.policy.signalGapSeconds) : 0, [samples, local]);
  const intervals = session?.recordingIntervals ?? [], elapsed = Math.floor(intervals.reduce((n, i) => n + Math.max(0, (i.end ? Date.parse(i.end) : clock) - Date.parse(i.start)), 0) / 1000);
  const stats = { recordingTime: [Math.floor(elapsed / 3600), Math.floor(elapsed / 60) % 60, elapsed % 60].map(v => String(v).padStart(2, '0')).join(':'), distanceKm: (localDistance / 1000).toFixed(2), speedKmh: ((currentLocation?.speedMps ?? 0) * 3.6).toFixed(1), altitudeM: currentLocation?.altitudeM != null ? Math.round(currentLocation.altitudeM) : '--', accuracyM: currentLocation?.accuracyM ?? 0 };
  const liveRouteSegments = splitLocalTripRoute(displayPoints, session?.recordingIntervals, local?.policy.signalGapSeconds);
  const summaryRouteSegments = splitLocalTripRoute(local ? samples : [], session?.recordingIntervals, local?.policy.signalGapSeconds);
  return {
    context, gpsState, session, policy: local?.policy ?? effective?.snapshot.policy ?? null,
    myMemberState: members.find(m => m.userId === account) ?? null, otherMembers: members.filter(m => m.userId !== account),
    plannedRouteCoords, liveRouteCoords: displayPoints.map(p => [p.longitude, p.latitude] as [number, number]), summaryRouteCoords: (local ? samples : []).map(p => [p.longitude, p.latitude] as [number, number]), currentLocation,
    plannedRouteSegments, liveRouteSegments, summaryRouteSegments,
    checkpoints: context?.checkpoints ?? [], arrivedCheckpointIds: [] as string[], nextCheckpoint: context?.checkpoints[0] ?? null,
    deviation: { isDeviated: false, status: 'UNKNOWN', distanceM: null }, stats, actualRoute: null as ActualRouteResponse | null,
    loading: loading || busy, syncing: local?.syncStatus === 'SYNCING', syncStatus: local?.syncStatus ?? 'PENDING',
    syncNow: () => tripGpsRuntime.sync(true), rejectedSampleCount: local?.result?.rejectedSamples.length ?? 0, isV3: true,
    error: error ?? local?.lastError ?? null, groupError, socketConnected, isSimulated: true,
    isMapMatchingEnabled, toggleMapMatching: (value?: boolean) => setIsMapMatchingEnabled(old => value ?? !old),
    startRecording, pauseRecording: () => control('PAUSE'), resumeRecording: () => control('RESUME'), finishRecording: () => control('FINISH'),
    refreshState: async () => { await loadLocal(); await refreshRef.current(); },
    prepareOffline, downloading, packageReady: !!cached, packageExpiry: cached?.data.grant.claims.offlineAccessUntil,
    otherSession: otherSession?.accountId === account ? otherSession : null, legacyCount,
  };
}
