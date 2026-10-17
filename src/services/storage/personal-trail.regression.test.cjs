/* Run with: node --test src/services/storage/personal-trail.regression.test.cjs */
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the production SQL against SQLite; only the native bridge and login are replaced.
function load(file, mocks) {
  const filename = path.resolve(__dirname, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const execute = vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename });
  execute((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error(`Unexpected native dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

async function databaseFixture() {
  const sqlite = new DatabaseSync(':memory:');
  // An existing installation without owner_id, including a recoverable and an unknown recording.
  sqlite.exec(`CREATE TABLE local_recordings (
    client_recording_id TEXT PRIMARY KEY, server_recording_id TEXT, status TEXT NOT NULL,
    started_at TEXT NOT NULL, ended_at TEXT, next_segment_id INTEGER NOT NULL DEFAULT 0,
    server_personal_trail_id TEXT, last_synced_at TEXT
  );
  INSERT INTO local_recordings(client_recording_id,status,started_at) VALUES ('unknown','PAUSED','2026-10-17');`);
  const bridge = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, values = []) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql, values = []) => sqlite.prepare(sql).all(...values),
    getFirstAsync: async (sql, values = []) => sqlite.prepare(sql).get(...values) ?? null,
    withTransactionAsync: async (callback) => {
      sqlite.exec('BEGIN');
      try { await callback(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  let auth = { user: { id: 'alice' }, accessToken: 'alice-token' };
  const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  const mocks = {
    '@/features/auth/storage': { readStoredAuth: async () => auth },
    '@react-native-async-storage/async-storage': storage,
    'expo-sqlite': { openDatabaseAsync: async () => bridge },
    './keys': { STORAGE_KEYS: {} },
  };
  const { recordingDatabase: database, getDatabase } = load('./recordingDatabase.ts', mocks);
  await getDatabase();
  return { database, sqlite, mocks, setAuth: (value) => { auth = value; } };
}

const trail = (id, recordingId) => ({
  id, ownerId: 'alice', name: 'Same route', region: 'Test', difficulty: 'Dễ',
  distanceKm: 1, elevationGainM: 20, duration: '1 phút', terrainType: 'Test',
  description: '', visibility: 'PRIVATE', verificationStatus: 'DRAFT', gpsSegments: [],
  checkpoints: [], clientRecordingId: recordingId,
  createdAt: '2026-10-17T00:00:00Z', updatedAt: '2026-10-17T00:00:00Z',
});

test('account switching isolates recording recovery, local trails, and outbox; unknown legacy GPS stays unsent', async () => {
  const { database, sqlite, setAuth } = await databaseFixture();
  try {
    await database.createRecording('alice-recording');
    await database.savePersonalTrail(trail('alice-local', 'alice-recording'));
    await database.enqueueOutbox('alice-recording', 'CREATE_RECORDING', {});
    await database.enqueueOutbox('unknown', 'CREATE_RECORDING', {});
    assert.equal((await database.getPendingOutbox('alice')).length, 1);
    setAuth({ user: { id: 'bob' }, accessToken: 'bob-token' });
    assert.equal(await database.getActiveRecording(), null);
    assert.deepEqual(await database.getAllPersonalTrails(), []);
    assert.deepEqual(await database.getPendingOutbox('bob'), []);
    assert.equal(sqlite.prepare("SELECT owner_id FROM local_recordings WHERE client_recording_id='unknown'").get().owner_id, null);
    setAuth({ user: { id: 'alice' }, accessToken: 'alice-token' });
    assert.equal((await database.getActiveRecording()).clientRecordingId, 'alice-recording');
  } finally { sqlite.close(); }
});

test('same name and distance or absent outbox never proves a draft was synchronized', async () => {
  const { database, sqlite } = await databaseFixture();
  try {
    await database.createRecording('recording');
    await database.savePersonalTrail(trail('draft', 'recording'));
    assert.deepEqual(await database.getSyncedLocalTrailIds(['unrelated-server-id']), []);
    assert.deepEqual(await database.getSyncedLocalTrailIds(['server-id'], ['recording']), ['draft']);
  } finally { sqlite.close(); }
});

test('server cache survives recording cleanup and is isolated by owner', async () => {
  const { database, sqlite } = await databaseFixture();
  try {
    await database.createRecording('recording');
    await database.savePersonalTrail(trail('draft', 'recording'));
    const official = trail('server-id', 'recording');
    await database.cacheServerPersonalTrails('alice', [official]);
    await database.updateRecordingStatus('recording', 'READY', { serverPersonalTrailId: 'server-id' });
    await database.removeSyncedPersonalTrails(await database.getSyncedLocalTrailIds(['server-id'], ['recording']));
    assert.deepEqual(await database.getAllPersonalTrails(), []);
    assert.deepEqual(await database.getCachedServerPersonalTrails('alice'), [official]);
    assert.deepEqual(await database.getCachedServerPersonalTrails('bob'), []);
  } finally { sqlite.close(); }
});

test('cache updates and deletions persist without changing other trails or accounts', async () => {
  const { database, sqlite } = await databaseFixture();
  try {
    const first = trail('first', 'recording-first');
    const second = trail('second', 'recording-second');
    await database.cacheServerPersonalTrails('alice', [first, second]);
    await database.cacheServerPersonalTrails('bob', [first]);
    const updated = { ...first, name: 'Updated trail' };
    await database.updateCachedServerPersonalTrail('alice', updated);
    const cached = await database.getCachedServerPersonalTrails('alice');
    assert.deepEqual(cached.find((item) => item.id === 'first'), updated);
    assert.deepEqual(cached.find((item) => item.id === 'second'), second);
    assert.equal(cached.length, 2);
    await database.removeCachedServerPersonalTrail('alice', 'first');
    assert.deepEqual(await database.getCachedServerPersonalTrails('alice'), [second]);
    await database.removeCachedServerPersonalTrail('alice', 'second');
    assert.deepEqual(await database.getCachedServerPersonalTrails('alice'), []);
    assert.deepEqual(await database.getCachedServerPersonalTrails('bob'), [first]);
    await database.updateCachedServerPersonalTrail('new-owner', updated);
    assert.deepEqual(await database.getCachedServerPersonalTrails('new-owner'), [updated]);
  } finally { sqlite.close(); }
});

function apiFixture() {
  const calls = [];
  const api = load('../api/personalTrailApi.ts', {
    '@/lib/api-client': { apiRequest: async (url) => {
      calls.push(url);
      const page = Number(new URL(url, 'http://test').searchParams.get('page'));
      return { success: true, data: [{ id: `trail-${page}` }], pagination: { totalPages: 3 } };
    } },
    '@/features/auth/storage': { readStoredAuth: async () => ({ accessToken: 'token' }) },
    'react-native': { Platform: { OS: 'android', Version: 1, select: (options) => options.android } },
  });
  return { ...api, calls };
}

test('backend verification states and the highest difficulty round-trip correctly', () => {
  const { convertBackendTrailToPersonalTrail, mapDifficultyToBackend, mapDifficultyFromBackend } = apiFixture();
  for (const [server, client] of [['SUBMITTED', 'PENDING'], ['UNDER_REVIEW', 'PENDING'], ['APPROVED', 'VERIFIED'], ['REJECTED', 'REJECTED']]) {
    assert.equal(convertBackendTrailToPersonalTrail({ id: 'trail', verificationStatus: server }).verificationStatus, client);
  }
  assert.equal(mapDifficultyToBackend('Thách thức'), 'VERY_HARD');
  assert.equal(mapDifficultyFromBackend('EXTREME'), 'Thách thức');
  assert.equal(mapDifficultyFromBackend('VERY_HARD'), 'Thách thức');
});

test('fetches all server pages before returning a replacement for the offline cache', async () => {
  const { personalTrailApi, calls } = apiFixture();
  assert.deepEqual((await personalTrailApi.getAllMyTrails()).map((item) => item.id), ['trail-1', 'trail-2', 'trail-3']);
  assert.equal(calls.length, 3);
  personalTrailApi.getMyTrails = async ({ page }) => {
    if (page === 2) throw new Error('offline');
    return { success: true, data: [], pagination: { totalPages: 3 } };
  };
  await assert.rejects(personalTrailApi.getAllMyTrails(), /offline/);
});
