/* global __dirname, Buffer */
// node --test src/services/maps/explore-map.regression.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const module = { exports: {} };
  const run = vm.runInThisContext(`(function(require,module,exports,fetch,process,setInterval){${code}\n})`, { filename });
  run(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw Error(`Unexpected import: ${name}`);
  }, module, module.exports, globals.fetch, globals.process ?? process, globals.setInterval ?? setInterval);
  return module.exports;
}
const plan = load('./exploreMapPlan.ts');
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));

function fixture() {
  const sql = new DatabaseSync(':memory:');
  const bridge = {
    execAsync: async query => sql.exec(query),
    runAsync: async (query, ...args) => sql.prepare(query).run(...args),
    getFirstAsync: async (query, ...args) => sql.prepare(query).get(...args) ?? null,
    getAllAsync: async (query, ...args) => sql.prepare(query).all(...args),
  };
  const { exploreMapDatabase: database } = load('./exploreMapDatabase.ts', {
    'expo-sqlite': { openDatabaseAsync: async () => bridge }, './exploreMapPlan': plan,
  });
  return { database, sql };
}

function serviceFixture({ enabled = false, online = true, request } = {}) {
  const { database, sql } = fixture();
  let callback;
  let fetches = 0;
  let periodic;
  const { exploreMapService: service } = load('./exploreMapService.ts', {
    './exploreMapDatabase': { exploreMapDatabase: database }, './exploreMapPlan': plan,
    'expo-network': {
      getNetworkStateAsync: async () => ({ isConnected: online, isInternetReachable: online }),
      addNetworkStateListener: fn => { callback = fn; return { remove() {} }; },
    },
  }, {
    process: { env: { EXPO_PUBLIC_MAPTILER_API_KEY: 'test-key', EXPO_PUBLIC_MAPTILER_OFFLINE_DOWNLOADS_ENABLED: String(enabled) } },
    setInterval: fn => { periodic = fn; return 0; },
    fetch: async (...args) => {
      fetches++;
      if (request) return request(...args);
      return { ok: true, headers: new Headers({ 'cache-control': 'max-age=3600' }), arrayBuffer: async () => png.buffer };
    },
  });
  return { service, database, sql, fetches: () => fetches,
    network: value => callback({ isConnected: value, isInternetReachable: value }),
    periodic: () => periodic() };
}

test('2 km plan covers both sides of the antimeridian and includes mandatory DEM, without duplicates', () => {
  for (const center of [[108.529, 11.5831], [179.999, 11]]) {
    const tiles = plan.planExploreTiles(center);
    assert.equal(new Set(tiles.map(plan.tileKey)).size, tiles.length);
    assert(tiles.some(t => t.kind === 'satellite' && t.z === 16));
    assert(tiles.some(t => t.kind === 'dem' && t.z === 12));
    assert(tiles.every(t => t.x >= 0 && t.x < 2 ** t.z && t.y >= 0 && t.y < 2 ** t.z));
  }
  assert.throws(() => plan.planExploreTiles([0, 90]));
  assert.equal(plan.parseTileUrl('trekgo://dem/13/1/1'), null);
  assert.equal(plan.parseTileUrl('https://attacker.example/1'), null);
  assert.equal(plan.parseTileUrl('trekgo://satellite/10/1024/0'), null);
});

test('SQLite stores binary data, deduplicates tile keys and refuses expired/corrupt tiles', async () => {
  const { database, sql } = fixture();
  const key = plan.tileKey({ kind: 'satellite', z: 10, x: 1, y: 1 });
  await database.put(key, png, Date.now() + 100000, new Set());
  await database.put(key, png, Date.now() + 100000, new Set());
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM explore_tiles').get().n, 1);
  assert.equal(sql.prepare('SELECT typeof(data) AS type FROM explore_tiles').get().type, 'blob');
  assert.deepEqual(await database.get(key), png);
  sql.prepare('UPDATE explore_tiles SET expires_at = 0').run();
  assert.equal(await database.get(key), null);
  await assert.rejects(database.put(key, new Uint8Array([60, 104, 116, 109, 108]), Date.now() + 10000, new Set()));
  sql.close();
});

test('storage reserves space before a write and never evicts the protected region', async () => {
  const { database, sql } = fixture();
  const oldKey = plan.tileKey({ kind: 'satellite', z: 10, x: 1, y: 1 });
  const newKey = plan.tileKey({ kind: 'satellite', z: 10, x: 2, y: 1 });
  await database.put(oldKey, png, Date.now() + 100000, new Set());
  // Model a full database without allocating a 200 MiB test fixture.
  sql.prepare('UPDATE explore_tiles SET byte_size = ?').run(plan.EXPLORE_BUDGET_BYTES);
  await assert.rejects(database.put(newKey, png, Date.now() + 100000, new Set([oldKey])), /200 MiB/);
  assert.equal(await database.get(newKey), null);
  assert(await database.get(oldKey));
  await database.put(newKey, png, Date.now() + 100000, new Set());
  assert.equal(await database.get(oldKey), null);
  assert(await database.get(newKey));
  sql.close();
});

