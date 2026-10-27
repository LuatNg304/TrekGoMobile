const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

function load(file, deps = {}, globals = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: id => id in deps ? deps[id] : require(id), console, Uint8Array, Date, setTimeout, clearTimeout, ...globals });
  return module.exports;
}
const hash = load('trip-gps.hash.ts');
const offline = load('trip-gps.offline.ts', { './trip-gps.hash': hash });
const fixture = require('../../../../docs/capnhatgpstrongtripv3/hash-fixture.json');
const now = Date.now();
const limits = { maxBatchSamples: 200, maxSnapshotSamples: 100000, maxManifestPages: 100, maxManifestEntriesPerPage: 100, maxBodyBytes: 98304, publishMinIntervalSeconds: 5 };
function signedPackage(account = 'a', tripId = 't', geometry = { type: 'LineString', coordinates: [[106, 10], [106.001, 10]] }) {
  const pair = crypto.generateKeyPairSync('ed25519');
  const key = { kid: crypto.randomUUID(), alg: 'Ed25519', publicKeyPem: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString() };
  const snapshot = {
    protocolVersion: 3, tripId, title: 'Trip offline', tripVersion: 1, startAt: new Date(now - 10000).toISOString(), endAt: new Date(now + 3600000).toISOString(),
    routePlans: [{ trailPlanId: 'plan', source: 'SYSTEM', sourceTrailId: 'trail', sequence: 1, name: 'Route', sourceUpdatedAt: null, geometryHash: hash.gpsHash(geometry), geometryUrl: 'ignored' }],
    activeTrailPlanId: 'plan', checkpoints: [], policy: { id: 'policy', versionNo: 1, maxBatchSamples: 200, signalGapSeconds: 15, maxAcceptedAccuracyM: 50, maxFutureSkewSeconds: 30, sampleIntervalSeconds: 1, offlineAccessGraceSeconds: 172800 }, policyVersion: 1, limits,
  };
  const claims = { protocolVersion: 3, grantId: crypto.randomUUID(), accountId: account, tripId, packageId: crypto.randomUUID(), packageHash: hash.gpsHash(snapshot), scope: ['route:read', 'recording:upload'], issuedAt: new Date(now - 1000).toISOString(), offlineAccessFrom: new Date(now - 1000).toISOString(), offlineAccessUntil: new Date(now + 7200000).toISOString(), kid: key.kid, alg: 'Ed25519' };
  return { key, geometry, data: { packageId: claims.packageId, packageVersion: claims.packageHash, packageHash: claims.packageHash, snapshot, grant: { claims, signature: crypto.sign(null, Buffer.from(hash.canonicalGpsJson(claims)), pair.privateKey).toString('base64url') }, serverTime: new Date(now).toISOString(), groupSharingFrom: snapshot.startAt, groupSharingUntil: snapshot.endAt, capabilities: { supportedSyncProtocols: [3], localRecordingOnly: true } } };
}
function harness() {
  const native = new DatabaseSync(':memory:');
  let failWrite = false, requests = [], current = signedPackage();
  const db = {
    async execAsync(sql) { native.exec(sql); },
    async getFirstAsync(sql, ...args) { return native.prepare(sql).get(...args); },
    async getAllAsync(sql, ...args) { return native.prepare(sql).all(...args); },
    async runAsync(sql, ...args) { if (failWrite && /INSERT INTO trip_gps_recordings/.test(sql)) throw new Error('disk full'); return native.prepare(sql).run(...args); },
    async withExclusiveTransactionAsync(fn) { native.exec('BEGIN'); try { const result = await fn(db); native.exec('COMMIT'); return result; } catch (e) { native.exec('ROLLBACK'); throw e; } },
  };
  const store = load('trip-gps.local.ts', {
    '@/services/storage/recordingDatabase': { getDatabase: async () => db, generateUUID: crypto.randomUUID },
    './trip-gps.storage': { getOrCreateDeviceId: async () => 'device' }, './trip-gps.hash': hash, './trip-gps.offline': offline,
    './trip-gps.client': {
      fetchPackage: async (account, trip) => { requests.push('package'); return current.data; },
      fetchKeys: async () => { requests.push('keys'); return { keys: [current.key] }; },
      gpsBase: trip => `/geo/trips/${trip}/gps`,
      gpsRequest: async (_account, endpoint) => { requests.push(endpoint); return { hash: hash.gpsHash(current.geometry), geometry: current.geometry }; },
    },
  });
  return { store, native, requests, setPackage: value => { current = value; }, failWrites: value => { failWrite = value; } };
}

