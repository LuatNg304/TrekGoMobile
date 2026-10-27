import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, generateUUID } from '@/services/storage/recordingDatabase';
import { getOrCreateDeviceId } from './trip-gps.storage';
import { gpsHash, canonicalGpsJson } from './trip-gps.hash';
import { utf8, verifyPackage } from './trip-gps.offline';
import { fetchPackage, fetchKeys, gpsRequest, gpsBase } from './trip-gps.client';
import type { CachedPackage, PublicKey, OfflinePackage, LocalTrip, UploadSnapshot, Batch, Manifest, RecordedSample } from '../contract';
import type { GpsSample, PlannedRouteDto } from '../types';

let initialized: Promise<void> | undefined;
let serial: Promise<unknown> = Promise.resolve();
export function initLocalGps() {
  return initialized ??= (async () => {
    const db = await getDatabase();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trip_gps_packages (account_id TEXT NOT NULL,trip_id TEXT NOT NULL,data_json TEXT NOT NULL,PRIMARY KEY(account_id,trip_id));
      CREATE TABLE IF NOT EXISTS trip_gps_geometry_blobs (hash TEXT PRIMARY KEY,data_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS trip_gps_verification_keys (kid TEXT PRIMARY KEY,data_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS trip_gps_recordings (account_id TEXT NOT NULL,id TEXT NOT NULL,trip_id TEXT NOT NULL,started_at TEXT NOT NULL,data_json TEXT NOT NULL,PRIMARY KEY(account_id,id));
      CREATE INDEX IF NOT EXISTS trip_gps_recordings_trip ON trip_gps_recordings(account_id,trip_id,started_at);
      CREATE TABLE IF NOT EXISTS trip_gps_recorded_samples (account_id TEXT NOT NULL,recording_id TEXT NOT NULL,sample_id TEXT NOT NULL,sequence INTEGER NOT NULL,data_json TEXT NOT NULL,PRIMARY KEY(account_id,recording_id,sample_id),UNIQUE(account_id,recording_id,sequence));
    `);
  })().catch(e => { initialized = undefined; throw e; });
}
function exclusive<T>(run: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  const result = serial.then(async () => {
    await initLocalGps(); const db = await getDatabase(); let value!: T;
    await db.withExclusiveTransactionAsync(async tx => { value = await run(tx as SQLiteDatabase); });
    return value;
  });
  serial = result.catch(() => {}); return result;
}
async function keys(db: SQLiteDatabase): Promise<PublicKey[]> {
  return (await db.getAllAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_verification_keys')).map(r => JSON.parse(r.data_json));
}
async function read(db: SQLiteDatabase, account: string, id: string): Promise<LocalTrip> {
  const row = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_recordings WHERE account_id=? AND id=?', account, id);
  if (!row) throw new Error('Không tìm thấy phiên GPS trên máy.'); return JSON.parse(row.data_json);
}
async function write(db: SQLiteDatabase, trip: LocalTrip) {
  await db.runAsync(`INSERT INTO trip_gps_recordings(account_id,id,trip_id,started_at,data_json) VALUES(?,?,?,?,?)
    ON CONFLICT(account_id,id) DO UPDATE SET data_json=excluded.data_json`, trip.accountId, trip.session.id, trip.session.tripId, trip.session.startedAt, JSON.stringify(trip));
}
export async function listLocalTrips(account: string, tripId?: string): Promise<LocalTrip[]> {
  await initLocalGps(); const db = await getDatabase();
  return (await db.getAllAsync<{ data_json: string }>(`SELECT data_json FROM trip_gps_recordings WHERE account_id=? ${tripId ? 'AND trip_id=?' : ''} ORDER BY started_at DESC`, ...(tripId ? [account, tripId] : [account]))).map(r => JSON.parse(r.data_json));
}
export const readLocalTrip = (account: string, id: string) => exclusive(db => read(db, account, id));
export function changeLocalTrip(account: string, id: string, update: (trip: LocalTrip) => void) {
  return exclusive(async db => { const trip = await read(db, account, id); update(trip); await write(db, trip); return trip; });
}
export async function listPackages(account: string): Promise<CachedPackage[]> {
  await initLocalGps(); const db = await getDatabase();
  return (await db.getAllAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_packages WHERE account_id=?', account)).map(r => JSON.parse(r.data_json));
}
export async function getPackage(account: string, tripId: string): Promise<CachedPackage | null> {
  return (await listPackages(account)).find(p => p.tripId === tripId) ?? null;
}
export async function packageRoutes(data: OfflinePackage): Promise<PlannedRouteDto[]> {
  await initLocalGps(); const db = await getDatabase(); const plans: PlannedRouteDto[] = [];
  for (const plan of data.snapshot.routePlans) {
    let geometry = null;
    if (plan.geometryHash) {
      const row = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_geometry_blobs WHERE hash=?', plan.geometryHash);
      if (!row) throw new Error('Thiếu tọa độ tuyến trên máy. Hãy tải dữ liệu chuyến trước khi ghi.');
      geometry = JSON.parse(row.data_json);
      if (gpsHash(geometry) !== plan.geometryHash) throw new Error('Tọa độ tuyến bị hỏng checksum. Hãy tải lại.');
    }
    plans.push({ ...plan, geometry });
  }
  return plans;
}
export async function readablePackageRoutes(cached: CachedPackage): Promise<PlannedRouteDto[]> {
  if (['REVOKED', 'INVALID', 'EXPIRED', 'REVIEW_REQUIRED'].includes(cached.grantStatus ?? '')) return [];
  await initLocalGps();
  try { verifyPackage(cached.data, cached.accountId, cached.tripId, await keys(await getDatabase()), Date.now()); }
  catch { return []; }
  return packageRoutes(cached.data);
}
const downloads = new Map<string, Promise<CachedPackage>>();
export function downloadPackage(account: string, tripId: string): Promise<CachedPackage> {
  const key = `${account}:${tripId}`; const old = downloads.get(key); if (old) return old;
  const work = (async () => {
    const [data, publicKeys] = await Promise.all([fetchPackage(account, tripId), fetchKeys(account)]);
    verifyPackage(data, account, tripId, publicKeys.keys, Date.now());
    await initLocalGps(); const db = await getDatabase();
    const blobs: { hash: string; geometry: unknown }[] = [];
    for (const plan of data.snapshot.routePlans) {
      if (!plan.geometryHash || blobs.some(b => b.hash === plan.geometryHash)) continue;
      const row = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_geometry_blobs WHERE hash=?', plan.geometryHash);
      let cached: unknown;
      try { cached = row ? JSON.parse(row.data_json) : null; } catch { cached = null; }
      if (cached && gpsHash(cached) === plan.geometryHash) continue;
      // Build from the authenticated trip/hash, never trust a server-supplied arbitrary URL.
      const blob = await gpsRequest<{ hash: string; geometry: unknown }>(account, `${gpsBase(tripId)}/geometries/${plan.geometryHash}`);
      if (blob.hash !== plan.geometryHash || gpsHash(blob.geometry) !== plan.geometryHash) throw new Error('Checksum tọa độ tải về không khớp.');
      blobs.push(blob);
    }
    const cached: CachedPackage = { accountId: account, tripId, data, downloadedAt: new Date().toISOString(), grantStatus: 'VALID' };
    await exclusive(async tx => {
      for (const k of publicKeys.keys) {
        const old = await tx.getFirstAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_verification_keys WHERE kid=?', k.kid);
        if (old && JSON.parse(old.data_json).publicKeyPem.trim() !== k.publicKeyPem.trim()) throw new Error('Khóa ký GPS đã thay đổi nhưng giữ nguyên kid. Cần backend kiểm tra cấu hình khóa.');
        await tx.runAsync('INSERT OR IGNORE INTO trip_gps_verification_keys(kid,data_json) VALUES(?,?)', k.kid, JSON.stringify(k));
      }
      for (const blob of blobs) await tx.runAsync('INSERT OR REPLACE INTO trip_gps_geometry_blobs(hash,data_json) VALUES(?,?)', blob.hash, JSON.stringify(blob.geometry));
      await tx.runAsync('INSERT OR REPLACE INTO trip_gps_packages(account_id,trip_id,data_json) VALUES(?,?,?)', account, tripId, JSON.stringify(cached));
    });
    return cached;
  })();
  downloads.set(key, work); void work.finally(() => { if (downloads.get(key) === work) downloads.delete(key); }).catch(() => {}); return work;
}
export async function checkPackageGrants(account: string) {
  const packages = await listPackages(account);
  for (let i = 0; i < packages.length; i += 100) {
    const grantIds = packages.slice(i, i + 100).map(p => p.data.grant.claims.grantId);
    const response = await gpsRequest<{ grants: { grantId: string; status: CachedPackage['grantStatus']; refreshRequired?: boolean }[] }>(account, '/geo/gps/offline-grants/check', { grantIds });
    await exclusive(async db => {
      for (const update of response.grants) {
        const current = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_packages WHERE account_id=? AND trip_id=?', account, packages.find(p => p.data.grant.claims.grantId === update.grantId)?.tripId ?? '');
        if (!current) continue; const p: CachedPackage = JSON.parse(current.data_json);
        if (p.data.grant.claims.grantId !== update.grantId) continue;
        p.grantStatus = update.status; p.refreshRequired = update.refreshRequired;
        await db.runAsync('UPDATE trip_gps_packages SET data_json=? WHERE account_id=? AND trip_id=?', JSON.stringify(p), account, p.tripId);
      }
    });
  }
}
export function deletePackage(account: string, tripId: string) {
  return exclusive(async db => {
    await db.runAsync('DELETE FROM trip_gps_packages WHERE account_id=? AND trip_id=?', account, tripId);
    // Recording snapshots retain their referenced geometry, including unsynced history.
    const refs = new Set<string>();
    for (const table of ['trip_gps_packages', 'trip_gps_recordings']) {
      for (const row of await db.getAllAsync<{ data_json: string }>(`SELECT data_json FROM ${table}`)) {
        const item = JSON.parse(row.data_json); const data: OfflinePackage = table === 'trip_gps_packages' ? item.data : item.package;
        for (const plan of data.snapshot.routePlans) if (plan.geometryHash) refs.add(plan.geometryHash);
      }
    }
    for (const row of await db.getAllAsync<{ hash: string }>('SELECT hash FROM trip_gps_geometry_blobs')) if (!refs.has(row.hash)) await db.runAsync('DELETE FROM trip_gps_geometry_blobs WHERE hash=?', row.hash);
  });
}
export async function createLocalTrip(account: string, tripId: string): Promise<LocalTrip> {
  const cached = await getPackage(account, tripId);
  if (!cached) throw new Error('Chưa tải tuyến chuyến đi. Hãy tải dữ liệu trước khi ghi GPS.');
  if (['REVOKED', 'INVALID', 'EXPIRED', 'REVIEW_REQUIRED'].includes(cached.grantStatus ?? '')) throw new Error('Quyền tuyến cần kiểm tra lại. Hãy tải lại dữ liệu khi có mạng.');
  const routes = await packageRoutes(cached.data);
  const plan = routes.find(p => p.trailPlanId === cached.data.snapshot.activeTrailPlanId) ?? routes[0];
  const segments = plan?.geometry?.type === 'MultiLineString' ? plan.geometry.coordinates : [plan?.geometry?.coordinates ?? []];
  if (!segments.some(part => part.length >= 2)) throw new Error('Tuyến chưa đủ điểm để chạy fake GPS. Hãy kiểm tra tuyến chuyến đi.');
  const deviceId = await getOrCreateDeviceId(true);
  return exclusive(async db => {
    verifyPackage(cached.data, account, tripId, await keys(db), Date.now());
    const all = await db.getAllAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_recordings WHERE account_id=?', account);
    const opened = all.map(r => JSON.parse(r.data_json) as LocalTrip).find(t => t.session.status !== 'STOPPED');
    if (opened) throw new Error(`Bạn còn phiên GPS chưa kết thúc ở chuyến “${opened.package.snapshot.title}”. Hãy mở phiên đó để kết thúc trước.`);
    const now = new Date().toISOString(), id = generateUUID(), data = cached.data;
    const trip: LocalTrip = {
      protocolVersion: 3, accountId: account, package: data, policy: data.snapshot.policy, source: 'SIMULATOR', limits: data.snapshot.limits,
      session: { id, clientSessionId: id, tripId, userId: account, deviceId, gpsPolicyId: data.snapshot.policy.id, status: 'ACTIVE', version: 1, startedAt: now, endedAt: null, uploadDeadline: null, sampleCount: 0, totalDistanceMeters: null, recordingIntervals: [{ start: now, end: null }] },
      sampleSequence: 0, syncStatus: 'PENDING', lastError: null, retryCount: 0, nextRetryAt: null,
    };
    await write(db, trip); return trip;
  });
}
export function appendSample(account: string, id: string, sample: GpsSample): Promise<boolean> {
  return exclusive(async db => {
    const trip = await read(db, account, id);
    if (trip.session.status !== 'ACTIVE') return false;
    const time = Date.parse(sample.recordedAt);
    if (!trip.session.recordingIntervals?.some(i => time >= Date.parse(i.start) && (!i.end || time <= Date.parse(i.end)))) return false;
    if (trip.sampleSequence >= trip.limits.maxSnapshotSamples) throw new Error('Đã đạt giới hạn điểm của một phiên. Hãy kết thúc ghi.');
    const point = { ...sample, sequence: trip.sampleSequence + 1 };
    const result = await db.runAsync('INSERT OR IGNORE INTO trip_gps_recorded_samples(account_id,recording_id,sample_id,sequence,data_json) VALUES(?,?,?,?,?)', account, id, sample.clientSampleId, point.sequence, JSON.stringify(point));
    if (!result.changes) return false;
    trip.sampleSequence++; trip.session.sampleCount = trip.sampleSequence; await write(db, trip); return true;
  });
}
async function samplesFrom(db: SQLiteDatabase, account: string, id: string): Promise<RecordedSample[]> {
  return (await db.getAllAsync<{ data_json: string }>('SELECT data_json FROM trip_gps_recorded_samples WHERE account_id=? AND recording_id=? ORDER BY sequence', account, id)).map(r => JSON.parse(r.data_json));
}
export async function localSamples(account: string, id: string) { await initLocalGps(); return samplesFrom(await getDatabase(), account, id); }
export function buildSnapshot(trip: LocalTrip, samples: RecordedSample[]): UploadSnapshot {
  if (trip.session.status !== 'STOPPED' || !trip.session.endedAt) throw new Error('Chỉ đồng bộ phiên đã kết thúc.');
  const limits = trip.limits, maxBytes = Math.min(98304, limits.maxBodyBytes);
  const fit = (body: unknown) => utf8(canonicalGpsJson(body)).length <= maxBytes;
  const batches: Batch[] = []; let points: RecordedSample[] = [];
  const flush = () => { if (points.length) { batches.push({ batchId: generateUUID(), payloadHash: gpsHash(points), samples: points }); points = []; } };
  for (const p of samples) {
    if (points.length && (points.length >= Math.min(200, limits.maxBatchSamples, trip.policy.maxBatchSamples) || !fit({ batchId: '0'.repeat(36), payloadHash: '0'.repeat(64), samples: [...points, p] }))) flush();
    points.push(p);
  }
  flush();
  if (batches.length > 1000 || samples.length > limits.maxSnapshotSamples) throw new Error('Hành trình vượt giới hạn đồng bộ. Dữ liệu vẫn được giữ trên máy.');
  const entries = batches.map(b => ({ batchId: b.batchId, payloadHash: b.payloadHash, sampleCount: b.samples.length }));
  const perPage = Math.min(100, limits.maxManifestEntriesPerPage), pageCount = Math.ceil(entries.length / perPage);
  if (!perPage || pageCount > Math.min(100, limits.maxManifestPages)) throw new Error('Manifest vượt giới hạn đồng bộ.');
  const manifests: Manifest[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) { const page = entries.slice(pageIndex * perPage, (pageIndex + 1) * perPage); manifests.push({ pageIndex, pageCount, pageHash: gpsHash(page), entries: page }); }
  const metadata = {
    protocolVersion: 3 as const, localSessionId: trip.session.id, deviceId: trip.session.deviceId, recordingStatus: 'STOPPED' as const,
    source: trip.source, grantId: trip.package.grant.claims.grantId, packageId: trip.package.packageId,
    startedAt: trip.session.startedAt, endedAt: trip.session.endedAt,
    intervals: (trip.session.recordingIntervals ?? []).map(i => { if (!i.end) throw new Error('Khoảng ghi chưa đóng.'); return { start: i.start, end: i.end }; }),
    expectedSampleCount: samples.length, manifestHash: gpsHash(entries),
  };
  if (![metadata, ...batches, ...manifests].every(fit)) throw new Error('Dữ liệu vượt kích thước API cho phép.');
  return { metadata, metadataHash: gpsHash({ tripId: trip.session.tripId, ...metadata }), batches, manifests, acknowledgedBatches: [], acknowledgedPages: [] };
}
export function commitControl(account: string, id: string, action: 'PAUSE' | 'RESUME' | 'FINISH') {
  return exclusive(async db => {
    const trip = await read(db, account, id), s = trip.session;
    if (s.status === 'STOPPED' || (action === 'PAUSE' && s.status !== 'ACTIVE') || (action === 'RESUME' && s.status !== 'PAUSED')) return trip;
    const samples = await samplesFrom(db, account, id), intervals = s.recordingIntervals!;
    const lastBoundary = Math.max(...intervals.map(i => Date.parse(i.end ?? i.start)));
    const time = new Date(Math.max(Date.now(), lastBoundary + (action === 'RESUME' ? 1 : 0), Date.parse(samples.at(-1)?.recordedAt ?? s.startedAt))).toISOString();
    if (action === 'RESUME') intervals.push({ start: time, end: null }); else for (const i of intervals) if (!i.end) i.end = time;
    s.status = action === 'RESUME' ? 'ACTIVE' : action === 'PAUSE' ? 'PAUSED' : 'STOPPED'; s.version++;
    if (action === 'FINISH') { s.endedAt = time; trip.snapshot = buildSnapshot(trip, samples); }
    trip.syncStatus = 'PENDING'; trip.lastError = null; trip.retryCount = 0; trip.nextRetryAt = null;
    await write(db, trip); return trip;
  });
}
