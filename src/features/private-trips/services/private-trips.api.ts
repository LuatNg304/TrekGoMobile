import { apiRequest } from "@/lib/api-client";
import type {
  CreateInviteResponse,
  CreatePrivateTripPayload,
  InvitePreviewData,
  JoinTripResponse,
  LeaveTripResponse,
  MyPrivateTripsResponse,
  PickupPointOption,
  PrivateTrip,
  PurchaseTrailPayload,
  PurchaseTrailResponse,
  RemoveMemberResponse,
  TrailAccessResponse,
  TripMember,
  TripMembersResponse,
  TripRoomData,
  UpdatePrivateTripPayload,
} from "../types";

// ─── NHÓM A: DỮ LIỆU ĐẦU VÀO ĐỂ TẠO CHUYẾN ────────────────────────────────────

/** GET /me/personal-trails — Lấy danh sách cung đường cá nhân */
export async function getPersonalTrails(page = 1) {
  return apiRequest<any[]>(`/api/v1/me/personal-trails?page=${page}`);
}

/** GET /me/trail-accesses — Lấy danh sách cung đường hệ thống đã mua quyền */
export async function getSystemTrailAccesses(page = 1) {
  return apiRequest<any[]>(`/api/v1/me/trail-accesses?page=${page}`);
}

/** GET /system-trails?destinationId={uuid}&page=1&pageSize=20 — Lấy danh sách cung đường hệ thống theo địa điểm */
export async function getSystemTrails(
  destinationId?: string,
  page = 1,
  pageSize = 20,
) {
  const query = new URLSearchParams();
  if (destinationId) query.set("destinationId", destinationId);
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  return apiRequest<{ items: any[] }>(`/api/v1/system-trails?${query.toString()}`);
}

/** GET /system-trails/{idOrCode} — Lấy chi tiết cung đường hệ thống (3D Map) */
export async function getSystemTrailDetail(idOrCode: string) {
  return apiRequest<any>(
    `/api/v1/system-trails/${encodeURIComponent(idOrCode)}`,
  );
}

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── TRAIL PURCHASE SESSION CACHE (Idempotent Session Reuse) ─────────────────

export interface TrailPurchaseSession {
  idempotencyKey: string;
  paymentMethod: "REDIRECT" | "QR";
  gateway: "vnpay" | "momo";
  checkoutUrl?: string;
  expiresAt: string; // ISO string từ Backend
}

const SESSION_STORAGE_PREFIX = "@trekgo/trail-purchase-session:";
const activeTrailSessions = new Map<string, TrailPurchaseSession>();