test('canonical hashing matches all backend fixture values', () => {
  assert.equal(hash.canonicalGpsJson(fixture.batch.samples), fixture.canonicalSamples);
  assert.equal(hash.gpsHash(fixture.batch.samples), fixture.batch.payloadHash);
  assert.equal(hash.gpsHash(fixture.manifest.entries), fixture.manifestHash);
  assert.equal(hash.gpsHash([]), fixture.emptyManifestHash);
});
test('native-compatible Ed25519 verification rejects tamper, wrong owner, missing key and expiry', () => {
  const { data, key } = signedPackage();
  offline.verifyPackage(data, 'a', 't', [key], now);
  assert.throws(() => offline.verifyPackage(data, 'b', 't', [key], now));
  assert.throws(() => offline.verifyPackage(data, 'a', 't', [], now));
  assert.throws(() => offline.verifyPackage(data, 'a', 't', [key], now + 86400000));
  const changed = structuredClone(data); changed.snapshot.title = 'tampered';
  assert.throws(() => offline.verifyPackage(changed, 'a', 't', [key], now));
  const signature = structuredClone(data); signature.grant.claims.scope.push('tampered');
  assert.throws(() => offline.verifyPackage(signature, 'a', 't', [key], now));
});
test('SQLite offline lifecycle never calls network; finish is atomic, old stopped sessions do not block new ones', async () => {
  const h = harness(), s = h.store;
  await assert.rejects(s.createLocalTrip('a', 't'), /Chưa tải/);
  await s.downloadPackage('a', 't');
  const networkBefore = h.requests.length;
  const trip = await s.createLocalTrip('a', 't');
  const point = { clientSampleId: crypto.randomUUID(), recordedAt: trip.session.startedAt, latitude: 10, longitude: 106, accuracyM: 999 };
  assert.equal(await s.appendSample('a', trip.session.id, point), true);
  assert.equal(await s.appendSample('a', trip.session.id, point), false);
  await assert.rejects(s.createLocalTrip('a', 't'), /chưa kết thúc/);
  await s.commitControl('a', trip.session.id, 'PAUSE');
  assert.equal(await s.appendSample('a', trip.session.id, { ...point, clientSampleId: crypto.randomUUID() }), false);
  const resumed = await s.commitControl('a', trip.session.id, 'RESUME');
  assert.ok(Date.parse(resumed.session.recordingIntervals[1].start) > Date.parse(resumed.session.recordingIntervals[0].end));
  h.failWrites(true);
  await assert.rejects(s.commitControl('a', trip.session.id, 'FINISH'), /disk full/);
  assert.equal((await s.readLocalTrip('a', trip.session.id)).session.status, 'ACTIVE');
  h.failWrites(false);
  const finished = await s.commitControl('a', trip.session.id, 'FINISH');
  assert.equal(finished.session.status, 'STOPPED');
  assert.equal(finished.snapshot.metadata.expectedSampleCount, 1);
  assert.equal(finished.snapshot.batches[0].samples[0].accuracyM, 999, 'keep raw accuracy for backend classification');
  assert.equal(await s.appendSample('a', trip.session.id, { ...point, clientSampleId: crypto.randomUUID() }), false);
  assert.equal((await s.createLocalTrip('a', 't')).session.status, 'ACTIVE');
  assert.equal(h.requests.length, networkBefore, 'all recording controls must be offline');
  assert.equal((await s.listLocalTrips('b')).length, 0);
  h.native.close();
});
test('shared blobs reused across trips and pinned by recordings when package is deleted', async () => {
  const h = harness(), s = h.store;
  await s.downloadPackage('a', 't');
  h.setPackage(signedPackage('a', 't2'));
  await s.downloadPackage('a', 't2');
  assert.equal(h.requests.filter(r => r.includes('/geometries/')).length, 1);
  const trip = await s.createLocalTrip('a', 't');
  await s.commitControl('a', trip.session.id, 'FINISH');
  await s.deletePackage('a', 't'); await s.deletePackage('a', 't2');
  assert.equal((await s.listPackages('a')).length, 0);
  assert.equal(h.native.prepare('SELECT count(*) as n FROM trip_gps_geometry_blobs').get().n, 1);
  assert.equal((await s.packageRoutes(trip.package)).length, 1);
  h.native.close();
});
test('empty recording and batch/page limits produce immutable valid snapshots', async () => {
  const h = harness(), s = h.store;
  await s.downloadPackage('a', 't'); const trip = await s.createLocalTrip('a', 't');
  const stopped = await s.commitControl('a', trip.session.id, 'FINISH');
  assert.equal(stopped.snapshot.metadata.manifestHash, fixture.emptyManifestHash);
  assert.equal(stopped.snapshot.batches.length, 0); assert.equal(stopped.snapshot.manifests.length, 0);
  const many = Array.from({ length: 401 }, (_, i) => ({ ...fixture.batch.samples[0], sequence: i + 1, clientSampleId: crypto.randomUUID() }));
  const snapshot = s.buildSnapshot(stopped, many);
  assert.deepEqual(Array.from(snapshot.batches, b => b.samples.length), [200, 200, 1]);
  assert.equal(hash.gpsHash(snapshot.manifests.flatMap(p => p.entries)), snapshot.metadata.manifestHash);
  h.native.close();
});

