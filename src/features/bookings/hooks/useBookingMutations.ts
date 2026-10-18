import { useCallback, useRef, useState } from "react";
import {
  bookingApiService,
  generateIdempotencyKey,
  getBookingErrorMessage,
} from "../services/booking.api";
import type {
  BookingDetail,
  CancelBookingResponse,
  Participant,
  PaymentCheckoutResponse,
  PaymentGateway,
  PaymentMethod,
} from "../types";

export interface BookingMutationError {
  message: string;
  code?: string;
  bookingId?: string;
}

export function useBookingMutations() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<BookingMutationError | null>(null);

  // Key storage for idempotent payment / booking attempts
  const paymentKeysRef = useRef<Record<string, string>>({});

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createBooking = useCallback(
    async (
      tripId: string,
      participants: Participant[],
      customKey?: string,
    ): Promise<BookingDetail> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const key = customKey || generateIdempotencyKey();
        const result = await bookingApiService.createBooking(
          tripId,
          participants,
          key,
        );
        return result;
      } catch (err: unknown) {
        const errInfo = getBookingErrorMessage(err, "Không thể tạo đặt chỗ.");
        setError(errInfo);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const updateParticipants = useCallback(
    async (
      bookingId: string,
      participants: Participant[],
      expectedVersion?: number,
    ): Promise<BookingDetail> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await bookingApiService.updateParticipants(
          bookingId,
          participants,
          expectedVersion,
        );
        return result;
      } catch (err: unknown) {
        const errInfo = getBookingErrorMessage(
          err,
          "Không thể cập nhật danh sách thành viên.",
        );
        setError(errInfo);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const createPayment = useCallback(
    async (
      bookingId: string,
      paymentMethod: PaymentMethod = "REDIRECT",
      gateway?: PaymentGateway,
      paymentIdHint?: string,
    ): Promise<PaymentCheckoutResponse> => {
      setIsSubmitting(true);
      setError(null);
      try {
        // Retain key across network drops/retries for the same booking + gateway + attempt
        const cacheKey = `${bookingId}:${gateway || "default"}:${paymentIdHint || "first"}`;
        if (!paymentKeysRef.current[cacheKey]) {
          paymentKeysRef.current[cacheKey] = generateIdempotencyKey();
        }
        const key = paymentKeysRef.current[cacheKey];

        const result = await bookingApiService.createPayment(
          bookingId,
          key,
          paymentMethod,
          gateway,
        );
        return result;
      } catch (err: unknown) {
        const errInfo = getBookingErrorMessage(
          err,
          "Không thể khởi tạo cổng thanh toán.",
        );
        setError(errInfo);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const cancelBooking = useCallback(
    async (
      bookingId: string,
      reason: string,
      customKey?: string,
    ): Promise<CancelBookingResponse> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const key = customKey || generateIdempotencyKey();
        const result = await bookingApiService.cancelBooking(
          bookingId,
          reason,
          key,
        );
        return result;
      } catch (err: unknown) {
        const errInfo = getBookingErrorMessage(err, "Không thể hủy đặt chỗ.");
        setError(errInfo);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    createBooking,
    updateParticipants,
    createPayment,
    cancelBooking,
    isSubmitting,
    error,
    clearError,
  };
}