test('Free config does not prefetch; viewed tile is available offline without another request', async () => {
  const f = serviceFixture();
  const stop = await f.service.start();
  f.service.setPosition([108.529, 11.5831]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.fetches(), 0);
  assert.equal(f.service.getSnapshot().download, 'LICENSE_REQUIRED');
  const tile = { kind: 'satellite', z: 10, x: 820, y: 478 };
  const first = await f.service.tile(tile);
  assert.equal(first.source, 'ONLINE');
  assert.equal(first.base64, Buffer.from(png).toString('base64'));
  f.network(false);
  const second = await f.service.tile(tile);
  assert.equal(second.source, 'OFFLINE');
  assert.equal(f.fetches(), 1);
  await assert.rejects(f.service.tile({ ...tile, x: 821 }), /Chưa có bản đồ/);
  f.service.pause(); stop(); f.sql.close();
});

test('cold offline start uses persisted tiles and reports the available center zoom', async () => {
  const f = serviceFixture({ online: false });
  const center = [108.529, 11.5831];
  const tile = plan.planExploreTiles(center).find(t => t.kind === 'satellite' && t.z === 14);
  // Select the precise tile containing the center rather than an intersecting neighbour.
  const n = 2 ** 14;
  tile.x = Math.floor((center[0] + 180) / 360 * n);
  tile.y = Math.floor((1 - Math.asinh(Math.tan(center[1] * Math.PI / 180)) / Math.PI) / 2 * n);
  await f.database.put(plan.tileKey(tile), png, Date.now() + 100000, new Set());
  const stop = await f.service.start();
  assert.equal((await f.service.tile(tile)).source, 'OFFLINE');
  await f.service.setViewport(center);
  assert.equal(f.service.getSnapshot().offlineMaxZoom, 14);
  assert.equal(f.fetches(), 0);
  f.service.pause(); stop(); f.sql.close();
});

test('concurrent display requests use at most three HTTP requests and identical requests share one fetch', async () => {
  let active = 0, peak = 0;
  const f = serviceFixture({ request: async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--;
    return { ok: true, headers: new Headers(), arrayBuffer: async () => png.buffer };
  } });
  const stop = await f.service.start();
  const tiles = Array.from({ length: 7 }, (_, x) => ({ kind: 'satellite', z: 10, x, y: 1 }));
  await Promise.all([...tiles, tiles[0]].map(tile => f.service.tile(tile)));
  assert.equal(peak, 3);
  assert.equal(f.fetches(), 7);
  f.service.pause(); stop(); f.sql.close();
});

test('authorized region cannot become READY with only imagery; resumes missing DEM and notification is persisted', async () => {
  const f = serviceFixture({ enabled: true });
  const center = [108.529, 11.5831], tiles = plan.planExploreTiles(center);
  for (const tile of tiles.filter(t => t.kind === 'satellite')) {
    await f.database.put(plan.tileKey(tile), png, Date.now() + 100000, new Set());
  }
  await f.database.saveRegion({ center, revision: 'test-region', keys: tiles.map(plan.tileKey), notified: false });
  const stop = await f.service.start();
  assert.equal(f.service.getSnapshot().download, 'PAUSED');
  f.service.setPosition(center);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); reject(Error('Region did not complete')); }, 3000);
    const unsubscribe = f.service.subscribe(() => {
      if (f.service.getSnapshot().download === 'READY') { clearTimeout(timer); unsubscribe(); resolve(); }
    });
  });
  assert.equal(f.fetches(), tiles.filter(t => t.kind === 'dem').length);
  assert.equal(f.service.getSnapshot().completed, tiles.length);
  assert(f.service.getSnapshot().notice);
  await f.service.acknowledgeNotice();
  assert.equal((await f.database.readRegion()).notified, true);
  f.service.pause(); stop(); f.sql.close();
});

