import { apiRequest } from "@/lib/api-client";
import type {
  CreateInviteResponse,
  CreatePrivateTripPayload,
  InvitePreviewData,
  JoinTripResponse,
  LeaveTripResponse,
  PickupPointOption,
  PrivateTrip,
  RemoveMemberResponse,
  TripMember,
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

/** GET /system-trails — Lấy danh sách cung đường hệ thống khả dụng */
export async function getSystemTrails(page = 1, pageSize = 20) {
  return apiRequest<{ items: any[] }>(
    `/api/v1/system-trails?page=${page}&pageSize=${pageSize}`,
  );
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
export async function getMyPrivateTrips(page = 1) {
  return apiRequest<PrivateTrip[]>(`/api/v1/private-trips?page=${page}`);
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
export async function joinPrivateTripByCode(code: string) {
  return apiRequest<JoinTripResponse>(
    `/api/v1/private-trip-invitations/${encodeURIComponent(code)}/join`,
    {
      method: "POST",
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
  params: { page?: number; pageSize?: number; status?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.status) query.set("status", params.status);

  return apiRequest<{
    items: TripMember[];
    total: number;
    page: number;
    pageSize: number;
    activeMemberCount: number;
    capacity: number;
  }>(`/api/v1/private-trips/${tripId}/members?${query.toString()}`);
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
