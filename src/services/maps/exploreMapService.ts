import * as Network from 'expo-network';
import { exploreMapDatabase as storage, ExploreRegion } from './exploreMapDatabase';
import {
  bytesToBase64, Coordinate, distanceMeters, isImageBytes, MapTile,
  planExploreTiles, tileKey, validCoordinate,
} from './exploreMapPlan';

const apiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim() ?? '';
// Enable only after MapTiler confirms the account's right to prefetch regions.
export const regionDownloadsEnabled = process.env.EXPO_PUBLIC_MAPTILER_OFFLINE_DOWNLOADS_ENABLED === 'true';
export const mapTilerConfigured = apiKey.length > 0;
export interface ExploreMapState {
  network: 'CHECKING' | 'ONLINE' | 'OFFLINE';
  source: 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'MIXED' | 'UNAVAILABLE';
  download: 'IDLE' | 'DOWNLOADING' | 'VERIFYING' | 'READY' | 'PAUSED' | 'ERROR' | 'LICENSE_REQUIRED';
  completed: number;
  total: number;
  regionCenter: Coordinate | null;
  position: Coordinate | null;
  locationMessage: string | null;
  error: string | null;
  notice: string | null;
  revision: number;
  offlineMaxZoom: number | null;
  viewMessage: string | null;
}
let state: ExploreMapState = {
  network: 'CHECKING', source: 'CONNECTING',
  download: regionDownloadsEnabled ? 'IDLE' : 'LICENSE_REQUIRED',
  completed: 0, total: 0, regionCenter: null, position: null,
  locationMessage: null, error: null, notice: null, revision: 0,
  offlineMaxZoom: null, viewMessage: null,
};
const listeners = new Set<() => void>();
function update(patch: Partial<ExploreMapState>) {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}
let region: ExploreRegion | null = null;
let initialized: Promise<void> | undefined;
let active = false;
let downloading = false;
let lastAttempt = 0;
let generation = 0;
let connections = 0;
let viewportTicket = 0;
const waiters: (() => void)[] = [];
const inflight = new Map<string, Promise<{ bytes: Uint8Array; source: 'ONLINE' | 'OFFLINE' }>>();
const layerSources: Partial<Record<MapTile['kind'], 'ONLINE' | 'OFFLINE' | 'UNAVAILABLE'>> = {};
const retryAfter: Partial<Record<MapTile['kind'], number>> = {};
const controllers = new Set<AbortController>();

async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (connections >= 3) await new Promise<void>(resolve => waiters.push(resolve));
  else connections++;
  try { return await work(); }
  finally {
    const next = waiters.shift();
    if (next) next(); else connections--;
  }
}

class MapRequestError extends Error {
  constructor(public status: number) {
    super(status === 401 || status === 403 ? 'MapTiler từ chối API key hoặc quyền truy cập.' :
      status === 429 ? 'Đã chạm giới hạn yêu cầu MapTiler. Vui lòng thử lại sau.' :
      `Không tải được bản đồ (HTTP ${status}).`);
  }
}

function markSource(kind: MapTile['kind'], source: 'ONLINE' | 'OFFLINE' | 'UNAVAILABLE') {
  if (layerSources[kind] === source) return;
  layerSources[kind] = source;
  const values = Object.values(layerSources);
  const actual = values.includes('ONLINE') && values.includes('OFFLINE') ? 'MIXED' :
    values.includes('OFFLINE') ? 'OFFLINE' : values.includes('ONLINE') ? 'ONLINE' : 'UNAVAILABLE';
  update({ source: actual });
}

async function fetchTile(tile: MapTile) {
  if (!apiKey) throw new Error('Chưa cấu hình MapTiler API key.');
  return slot(async () => {
    if (!active || state.network === 'OFFLINE') throw new Error('Đang offline hoặc Explore tạm dừng.');
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const dataset = tile.kind === 'satellite' ? 'satellite-v2' : 'terrain-rgb-v2';
      const extension = tile.kind === 'satellite' ? 'jpg' : 'webp';
      const response = await fetch(`https://api.maptiler.com/tiles/${dataset}/${tile.z}/${tile.x}/${tile.y}.${extension}?key=${encodeURIComponent(apiKey)}`,
        { signal: controller.signal });
      if (!response.ok) throw new MapRequestError(response.status);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!isImageBytes(bytes) || bytes.byteLength > 2 * 1024 * 1024) throw new Error('Nguồn bản đồ trả về tile không hợp lệ.');
      if (state.error) update({ error: null });
      const control = response.headers.get('cache-control') ?? '';
      const maxAge = /max-age=(\d+)/i.exec(control);
      const ttl = Math.min(Number(maxAge?.[1] ?? 604800), 2592000) * 1000;
      // Temporary personal cache only. No key/token or URL is persisted.
      if (!/no-store|no-cache/i.test(control) && ttl > 0) {
        try {
          await storage.put(tileKey(tile), bytes, Date.now() + ttl, new Set(region?.keys ?? []));
        } catch {
          update({ error: 'Không lưu được tile trên máy. Kiểm tra dung lượng trống.' });
          // Display can still succeed online; region verification will fail truthfully.
        }
      }
      return bytes;
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
    }
  });
}

