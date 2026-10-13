import { apiRequest } from "@/lib/api-client";

// ─── Booking Types ────────────────────────────────────────────────────────────

export interface BookingParticipant {
  fullName: string;
  phone: string;
  dateOfBirth: string; // ISO date string "YYYY-MM-DD"
}

export interface CreateBookingInput {
  participantCount: number;
  participants: BookingParticipant[];
}

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export interface Booking {
  id: string;
  status: BookingStatus;
  version: number;
  participantCount: number;
  expiresAt: string;
  totalAmount: string;
  currency: string;
}

// ─── UUID Generator ───────────────────────────────────────────────────────────

/** Generates a RFC 4122 v4 UUID for Idempotency-Key */
export function generateIdempotencyKey(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/trips/:tripId/bookings
 * Requires Bearer Token + Idempotency-Key header.
 * Handles CAPACITY_CONFLICT & ACTIVE_BOOKING_EXISTS error codes.
 */
export async function createBooking(
  tripId: string,
  input: CreateBookingInput,
  accessToken: string,
  idempotencyKey: string,
): Promise<Booking> {
  return apiRequest<Booking>(`/api/v1/trips/${tripId}/bookings`, {
    method: "POST",
    accessToken,
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
    fallbackMessages: {
      409: "Chuyến đi không còn đủ chỗ hoặc bạn đã có booking đang hoạt động.",
    },
  });
}
