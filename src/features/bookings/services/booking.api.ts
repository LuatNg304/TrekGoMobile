import { apiRequest, ApiError } from "@/lib/api-client";
import type {
  BookingDetail,
  BookingListQuery,
  BookingSummary,
  CancelBookingResponse,
  PageResponse,
  Participant,
  PaymentCheckoutResponse,
  PaymentGateway,
  PaymentMethod,
  PaymentOptionsResponse,
  PublicBookingTrip,
  PublicTripsQuery,
} from "../types";

// ─── UUID / Idempotency Key Generator ──────────────────────────────────────────

/**
 * Generates an RFC 4122 v4 UUID string for Idempotency-Key header.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Payload Formatters ────────────────────────────────────────────────────────

/**
 * Formats participants payload:
 * - Omits id for new participants
 * - Omits empty strings to satisfy Zod validation rules
 */
export function formatParticipantsPayload(participants: Participant[]) {
  return {
    participantCount: participants.length,
    participants: participants.map((p) => {
      const item: Record<string, any> = {
        fullName: p.fullName.trim(),
      };
      if (p.id) {
        item.id = p.id;
      }
      if (p.phone && p.phone.trim()) {
        item.phone = p.phone.trim();
      }
      if (p.dateOfBirth && p.dateOfBirth.trim()) {
        item.dateOfBirth = p.dateOfBirth.trim();
      }
      if (p.emergencyContactName && p.emergencyContactName.trim()) {
        item.emergencyContactName = p.emergencyContactName.trim();
      }
      if (p.emergencyContactPhone && p.emergencyContactPhone.trim()) {
        item.emergencyContactPhone = p.emergencyContactPhone.trim();
      }
      return item;
    }),
  };
}

// ─── Error Message Mapping ─────────────────────────────────────────────────────

export const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục.",
  FORBIDDEN: "Bạn không có quyền thao tác đặt chỗ này.",
  ACTIVE_BOOKING_EXISTS:
    "Bạn đã có đặt chỗ đang hoạt động cho chuyến này. Đang mở đặt chỗ hiện tại của bạn...",
  CAPACITY_CONFLICT:
    "Chuyến đi không còn đủ chỗ. Vui lòng giảm số người hoặc chọn chuyến khác.",
  BOOKING_HOLD_EXPIRED: "Thời gian giữ chỗ đã hết. Vui lòng tạo đặt chỗ mới.",
  BOOKING_VERSION_CONFLICT:
    "Đặt chỗ đã thay đổi trên máy chủ. Vui lòng tải lại trước khi sửa.",
  PAYMENT_ATTEMPT_IN_PROGRESS:
    "Giao dịch đang được xử lý. Vui lòng chờ kết quả trước khi tiếp tục.",
  PAYMENT_PROVIDER_UNAVAILABLE:
    "Cổng thanh toán đang tạm thời không khả dụng. Vui lòng thử lại sau.",
  BOOKING_POLICY_UNAVAILABLE:
    "Chuyến đi chưa sẵn sàng nhận đặt chỗ. Vui lòng thử lại sau.",
  BOOKING_CANCELLATION_POLICY_INVALID:
    "Chính sách hoàn tiền chưa được cấu hình. Vui lòng liên hệ hỗ trợ.",
  INVALID_STATE_TRANSITION: "Trạng thái hiện tại không cho phép thao tác này.",
  VALIDATION_ERROR:
    "Vui lòng kiểm tra thông tin thành viên và dữ liệu đã nhập.",
  NOT_FOUND: "Không tìm thấy thông tin chuyến đi hoặc đặt chỗ.",
};

export function getBookingErrorMessage(
  error: unknown,
  fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.",
): { message: string; code?: string; bookingId?: string } {
  if (error instanceof ApiError) {
    const code = error.code;
    const details = error.details as any;
    const bookingId = details?.bookingId as string | undefined;

    let message = fallback;
    if (code && BOOKING_ERROR_MESSAGES[code]) {
      message = BOOKING_ERROR_MESSAGES[code];
    } else if (error.message) {
      message = error.message;
    }

    return { message, code, bookingId };
  }

  if (error instanceof Error) {
    return { message: error.message || fallback };
  }

  return { message: fallback };
}