test('MapLibre bridge changes tile providers and zoom limits without recreating map/style', async () => {
  const { exploreProtocolScript } = load('../../components/map/exploreProtocol.ts');
  const messages = [], updated = [];
  let protocol;
  const context = vm.createContext({
    window: { ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) } },
    maplibregl: { addProtocol: (_, fn) => { protocol = fn; } },
    map: { setMaxZoom: value => updated.push(value), getZoom: () => 18,
      easeTo: value => updated.push(value.zoom), getCenter: () => ({ lng: 108.529, lat: 11.5831 }),
      getSource: () => ({ setTiles: value => updated.push(value[0]) }) },
    setTimeout, clearTimeout, atob, Uint8Array, Map,
  });
  vm.runInContext(exploreProtocolScript, context);
  context.window.setExploreConnection(true, 1, 14);
  assert.equal(updated[0], 14);
  assert.equal(updated[1], 14);
  assert.equal(updated.filter(v => typeof v === 'string').length, 2);
  const controller = new AbortController();
  const result = protocol({ url: 'trekgo://satellite/10/1/1' }, controller);
  const request = messages.find(m => m.type === 'EXPLORE_TILE');
  context.window.exploreTileResult(request.id, Buffer.from(png).toString('base64'), null);
  assert.deepEqual(new Uint8Array((await result).data), png);
  const aborted = protocol({ url: 'trekgo://satellite/10/1/2' }, controller);
  controller.abort();
  await assert.rejects(aborted, /cancelled/);
  assert(messages.some(m => m.type === 'EXPLORE_TILE_CANCEL'));
});

test('rate limits fall back to cache without immediately hammering the provider', async () => {
  const f = serviceFixture({ request: async () => ({ ok: false, status: 429 }) });
  const tile = { kind: 'satellite', z: 10, x: 820, y: 478 };
  await f.database.put(plan.tileKey(tile), png, Date.now() + 100000, new Set());
  const stop = await f.service.start();
  assert.equal((await f.service.tile(tile)).source, 'OFFLINE');
  assert.match(f.service.getSnapshot().error, /giới hạn/);
  assert.equal((await f.service.tile(tile)).source, 'OFFLINE');
  assert.equal(f.fetches(), 1);
  f.service.pause(); stop(); f.sql.close();
});

test('no-store images display online but never become an offline region', async () => {
  const f = serviceFixture({ request: async () => ({
    ok: true, headers: new Headers({ 'cache-control': 'no-store' }), arrayBuffer: async () => png.buffer,
  }) });
  const stop = await f.service.start();
  const tile = { kind: 'satellite', z: 10, x: 820, y: 478 };
  assert.equal((await f.service.tile(tile)).source, 'ONLINE');
  assert.equal(await f.database.get(plan.tileKey(tile)), null);
  f.network(false);
  await assert.rejects(f.service.tile(tile));
  assert.equal(f.service.getSnapshot().download, 'LICENSE_REQUIRED');
  f.service.pause(); stop(); f.sql.close();
});

test('Explore HTML embeds the real runtime and has valid scripts without API keys or CDN dependencies', () => {
  const runtime = load('../../components/map/vendor/maplibreRuntime.ts');
  const protocol = load('../../components/map/exploreProtocol.ts');
  const react = {
    forwardRef: fn => fn, memo: fn => fn,
    useEffect() {}, useImperativeHandle() {},
    useMemo: fn => fn(), useRef: value => ({ current: value }),
    useState: value => [value, () => {}],
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  };
  react.default = react;
  const { MapLibre3DView: render } = load('../../components/map/MapLibre3DView.tsx', {
    react,
    'react-native': { Platform: { OS: 'android' }, StyleSheet: { create: x => x } },
    'react-native-webview': { WebView: 'webview' },
    'expo-linking': {},
    '@/constants/theme': { Colors: {}, Radius: {}, Shadows: {} },
    '@expo/vector-icons': {},
    '@/services/maps/exploreMapService': { exploreMapService: {} },
    '@/services/maps/exploreMapPlan': plan,
    './exploreProtocol': protocol,
    './vendor/maplibreRuntime': runtime,
    './vendor/mapTilerLogo': { mapTilerLogo: '<svg></svg>' },
  });
  const tree = render({ exploreState: { network: 'OFFLINE' } }, null);
  function findWebView(element) {
    if (!element || typeof element !== 'object') return null;
    if (element.type === 'webview') return element;
    for (const child of element.props?.children ?? []) {
      const result = findWebView(child);
      if (result) return result;
    }
    return null;
  }
  const html = findWebView(tree).props.source.html;
  assert(!html.includes('src="https://unpkg.com'));
  assert(!html.includes('server.arcgisonline.com'));
  assert(!html.includes('YOUR_API_KEY'));
  assert(html.includes('trekgo://dem/'));
  assert(html.includes('encoding: \'mapbox\''));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  for (const [, script] of scripts) assert.doesNotThrow(() => new vm.Script(script));
});