class ApiError extends Error { constructor(message, status, code, details, retryable) { super(message); Object.assign(this, { status, code, details, retryable }); } }
test('uploader is STOPPED-only, resumes after lost ACK, validates receipt/result and never overwrites local raw', async () => {
  const h = harness(), s = h.store;
  await s.downloadPackage('a', 't'); const opened = await s.createLocalTrip('a', 't');
  const calls = [], server = { parts: new Map(), status: 'RECEIVING', registered: false, lostBatchAck: true };
  let receipt, expected;
  const timers = [];
  const client = {
    gpsBase: id => `/geo/trips/${id}/gps`,
    gpsRequest: async (_account, endpoint, body, method) => {
      calls.push(endpoint);
      if (endpoint.includes('/by-client/')) { if (!server.registered) throw new ApiError('missing', 404); return receipt; }
      if (endpoint.endsWith('/completed-recordings')) { expected = body; server.registered = true; receipt = { protocolVersion: 3, localSessionId: opened.session.id, recordingId: 'server-id', metadataHash: hash.gpsHash({ tripId: 't', ...body }), status: 'RECEIVING', limits }; return receipt; }
      if (endpoint.endsWith('/manifests')) { server.manifest = body; return { acknowledged: true, kind: 'manifest', key: String(body.pageIndex) }; }
      if (endpoint.endsWith('/batches')) {
        server.parts.set(body.batchId, body);
        if (server.lostBatchAck) { server.lostBatchAck = false; throw new ApiError('lost ACK', 0); }
        return { acknowledged: true, kind: 'batch', key: body.batchId };
      }
      if (endpoint.endsWith('/complete')) { assert.equal(body, undefined); assert.equal(method, 'POST'); server.status = 'COMPLETE'; return { ...receipt, status: server.status }; }
      throw new Error(endpoint);
    },
    getRecordingStatus: async () => ({ ...receipt, status: server.status, nextCursor: null, manifestError: server.manifest ? null : 'MISSING', missingBatchIds: (server.manifest?.entries ?? []).map(e => e.batchId).filter(id => !server.parts.has(id)) }),
    getRecordingResult: async () => ({ ...receipt, status: 'COMPLETE', result: { rawSampleCount: 1, pointCount: 1, totalDistanceMeters: 0, rejectedSamples: [], recognitionStatus: 'NEEDS_REVIEW' } }),
  };
  const Uploader = load('trip-gps.upload.ts', { '@/lib/api-client': { ApiError }, './trip-gps.client': client, './trip-gps.local': s }, { setTimeout: fn => { timers.push(fn); return 0; }, clearTimeout: () => {} }).TripGpsUploader;
  const worker = new Uploader('a', () => true, () => {});
  await worker.sync(); assert.equal(calls.length, 0);
  await s.appendSample('a', opened.session.id, { ...fixture.batch.samples[0], recordedAt: opened.session.startedAt });
  await s.commitControl('a', opened.session.id, 'FINISH');
  await worker.sync(); assert.equal((await s.readLocalTrip('a', opened.session.id)).syncStatus, 'WAITING_NETWORK');
  await worker.sync(true);
  const done = await s.readLocalTrip('a', opened.session.id);
  assert.equal(done.syncStatus, 'SYNCED'); assert.equal(server.parts.size, 1); assert.equal(expected.recordingStatus, 'STOPPED');
  assert.equal((await s.localSamples('a', opened.session.id)).length, 1);
  assert.equal(calls.filter(p => p.endsWith('/completed-recordings')).length, 1);
  worker.stop(); h.native.close();
});