/** Lấy thông tin phiên thanh toán đang hoạt động cho cung đường */
export async function getTrailPurchaseSession(
  trailId: string,
): Promise<TrailPurchaseSession | null> {
  const mem = activeTrailSessions.get(trailId);
  const now = Date.now();
  if (mem) {
    if (new Date(mem.expiresAt).getTime() > now) {
      return mem;
    }
    activeTrailSessions.delete(trailId);
  }

  try {
    const raw = await AsyncStorage.getItem(`${SESSION_STORAGE_PREFIX}${trailId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as TrailPurchaseSession;
      if (new Date(parsed.expiresAt).getTime() > now) {
        activeTrailSessions.set(trailId, parsed);
        return parsed;
      }
      await AsyncStorage.removeItem(`${SESSION_STORAGE_PREFIX}${trailId}`);
    }
  } catch {
    // Không ném lỗi storage
  }
  return null;
}

/** Lưu thông tin phiên thanh toán đang chờ */
export async function saveTrailPurchaseSession(
  trailId: string,
  session: TrailPurchaseSession,
): Promise<void> {
  activeTrailSessions.set(trailId, session);
  try {
    await AsyncStorage.setItem(
      `${SESSION_STORAGE_PREFIX}${trailId}`,
      JSON.stringify(session),
    );
  } catch {
    // Không ném lỗi storage
  }
}

/** Xóa phiên thanh toán khi giao dịch hoàn tất hoặc hủy */
export async function clearTrailPurchaseSession(trailId: string): Promise<void> {
  activeTrailSessions.delete(trailId);
  try {
    await AsyncStorage.removeItem(`${SESSION_STORAGE_PREFIX}${trailId}`);
  } catch {
    // Không ném lỗi storage
  }
}

// Giữ lại alias để tương thích ngược
export const clearTrailIdempotencyKey = clearTrailPurchaseSession;

/** GET /trails/{trailId}/access — Kiểm tra quyền truy cập của User với System Trail */
export async function checkTrailAccess(trailId: string) {
  return apiRequest<TrailAccessResponse>(`/api/v1/trails/${trailId}/access`);
}

/** POST /trails/{trailId}/purchase — Mua quyền sử dụng System Trail qua cổng VNPAY */
export async function purchaseTrailAccess(
  trailId: string,
  payload: PurchaseTrailPayload = { paymentMethod: "REDIRECT", gateway: "vnpay" },
  customIdempotencyKey?: string,
) {
  const now = Date.now();
  const existingSession = await getTrailPurchaseSession(trailId);

  let idempotencyKey: string;
  let methodToSend: "REDIRECT" | "QR" = payload.paymentMethod || "REDIRECT";
  let gatewayToSend: "vnpay" | "momo" = payload.gateway || "vnpay";

  // Kiểm tra nếu phiên cũ vẫn còn hiệu lực (< 15 phút)
  if (existingSession && new Date(existingSession.expiresAt).getTime() > now) {
    idempotencyKey = customIdempotencyKey || existingSession.idempotencyKey;
    methodToSend = existingSession.paymentMethod;
    gatewayToSend = existingSession.gateway;
  } else {
    // Tạo key mới nếu chưa có hoặc đã hết hạn
    const cleanTrailId = trailId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    idempotencyKey = customIdempotencyKey || `mob-${cleanTrailId}-${now}`;
  }

  try {
    // Backend schema: .strict() - chỉ gửi đúng 2 trường paymentMethod & gateway
    const res = await apiRequest<PurchaseTrailResponse>(
      `/api/v1/trails/${trailId}/purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          paymentMethod: methodToSend,
          gateway: gatewayToSend,
        }),
      },
    );

    const checkoutUrl = res.checkout?.url || res.checkout?.paymentUrl;
    if (res.paymentId || checkoutUrl) {
      const expiresAt =
        res.expiresAt ||
        res.checkout?.expiresAt ||
        new Date(now + 14 * 60 * 1000).toISOString();

      await saveTrailPurchaseSession(trailId, {
        idempotencyKey,
        paymentMethod: methodToSend,
        gateway: gatewayToSend,
        checkoutUrl,
        expiresAt,
      });
    }

    return res;
  } catch (error: any) {
    const errCode = error?.code || (error as any)?.details?.code;

    // Nếu bị lỗi payload khác nhau do đổi method, xóa key cũ để lần sau tạo key mới
    if (errCode === "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD") {
      await clearTrailPurchaseSession(trailId);
    }

    // Nếu người dùng đã mở khóa trước đó (ACTIVE)
    if (errCode === "PAYMENT_INVALID_STATE") {
      await clearTrailPurchaseSession(trailId);
    }

    throw error;
  }
}

/** GET /private-trip-options/pickup-points — Lấy điểm đón theo địa điểm */
export async function getPickupPoints(destinationId: string, page = 1) {
  return apiRequest<PickupPointOption[]>(
    `/api/v1/private-trip-options/pickup-points?destinationId=${encodeURIComponent(
      destinationId,
    )}&page=${page}`,
  );
}

// ─── NHÓM B: QUẢN LÝ CHUYẾN ĐI (DÀNH CHO HOST) ────────────────────────────────

