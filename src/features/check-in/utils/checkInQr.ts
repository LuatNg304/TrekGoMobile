/**
 * Định dạng payload QR điểm danh (check-in) trước giờ khởi hành.
 *
 * QR được hiển thị ở màn hình chi tiết đặt chỗ phía Trekker và được
 * Leader quét tại điểm tập kết. Hiện tại payload được sinh ở client
 * (UI-first). Khi backend sẵn sàng, nên thay `sig` bằng token ký từ server
 * (VD: JWT ngắn hạn) để tránh giả mạo.
 */

export const CHECK_IN_QR_PREFIX = "TREKGO-CHECKIN:";

export interface CheckInQrPayload {
  v: 1;
  /** Trip ID */
  t: string;
  /** Booking ID */
  b: string;
  /** Participant ID (hoặc index nếu chưa có id) */
  p: string;
  /** Tên hiển thị của thành viên */
  n: string;
  /** Mã ngắn để leader đối chiếu bằng mắt / nhập tay */
  c: string;
}

export function buildShortCode(bookingId: string, participantKey: string): string {
  const b = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  const p = participantKey.replace(/[^a-zA-Z0-9]/g, "").slice(-3).toUpperCase();
  return `CK-${b}-${p.padStart(3, "0")}`;
}

export function buildCheckInQrValue(input: {
  tripId: string;
  bookingId: string;
  participantId: string;
  name: string;
}): string {
  const payload: CheckInQrPayload = {
    v: 1,
    t: input.tripId,
    b: input.bookingId,
    p: input.participantId,
    n: input.name,
    c: buildShortCode(input.bookingId, input.participantId),
  };
  return `${CHECK_IN_QR_PREFIX}${JSON.stringify(payload)}`;
}

export function parseCheckInQrValue(raw: string): CheckInQrPayload | null {
  if (!raw || !raw.startsWith(CHECK_IN_QR_PREFIX)) return null;
  try {
    const parsed = JSON.parse(raw.slice(CHECK_IN_QR_PREFIX.length));
    if (
      parsed?.v === 1 &&
      typeof parsed.t === "string" &&
      typeof parsed.b === "string" &&
      typeof parsed.p === "string"
    ) {
      return {
        v: 1,
        t: parsed.t,
        b: parsed.b,
        p: parsed.p,
        n: typeof parsed.n === "string" ? parsed.n : "Trekker",
        c: typeof parsed.c === "string" ? parsed.c : buildShortCode(parsed.b, parsed.p),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Cửa sổ điểm danh: mở từ 00:00 ngày khởi hành đến khi chuyến kết thúc. */
export function getCheckInWindow(startAt?: string, endAt?: string) {
  const start = startAt ? new Date(startAt) : null;
  if (!start || isNaN(start.getTime())) {
    return { isOpen: false, isBefore: false, isAfter: false, opensAt: null as Date | null };
  }
  const opensAt = new Date(start);
  opensAt.setHours(0, 0, 0, 0);
  const end = endAt ? new Date(endAt) : null;
  const closesAt = end && !isNaN(end.getTime()) ? end : new Date(start.getTime() + 24 * 3600 * 1000);
  const now = Date.now();
  const isBefore = now < opensAt.getTime();
  const isAfter = now > closesAt.getTime();
  return { isOpen: !isBefore && !isAfter, isBefore, isAfter, opensAt };
}

export function formatDayMonth(date: Date | null): string {
  if (!date) return "--/--";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}