async function resource(tile: MapTile, prefetch = false) {
  const key = tileKey(tile);
  const pending = inflight.get(key);
  if (pending) return pending;
  const task = (async () => {
    const ticket = generation;
    const cached = await storage.get(key);
    if (prefetch && cached) return { bytes: cached, source: 'OFFLINE' as const };
    if (state.network !== 'OFFLINE' && Date.now() >= (retryAfter[tile.kind] ?? 0)) {
      try {
        const bytes = await fetchTile(tile);
        retryAfter[tile.kind] = 0;
        if (!prefetch && ticket === generation) markSource(tile.kind, 'ONLINE');
        return { bytes, source: 'ONLINE' as const };
      } catch (error) {
        if (ticket === generation) retryAfter[tile.kind] = Date.now() + (error instanceof MapRequestError ? 60000 : 30000);
        if (error instanceof MapRequestError) update({ error: error.message });
        if (!cached) throw error;
      }
    }
    if (cached) {
      if (!prefetch && ticket === generation) markSource(tile.kind, 'OFFLINE');
      return { bytes: cached, source: 'OFFLINE' as const };
    }
    throw new Error('Chưa có bản đồ offline tại khu vực hoặc mức zoom này.');
  })();
  inflight.set(key, task);
  try { return await task; } finally { inflight.delete(key); }
}

async function initialize() {
  if (!initialized) initialized = (async () => {
    region = await storage.readRegion();
    if (region) await reconcile();
  })().catch(() => { update({ error: 'Không mở được kho bản đồ trên máy.' }); initialized = undefined; });
  await initialized;
}

async function reconcile() {
  if (!region || !regionDownloadsEnabled || downloading) return;
  const valid = await storage.validKeys();
  const completed = region.keys.filter(key => valid.has(key)).length;
  update({ completed, total: region.keys.length, regionCenter: region.center,
    download: completed === region.keys.length ? 'READY' : 'PAUSED' });
  if (active && completed === region.keys.length && !region.notified) {
    update({ notice: 'Đã tải bản đồ offline 2D/3D bán kính 2 km quanh vị trí đã lưu · Zoom tối đa 16' });
  }
}

async function downloadRegion() {
  if (!active || downloading || !regionDownloadsEnabled || state.network !== 'ONLINE' || !state.position || !apiKey) return;
  const position = state.position;
  const shouldMove = !region || distanceMeters(position, region.center) >= 500;
  if (!shouldMove && (state.download === 'READY' || Date.now() - lastAttempt < 30000)) return;
  downloading = true;
  lastAttempt = Date.now();
  const ticket = generation;
  try {
    if (shouldMove) {
      const tiles = planExploreTiles(position);
      region = { revision: `${Date.now()}-${position.join(',')}`, center: position,
        keys: tiles.map(tileKey), notified: false };
      await storage.saveRegion(region);
    }
    const target = region!;
    const tiles = planExploreTiles(target.center);
    const valid = await storage.validKeys();
    let completed = target.keys.filter(key => valid.has(key)).length;
    update({ download: 'DOWNLOADING', completed, total: target.keys.length, regionCenter: target.center, notice: null });
    // Sequential prefetch leaves capacity for visible map tiles and limits radio use.
    for (const tile of tiles) {
      if (!active || generation !== ticket || state.network !== 'ONLINE') { update({ download: 'PAUSED' }); return; }
      if (valid.has(tileKey(tile))) continue;
      await resource(tile, true);
      if (!await storage.get(tileKey(tile))) throw new Error('Tile chưa lưu được; gói offline chưa hoàn tất.');
      completed++;
      update({ completed });
      if (state.position && distanceMeters(state.position, target.center) >= 500) { update({ download: 'PAUSED' }); return; }
    }
    update({ download: 'VERIFYING' });
    // Read/validate all required satellite and DEM BLOBs before claiming READY.
    for (const key of target.keys) if (!await storage.get(key)) throw new Error('Dữ liệu offline chưa đầy đủ.');
    if (!active || ticket !== generation) return;
    update({ download: 'READY', completed: target.keys.length, revision: state.revision + 1 });
    if (!target.notified) {
      update({ notice: 'Đã tải bản đồ offline 2D/3D bán kính 2 km quanh vị trí đã lưu · Zoom tối đa 16' });
      // Persist notification acknowledgement only when the UI actually presents it.
    }
  } catch (error) {
    update({ download: exploreMapService.getSnapshot().network === 'OFFLINE' || !active ? 'PAUSED' : 'ERROR',
      error: error instanceof MapRequestError ? error.message : 'Chưa tải xong bản đồ offline. Sẽ thử lại khi có mạng và đủ bộ nhớ.' });
  } finally {
    downloading = false;
  }
}