/** POST /private-trips — Tạo chuyến đi riêng mới */
export async function createPrivateTrip(payload: CreatePrivateTripPayload) {
  return apiRequest<PrivateTrip>("/api/v1/private-trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** GET /private-trips — Lấy danh sách chuyến đi do mình tạo */
/** GET /me/private-trips - Active memberships, including host and invited member. */
export async function getMyPrivateTrips(page = 1, pageSize = 50) {
  const result = await apiRequest<MyPrivateTripsResponse>(
    `/api/v1/me/private-trips?page=${page}&pageSize=${pageSize}`,
  );
  return result.items;
}

/** GET /private-trips/:id — Chi tiết chuyến đi dành cho Host */
export async function getPrivateTripDetail(tripId: string) {
  return apiRequest<PrivateTrip>(`/api/v1/private-trips/${tripId}`);
}

/** PATCH /private-trips/:id — Cập nhật thông tin chuyến đi */
export async function updatePrivateTrip(
  tripId: string,
  payload: UpdatePrivateTripPayload,
) {
  return apiRequest<PrivateTrip>(`/api/v1/private-trips/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST /private-trips/:id/invitations — Tạo mã mời / link mời */
export async function createTripInvite(
  tripId: string,
  expectedVersion: number,
  expiresAt?: string,
) {
  return apiRequest<CreateInviteResponse>(
    `/api/v1/private-trips/${tripId}/invitations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedVersion,
        ...(expiresAt ? { expiresAt } : {}),
      }),
    },
  );
}

/** POST /private-trips/:id/invitations/revoke — Thu hồi mã mời */
export async function revokeTripInvite(tripId: string, expectedVersion: number) {
  return apiRequest<{ tripId: string; revokedCount: number; tripVersion: number }>(
    `/api/v1/private-trips/${tripId}/invitations/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion }),
    },
  );
}

/** POST /private-trips/:id/cancel — Hủy chuyến đi (kèm lý do) */
export async function cancelPrivateTrip(
  tripId: string,
  expectedVersion: number,
  reason: string,
) {
  return apiRequest<PrivateTrip>(`/api/v1/private-trips/${tripId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedVersion, reason }),
  });
}

// ─── NHÓM C: THÀNH VIÊN, LỜI MỜI VÀ PHÒNG CHỜ ─────────────────────────────────

/** GET /private-trip-invitations/:code — Xem trước lời mời (Public Preview) */
export async function previewTripInvite(code: string) {
  return apiRequest<InvitePreviewData>(
    `/api/v1/private-trip-invitations/${encodeURIComponent(code)}`,
  );
}

/** POST /private-trip-invitations/:code/join — Xác nhận tham gia chuyến đi */
export async function joinPrivateTripByCode(code: string, accessToken?: string) {
  return apiRequest<JoinTripResponse>(
    `/api/v1/private-trip-invitations/${encodeURIComponent(code)}/join`,
    {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
}

/** GET /private-trips/:id/room — Xem Phòng chờ chuyến đi (Trip Room) */
export async function getPrivateTripRoom(tripId: string) {
  return apiRequest<TripRoomData>(`/api/v1/private-trips/${tripId}/room`);
}

/** GET /private-trips/:id/members — Lấy danh sách thành viên trong chuyến đi */
export async function getPrivateTripMembers(
  tripId: string,
  params: { page?: number; pageSize?: number; status?: "ACTIVE" | "ALL" | string } = {},
): Promise<TripMembersResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page || 1));
  query.set("pageSize", String(params.pageSize || 50));
  if (params.status) query.set("status", params.status);

  return apiRequest<TripMembersResponse>(
    `/api/v1/private-trips/${tripId}/members?${query.toString()}`,
  );
}

/** POST /private-trips/:id/leave — Thành viên tự rời nhóm */
export async function leavePrivateTripRoom(
  tripId: string,
  expectedMemberVersion: number,
) {
  return apiRequest<LeaveTripResponse>(`/api/v1/private-trips/${tripId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedMemberVersion }),
  });
}

/** DELETE /private-trips/:id/members/:memberId — Host loại thành viên khỏi chuyến */
export async function removePrivateTripMember(
  tripId: string,
  memberId: string,
  expectedMemberVersion: number,
) {
  return apiRequest<RemoveMemberResponse>(
    `/api/v1/private-trips/${tripId}/members/${memberId}?expectedMemberVersion=${expectedMemberVersion}`,
    {
      method: "DELETE",
    },
  );
}
