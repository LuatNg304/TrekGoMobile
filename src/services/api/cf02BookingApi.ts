import { API_BASE_URL } from "@/lib/api-client";
import { readStoredAuth } from "@/features/auth/storage";
import { OpenAPI } from "@/api/generated/core/OpenAPI";
import { ApiError } from "@/api/generated/core/ApiError";
import { BookingsService } from "@/api/generated/services/BookingsService";
import { PaymentsService } from "@/api/generated/services/PaymentsService";
import { ThanhToNTChBookingPaymentsService } from "@/api/generated/services/ThanhToNTChBookingPaymentsService";

// Đồng bộ OpenAPI token và URL
OpenAPI.BASE = API_BASE_URL;
OpenAPI.TOKEN = async () => {
  const auth = await readStoredAuth();
  return auth?.accessToken || "";
};

export interface BookingParticipantInput {
  id?: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface CreateBookingPayload {
  tripId: string;
  participantCount: number;
  participants: BookingParticipantInput[];
}

export interface UpdateParticipantsPayload {
  participantCount: number;
  participants: BookingParticipantInput[];
  expectedVersion: number;
}

export interface BookingPaymentPayload {
  paymentMethod: "QR" | "REDIRECT";
  gateway?: "momo" | "vnpay";
}

export interface CancelBookingPayload {
  reason: string;
}

export interface Cf02ErrorPayload {
  statusCode?: number;
  code?: string;
  message: string;
  existingBookingId?: string;
  issues?: { code: string; field: string; message: string }[];
}

export function generateIdempotencyKey(prefix = "bk"): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${ts}-${rand}`;
}

export function parseCf02Error(error: unknown): Cf02ErrorPayload {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object") {
      const message =
        typeof body.message === "string"
          ? body.message
          : Array.isArray(body.message)
            ? body.message.join(", ")
            : error.message || "Đã xảy ra lỗi khi xử lý đơn đặt chỗ.";

      const issues: { code: string; field: string; message: string }[] =
        Array.isArray(body.issues)
          ? body.issues.map((it: any) => ({
              code: String(it.code || ""),
              field: String(it.field || ""),
              message: String(it.message || ""),
            }))
          : [];

      // Kiểm tra issue ACTIVE_BOOKING_EXISTS hoặc error code
      let existingBookingId: string | undefined =
        body.bookingId || body.existingBookingId;
      const activeBookingIssue = issues.find(
        (i: { code: string }) => i.code === "ACTIVE_BOOKING_EXISTS"
      );
      if (activeBookingIssue && !existingBookingId) {
        existingBookingId = (activeBookingIssue as any).bookingId;
      }

      return {
        statusCode: error.status,
        code: body.code || (activeBookingIssue ? "ACTIVE_BOOKING_EXISTS" : `HTTP_${error.status}`),
        message,
        existingBookingId,
        issues,
      };
    }
    return {
      statusCode: error.status,
      code: `HTTP_${error.status}`,
      message: error.message || "Lỗi máy chủ.",
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "Lỗi kết nối không xác định.",
  };
}

export const cf02BookingApi = {
  /**
   * API 19: POST /api/v1/trips/{tripId}/bookings
   * Giữ chỗ chuyến đi công khai với Idempotency-Key
   */
  async createBooking(
    payload: CreateBookingPayload,
    idempotencyKey?: string
  ) {
    const key = idempotencyKey || generateIdempotencyKey("create-booking");
    return BookingsService.bookingsControllerCreate(
      payload.tripId,
      key,
      {
        participantCount: payload.participantCount,
        participants: payload.participants,
      }
    );
  },

  /**
   * API 20: PATCH /api/v1/bookings/{id}/participants
   * Cập nhật danh sách người tham gia khi đang PENDING_PAYMENT kèm expectedVersion
   */
  async updateParticipants(
    bookingId: string,
    payload: UpdateParticipantsPayload
  ) {
    return BookingsService.bookingsControllerUpdate(bookingId, payload);
  },

  /**
   * API 21: GET /api/v1/bookings/{id}
   * Chi tiết đơn đặt chỗ + Polling trạng thái thanh toán
   */
  async getBookingDetail(bookingId: string) {
    return BookingsService.bookingsControllerDetail(bookingId);
  },

  /**
   * API 22: GET /api/v1/bookings
   * Danh sách đặt chỗ của tôi, lọc theo status
   */
  async getMyBookings(params?: {
    status?:
      | "PENDING_PAYMENT"
      | "CONFIRMED"
      | "EXPIRED"
      | "CANCELLED"
      | "CHECKED_IN"
      | "PARTIAL_CHECKIN"
      | "COMPLETED"
      | "NO_SHOW";
    pageSize?: number;
    page?: number;
  }) {
    return BookingsService.bookingsControllerList(
      params?.status,
      params?.pageSize ?? 12,
      params?.page ?? 1
    );
  },

  /**
   * API 23a: GET /api/v1/payments/options
   * Lấy danh sách cổng thanh toán & cổng mặc định
   */
  async getPaymentOptions() {
    return PaymentsService.paymentOptionsControllerOptions();
  },

  /**
   * API 23b: POST /api/v1/bookings/{id}/payments
   * Tạo phiên thanh toán cho đơn đặt chỗ PENDING_PAYMENT
   */
  async createBookingPayment(
    bookingId: string,
    payload: BookingPaymentPayload,
    idempotencyKey?: string
  ) {
    const key = idempotencyKey || generateIdempotencyKey("pay-booking");
    return ThanhToNTChBookingPaymentsService.paymentsControllerCreate(
      bookingId,
      key,
      payload
    );
  },

  /**
   * API 24: POST /api/v1/bookings/{id}/cancel
   * Hủy đặt chỗ chuyến đi kèm lý do và Idempotency-Key
   */
  async cancelBooking(
    bookingId: string,
    payload: CancelBookingPayload,
    idempotencyKey?: string
  ) {
    const key = idempotencyKey || generateIdempotencyKey("cancel-booking");
    return BookingsService.bookingCancellationsControllerCancel1(
      bookingId,
      key,
      payload
    );
  },
};