test('account changes cannot replay GPS request or refresh with another account', async () => {
  let auth = { user: { id: 'a' }, accessToken: 'token-a' }, fetches = 0, refreshes = 0;
  const client = load('trip-gps.client.ts', {
    '@/lib/api-client': { API_BASE_URL: 'http://test', ApiError, refreshSessionOnce: async () => { refreshes++; return auth; } },
    '@/features/auth/storage': { readStoredAuth: async () => auth },
  }, { AbortController, fetch: async () => { fetches++; auth = { user: { id: 'b' }, accessToken: 'token-b' }; return { status: 401 }; } });
  await assert.rejects(client.gpsRequest('a', '/geo/example'), e => e.code === 'GPS_ACCOUNT_CHANGED');
  assert.equal(fetches, 1); assert.equal(refreshes, 0);
});

test('runtime keeps fake recording across screen exit, publishes v3 without session and never resurrects a suspended collector', async () => {
  const h = harness(), s = h.store;
  await s.downloadPackage('a', 't'); const trip = await s.createLocalTrip('a', 't');
  let callback, samplesListener, creates = 0, published = [], releaseRead, deferRead = false;
  class Simulator {
    constructor() { creates++; }
    setProgress() {} start(fn) { callback = fn; } resume() {} pause() {} stop() { callback = null; }
  }
  class Socket {
    connect(_token, _trip, cb, options) { assert.equal(options.protocolVersion, 3); this.connected = true; cb.onConnect?.(); }
    setViewing() {} disconnect() { this.connected = false; } isConnected() { return this.connected; }
    async publish(payload) { published.push(payload); return { acknowledged: true }; }
  }
  const Runtime = load('trip-gps.runtime.ts', {
    '@/services/location/tripGpsSimulator': { TripGpsSimulator: Simulator },
    '@/services/storage/recordingDatabase': { generateUUID: crypto.randomUUID },
    '@/features/auth/storage': { readStoredAuth: async () => ({ user: { id: 'a' } }) },
    './trip-gps.socket': { TripGpsSocketService: Socket }, './trip-gps.upload': { TripGpsUploader: class { stop() {} async sync() {} } },
    './trip-gps.local': { ...s, listLocalTrips: async (...args) => { if (deferRead) { deferRead = false; await new Promise(r => { releaseRead = r; }); } return s.listLocalTrips(...args); } },
    './trip-gps.collector': {
      setCollectorListeners: fn => { samplesListener = fn; }, stopTripCollector: async () => {},
      ingestLocations: async (account, id, locations) => {
        const location = locations[0]; const point = { clientSampleId: crypto.randomUUID(), recordedAt: new Date(location.timestamp).toISOString(), latitude: location.coords.latitude, longitude: location.coords.longitude, accuracyM: 5 };
        await s.appendSample(account, id, point); samplesListener(await s.readLocalTrip(account, id), point);
      },
    },
    './trip-gps.result': { getLocalTripDistance: () => 0 },
  }).TripGpsRuntime;
  const runtime = new Runtime(); await runtime.authenticate('a', 'token');
  const off = runtime.watch(trip.package); off(); await runtime.reconcileCollector();
  assert.equal(creates, 1, 'navigation must not recreate/reset the fake collector');
  callback({ timestamp: Date.now(), coords: { latitude: 10, longitude: 106 } });
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
  assert.equal(published.length, 1);
  assert.equal(published[0].protocolVersion, 3); assert.equal(published[0].source, 'SIMULATOR');
  assert.equal('sessionId' in published[0], false);
  callback({ timestamp: Date.now(), coords: { latitude: 11, longitude: 107 } }, 1);
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
  const moved = await s.readLocalTrip('a', trip.session.id);
  assert.equal(moved.simulatorSegment, 1);
  assert.equal(moved.session.recordingIntervals.length, 2);
  assert.ok(Date.parse(moved.session.recordingIntervals[0].end) < Date.parse(moved.session.recordingIntervals[1].start));
  deferRead = true; const pending = runtime.reconcileCollector();
  while (!releaseRead) await new Promise(r => setImmediate(r));
  await runtime.suspendCollector(); releaseRead(); await pending;
  assert.equal(callback, null, 'a stale reconcile must not restart after suspension');
  await s.commitControl('a', trip.session.id, 'FINISH'); await runtime.reconcileCollector();
  assert.equal(callback, null);
  await runtime.authenticate(null, null); h.native.close();
});

