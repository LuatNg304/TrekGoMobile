/**
 * Parser giải mã nội dung từ mã QR do web app (hoặc các kênh chia sẻ) tạo ra.
 * Hỗ trợ:
 * 1. URL đầy đủ: https://trekgo.vn/invite/{code} hoặc http://.../private-trips/invite/{code}
 * 2. Deep link: trekgo://invite/{code}
 * 3. Query param: ?code={code} hoặc ?inviteCode={code}
 * 4. Chuỗi JSON: {"code": "...", ...} hoặc {"inviteCode": "..."}
 * 5. Mã code thô dạng chuỗi: "abc123xyz" hoặc "TRIP-8821"
 */
export function parsePrivateTripInviteCode(rawContent: string): string | null {
  if (!rawContent || typeof rawContent !== "string") {
    return null;
  }

  const trimmed = rawContent.trim();
  if (!trimmed) return null;

  // 1. Kiểm tra nếu là chuỗi JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.code && typeof parsed.code === "string") {
        return parsed.code.trim();
      }
      if (parsed.inviteCode && typeof parsed.inviteCode === "string") {
        return parsed.inviteCode.trim();
      }
    } catch {
      // Bỏ qua lỗi parse JSON nếu không hợp lệ
    }
  }

  // 2. Kiểm tra nếu là URL chứa đường dẫn invite: /invite/{code} hoặc /invitations/{code}
  const pathRegex = /(?:invite|invitations)\/([a-zA-Z0-9_\-\.]+)/i;
  const pathMatch = trimmed.match(pathRegex);
  if (pathMatch && pathMatch[1]) {
    // Loại bỏ query params phía sau nếu có
    return pathMatch[1].split(/[?#]/)[0].trim();
  }

  // 3. Kiểm tra query param: ?code={code} hoặc ?inviteCode={code}
  const queryRegex = /[?&](?:code|inviteCode)=([a-zA-Z0-9_\-\.]+)/i;
  const queryMatch = trimmed.match(queryRegex);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1].split(/[&#]/)[0].trim();
  }

  // 4. Nếu là mã code đơn thuần (không chứa dấu cách, độ dài hợp lý từ 3 đến 64 ký tự)
  if (/^[a-zA-Z0-9_\-\.]{3,64}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
