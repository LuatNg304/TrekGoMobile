import nacl from 'tweetnacl';
import { canonicalGpsJson, gpsHash } from './trip-gps.hash';
import type { OfflinePackage, PublicKey } from '../contract';

export function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const input = value.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(input) || input.length % 4 === 1) throw new Error('Dữ liệu chữ ký không hợp lệ.');
  const bytes: number[] = []; let bits = 0, buffer = 0;
  for (const c of input) { buffer = (buffer << 6) | alphabet.indexOf(c); bits += 6; if (bits >= 8) { bits -= 8; bytes.push((buffer >>> bits) & 255); } }
  return new Uint8Array(bytes);
}
export function utf8(value: string): Uint8Array {
  return new Uint8Array(Array.from(unescape(encodeURIComponent(value)), c => c.charCodeAt(0)));
}
export function verifyPackage(data: OfflinePackage, account: string, tripId: string, keys: PublicKey[], now?: number) {
  const c = data.grant?.claims;
  if (!c || c.protocolVersion !== 3 || data.snapshot?.protocolVersion !== 3 ||
    c.accountId !== account || c.tripId !== tripId || data.snapshot.tripId !== tripId || c.packageId !== data.packageId ||
    c.packageHash !== data.packageHash || gpsHash(data.snapshot) !== data.packageHash ||
    !c.scope?.includes('route:read') || !c.scope.includes('recording:upload') || c.alg !== 'Ed25519' ||
    !data.capabilities?.supportedSyncProtocols.includes(3)) throw new Error('Gói tuyến không đúng tài khoản, chuyến đi hoặc checksum.');
  const key = keys.find(k => k.kid === c.kid && k.alg === 'Ed25519');
  if (!key) throw new Error('Chưa có khóa xác minh tuyến offline. Hãy tải lại dữ liệu chuyến.');
  const der = decodeBase64(key.publicKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''));
  const prefix = [48, 42, 48, 5, 6, 3, 43, 101, 112, 3, 33, 0];
  if (der.length !== 44 || prefix.some((v, i) => der[i] !== v) ||
    !nacl.sign.detached.verify(utf8(canonicalGpsJson(c)), decodeBase64(data.grant.signature), der.slice(12))) throw new Error('Chữ ký tuyến offline không hợp lệ.');
  if (!Number.isFinite(Date.parse(c.offlineAccessFrom)) || !Number.isFinite(Date.parse(c.offlineAccessUntil))) throw new Error('Thời hạn tuyến không hợp lệ.');
  if (now !== undefined && (now < Date.parse(c.offlineAccessFrom) || now >= Date.parse(c.offlineAccessUntil))) throw new Error('Quyền sử dụng tuyến offline chưa có hiệu lực hoặc đã hết hạn. Hãy tải lại khi có mạng.');
}