test('MultiLine fake GPS skips disconnected space and local map preserves pause/signal gaps', () => {
  const processor = load('../../../utils/gpsProcessor.ts');
  let time = Date.now(), tick;
  class Clock extends Date { static now() { return time; } }
  const Simulator = load('../../../services/location/tripGpsSimulator.ts', { '@/utils/gpsProcessor': processor }, { Date: Clock, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => {} }).TripGpsSimulator;
  const sim = new Simulator({ routeCoords: [], routeSegments: [[[106, 10], [106.00001, 10]], [[107, 11], [107.0001, 11]]], intervalMs: 1000, speedMps: 3 });
  const points = [];
  sim.start((point, segment) => points.push({ point, segment }));
  time += 1000; tick();
  assert.equal(points[0].segment, 0); assert.equal(points[1].segment, 1);
  assert.ok(points[1].point.coords.longitude >= 107, 'never interpolate a position between disconnected parts');
  const result = load('trip-gps.result.ts', { '@/utils/gpsProcessor': processor });
  const iso = t => new Date(time + t).toISOString();
  const samples = [0, 1000, 3000, 4000, 60000].map((t, i) => ({ ...fixture.batch.samples[0], recordedAt: iso(t), longitude: 106 + i * 0.00001 }));
  const intervals = [{ start: iso(0), end: iso(1000) }, { start: iso(3000), end: iso(61000) }];
  const segments = result.splitLocalTripRoute(samples, intervals, 15);
  assert.deepEqual(Array.from(segments, s => s.length), [2, 2, 1]);
  assert.ok(result.getLocalTripDistance(samples, intervals, 15) < 3, 'do not count pause or signal gap as travelled distance');
  sim.stop();
});
