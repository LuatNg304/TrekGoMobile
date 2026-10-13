import { useCallback, useState } from "react";
import {
  createBooking,
  generateIdempotencyKey,
  type Booking,
  type CreateBookingInput,
} from "@/features/bookings/services/booking.api";
import { ApiError } from "@/lib/api-client";

export function useCreateBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setBooking(null);
    setIdempotencyKey(generateIdempotencyKey());
  }, []);

  const regenerateKey = useCallback(() => {
    setIdempotencyKey(generateIdempotencyKey());
  }, []);

  const submitBooking = useCallback(
    async (
      tripId: string,
      input: CreateBookingInput,
      accessToken: string,
    ): Promise<Booking> => {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        const result = await createBooking(
          tripId,
          input,
          accessToken,
          idempotencyKey,
        );
        setBooking(result);
        return result;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          setErrorCode(err.code || null);
          throw err;
        }

        const fallback = "Không thể gửi yêu cầu đặt chỗ. Vui lòng thử lại.";
        setError(fallback);
        throw new Error(fallback);
      } finally {
        setLoading(false);
      }
    },
    [idempotencyKey],
  );

  return {
    submitBooking,
    loading,
    error,
    errorCode,
    booking,
    reset,
    regenerateKey,
    idempotencyKey,
  };
}