// ─── Booking Status Labels ─────────────────────────────────────────────────────

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã điểm danh",
  PARTIAL_CHECKIN: "Điểm danh 1 phần",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
  NO_SHOW: "Vắng mặt",
};

// ─── API Service ───────────────────────────────────────────────────────────────

export const bookingApiService = {
  /**
   * GET /api/v1/trips
   * Khám phá danh sách Public Trips mở đăng ký
   */
  getPublicTrips: async (
    query: PublicTripsQuery = {},
  ): Promise<PageResponse<PublicBookingTrip>> => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.destinationId) params.set("destinationId", query.destinationId);
    if (query.difficulty) params.set("difficulty", query.difficulty);
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
    if (query.price !== undefined) params.set("price", String(query.price));

    const q = params.toString();
    return apiRequest<PageResponse<PublicBookingTrip>>(
      `/api/v1/trips${q ? `?${q}` : ""}`,
    );
  },

  /**
   * GET /api/v1/trips/{id}
   * Chi tiết Public Trip
   */
  getPublicTripDetail: async (tripId: string): Promise<PublicBookingTrip> => {
    return apiRequest<PublicBookingTrip>(`/api/v1/trips/${tripId}`);
  },

  /**
   * POST /api/v1/trips/{tripId}/bookings
   * Tạo booking & giữ chỗ tạm thời (Hold)
   */
  createBooking: async (
    tripId: string,
    participants: Participant[],
    idempotencyKey: string,
  ): Promise<BookingDetail> => {
    const payload = formatParticipantsPayload(participants);
    return apiRequest<BookingDetail>(`/api/v1/trips/${tripId}/bookings`, {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * GET /api/v1/bookings/{id}
   * Xem chi tiết đặt chỗ và thông tin thanh toán / vé
   */
  getBookingDetail: async (bookingId: string): Promise<BookingDetail> => {
    return apiRequest<BookingDetail>(`/api/v1/bookings/${bookingId}`);
  },

  /**
   * GET /api/v1/bookings
   * Danh sách đặt chỗ của người dùng hiện tại
   */
  listMyBookings: async (
    query: BookingListQuery = {},
  ): Promise<PageResponse<BookingSummary>> => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.status) params.set("status", query.status);

    const q = params.toString();
    return apiRequest<PageResponse<BookingSummary>>(
      `/api/v1/bookings${q ? `?${q}` : ""}`,
    );
  },

  /**
   * PATCH /api/v1/bookings/{id}/participants
   * Cập nhật danh sách thành viên trước khi khởi hành
   */
  updateParticipants: async (
    bookingId: string,
    participants: Participant[],
    expectedVersion?: number,
  ): Promise<BookingDetail> => {
    const payload = {
      ...formatParticipantsPayload(participants),
      ...(typeof expectedVersion === "number" ? { expectedVersion } : {}),
    };
    return apiRequest<BookingDetail>(
      `/api/v1/bookings/${bookingId}/participants`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * GET /api/v1/payments/options
   * Lấy danh sách cổng thanh toán đang hoạt động
   */
  getPaymentOptions: async (): Promise<PaymentOptionsResponse> => {
    return apiRequest<PaymentOptionsResponse>(`/api/v1/payments/options`);
  },

  /**
   * POST /api/v1/bookings/{id}/payments
   * Khởi tạo thanh toán (Redirect / QR)
   */
  createPayment: async (
    bookingId: string,
    idempotencyKey: string,
    paymentMethod: PaymentMethod = "REDIRECT",
    gateway?: PaymentGateway,
  ): Promise<PaymentCheckoutResponse> => {
    const body: Record<string, any> = { paymentMethod };
    if (gateway) body.gateway = gateway;

    return apiRequest<PaymentCheckoutResponse>(
      `/api/v1/bookings/${bookingId}/payments`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      },
    );
  },

  /**
   * POST /api/v1/bookings/{id}/cancel
   * Hủy đặt chỗ theo chính sách hoàn tiền
   */
  cancelBooking: async (
    bookingId: string,
    reason: string,
    idempotencyKey: string,
  ): Promise<CancelBookingResponse> => {
    return apiRequest<CancelBookingResponse>(
      `/api/v1/bookings/${bookingId}/cancel`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ reason }),
      },
    );
  },
};