function networkChanged(network: Network.NetworkState) {
  const next = network.isConnected === false || network.isInternetReachable === false ? 'OFFLINE' : 'ONLINE';
  if (next !== state.network) {
    generation++;
    if (next === 'OFFLINE') {
      controllers.forEach(controller => controller.abort());
      layerSources.satellite = undefined;
      layerSources.dem = undefined;
    } else {
      retryAfter.satellite = 0;
      retryAfter.dem = 0;
    }
    update({ network: next, source: next === 'ONLINE' ? 'CONNECTING' : 'UNAVAILABLE', revision: state.revision + 1 });
  }
  void downloadRegion();
}

export const exploreMapService = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => state,
  async start() {
    active = true;
    await initialize();
    if (!active) return () => {};
    try { networkChanged(await Network.getNetworkStateAsync()); }
    catch { update({ error: 'Chưa xác định được kết nối mạng.' }); }
    const subscription = Network.addNetworkStateListener(networkChanged);
    const interval = setInterval(() => {
      void reconcile().then(downloadRegion).catch(() => update({ error: 'Không kiểm tra được dữ liệu offline.' }));
      // Retry map requests after a source failure even if Wi-Fi never changed.
      if (state.network === 'ONLINE' && state.source !== 'ONLINE') update({ revision: state.revision + 1 });
    }, 30000);
    return () => { subscription.remove(); clearInterval(interval); };
  },
  pause() {
    active = false;
    generation++;
    controllers.forEach(controller => controller.abort());
  },
  setPosition(position: Coordinate) {
    if (!validCoordinate(position)) return;
    update({ position, locationMessage: null });
    void downloadRegion();
  },
  setLocationMessage(locationMessage: string) { update({ locationMessage }); },
  async setViewport(center: Coordinate) {
    if (!validCoordinate(center)) return;
    const ticket = ++viewportTicket;
    const keys = await storage.validKeys();
    let max: number | null = null;
    for (let z = 10; z <= 16; z++) {
      const n = 2 ** z;
      const radians = center[1] * Math.PI / 180;
      const x = Math.min(n - 1, Math.max(0, Math.floor((center[0] + 180) / 360 * n)));
      const y = Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * n);
      if (keys.has(tileKey({ kind: 'satellite', z, x, y }))) max = z;
    }
    if (ticket === viewportTicket) update({ offlineMaxZoom: max,
      viewMessage: max === null && state.network === 'OFFLINE' ? 'Chưa có dữ liệu offline tại tâm bản đồ. Phần đã lưu có thể chỉ phủ một phần màn hình.' : null });
  },
  async tile(tile: MapTile) {
    try {
      const result = await resource(tile);
      return { base64: bytesToBase64(result.bytes), source: result.source };
    } catch (error) {
      markSource(tile.kind, 'UNAVAILABLE');
      if (state.network === 'OFFLINE') update({ viewMessage: 'Dữ liệu offline chưa phủ đầy đủ vùng đang xem.' });
      throw new Error(error instanceof MapRequestError ? error.message : 'Chưa có bản đồ tại vùng hoặc mức zoom này.');
    }
  },
  async acknowledgeNotice() {
    if (region && state.notice) {
      region = { ...region, notified: true };
      await storage.saveRegion(region);
      update({ notice: null });
    }
  },
};
