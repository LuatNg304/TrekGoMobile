import { API_BASE_URL, ApiError, refreshSessionOnce } from '@/lib/api-client';
import { readStoredAuth } from '@/features/auth/storage';
import type { OfflinePackage, PublicKey, GroupState, Receipt, ReceiptStatus, RecordingResult } from '../contract';

// Every request and retry is bound to its original account; never replay A's outbox as B.
export async function gpsRequest<T>(account: string, path: string, body?: unknown, method?: 'POST'): Promise<T> {
  const auth = await readStoredAuth();
  if (!auth || auth.user.id !== account) throw new ApiError('Tài khoản GPS đã thay đổi.', 401, 'GPS_ACCOUNT_CHANGED');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const send = (token: string) => fetch(`${API_BASE_URL}/api/v1${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'), signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let response = await send(auth.accessToken);
    if (response.status === 401) {
      const current = await readStoredAuth();
      if (current?.user.id !== account) throw new ApiError('Tài khoản GPS đã thay đổi.', 401, 'GPS_ACCOUNT_CHANGED');
      const renewed = current.accessToken !== auth.accessToken ? current : await refreshSessionOnce();
      if (renewed.user.id !== account || (await readStoredAuth())?.user.id !== account) throw new ApiError('Tài khoản GPS đã thay đổi.', 401, 'GPS_ACCOUNT_CHANGED');
      response = await send(renewed.accessToken);
    }
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : null; } catch { throw new ApiError('API GPS trả dữ liệu không hợp lệ.', response.status, 'GPS_INVALID_RESPONSE'); }
    if (!response.ok) throw new ApiError(payload?.error?.message ?? 'Không thực hiện được yêu cầu GPS.', response.status, payload?.error?.code, payload?.error?.details, payload?.error?.retryable);
    if ((await readStoredAuth())?.user.id !== account) throw new ApiError('Tài khoản GPS đã thay đổi.', 401, 'GPS_ACCOUNT_CHANGED');
    return payload as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(controller.signal.aborted ? 'API GPS phản hồi quá lâu. Dữ liệu local vẫn được giữ.' : 'Chưa kết nối được API GPS. Dữ liệu local vẫn được giữ.', 0, 'GPS_NETWORK_ERROR', undefined, true);
  } finally { clearTimeout(timer); }
}
export const gpsBase = (trip: string) => `/geo/trips/${encodeURIComponent(trip)}/gps`;
export const fetchPackage = (account: string, trip: string) => gpsRequest<OfflinePackage>(account, `${gpsBase(trip)}/offline-package`);
export const fetchKeys = (account: string) => gpsRequest<{ keys: PublicKey[] }>(account, '/geo/gps/offline-grants/keys');
export const fetchGroup = (account: string, trip: string) => gpsRequest<GroupState>(account, `${gpsBase(trip)}/state`);
export const getRecordingStatus = (account: string, trip: string, id: string, cursor = 0) => gpsRequest<ReceiptStatus>(account, `${gpsBase(trip)}/completed-recordings/${id}/status?cursor=${cursor}&limit=100`);
export const getRecordingResult = (account: string, trip: string, id: string) => gpsRequest<Receipt & { result: RecordingResult | null }>(account, `${gpsBase(trip)}/completed-recordings/${id}/result`);
