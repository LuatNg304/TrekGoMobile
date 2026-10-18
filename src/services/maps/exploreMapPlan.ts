export type Coordinate = [longitude: number, latitude: number];
export type TileKind = 'satellite' | 'dem';
export interface MapTile { kind: TileKind; z: number; x: number; y: number }
export const EXPLORE_RADIUS_METERS = 2000;
export const OFFLINE_MIN_ZOOM = 10;
export const OFFLINE_MAX_ZOOM = 16;
export const DEM_MAX_ZOOM = 12;
export const EXPLORE_BUDGET_BYTES = 200 * 1024 * 1024;
export const SOURCE_REVISION = 'maptiler-satellite-v2-terrain-rgb-v2-v1';

export function validCoordinate(value: Coordinate): boolean {
  return value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 85;
}

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const radians = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * radians / 2) ** 2 +
    Math.cos(a[1] * radians) * Math.cos(b[1] * radians) *
    Math.sin((b[0] - a[0]) * radians / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function tileKey(tile: MapTile): string {
  return `${SOURCE_REVISION}/${tile.kind}/${tile.z}/${tile.x}/${tile.y}`;
}

export function parseTileUrl(url: string): MapTile | null {
  const match = /^trekgo:\/\/(satellite|dem)\/(\d+)\/(\d+)\/(\d+)(?:\?.*)?$/.exec(url);
  if (!match) return null;
  const [, kind, zText, xText, yText] = match;
  const z = Number(zText), x = Number(xText), y = Number(yText);
  if (z > (kind === 'dem' ? DEM_MAX_ZOOM : 18) || x >= 2 ** z || y >= 2 ** z) return null;
  return { kind: kind as TileKind, z, x, y };
}

/** Circle/tile intersection in a local Mercator projection, including DEM neighbours.
 * A small conservative margin accounts for scale variation across the 2 km circle.
 */
export function planExploreTiles(center: Coordinate): MapTile[] {
  if (!validCoordinate(center)) throw new Error('Vị trí không hợp lệ.');
  const earth = 6378137, half = Math.PI * earth;
  const cx = earth * center[0] * Math.PI / 180;
  const cy = earth * Math.log(Math.tan(Math.PI / 4 + center[1] * Math.PI / 360));
  const radius = EXPLORE_RADIUS_METERS / Math.cos(center[1] * Math.PI / 180) * 1.01;
  const tiles = new Map<string, MapTile>();
  for (const kind of ['satellite', 'dem'] as const) {
    const max = kind === 'dem' ? DEM_MAX_ZOOM : OFFLINE_MAX_ZOOM;
    for (let z = OFFLINE_MIN_ZOOM; z <= max; z++) {
      const count = 2 ** z, size = half * 2 / count;
      for (let tx = Math.floor((cx - radius + half) / size); tx <= Math.floor((cx + radius + half) / size); tx++) {
        for (let ty = Math.floor((half - cy - radius) / size); ty <= Math.floor((half - cy + radius) / size); ty++) {
          const left = tx * size - half, top = half - ty * size;
          const dx = Math.max(left - cx, 0, cx - left - size);
          const dy = Math.max(top - size - cy, 0, cy - top);
          if (dx * dx + dy * dy > radius * radius) continue;
          const padding = kind === 'dem' ? 1 : 0;
          for (let ox = -padding; ox <= padding; ox++) for (let oy = -padding; oy <= padding; oy++) {
            const y = ty + oy;
            if (y < 0 || y >= count) continue;
            const tile = { kind, z, x: ((tx + ox) % count + count) % count, y };
            tiles.set(tileKey(tile), tile);
          }
        }
      }
    }
  }
  // Low zoom first gives a usable overview early. DEM is mandatory, even in 2D view.
  return [...tiles.values()].sort((a, b) => a.z - b.z || a.kind.localeCompare(b.kind));
}

export function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    parts.push(alphabet[(n >>> 18) & 63] + alphabet[(n >>> 12) & 63] +
      (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') +
      (i + 2 < bytes.length ? alphabet[n & 63] : '='));
  }
  return parts.join('');
}

export function isImageBytes(bytes: Uint8Array): boolean {
  return (bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    (bytes.length > 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) ||
    (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
}
