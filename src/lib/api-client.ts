import { Platform } from "react-native";

const fallbackApiUrl = "http://192.168.1.7:3000";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl
).replace(/\/$/, "");

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string | string[];
    details?: unknown;
    retryable?: boolean;
  };
  message?: string | string[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiRequestOptions = RequestInit & {
  accessToken?: string;
  timeoutMs?: number;
  fallbackMessages?: Partial<Record<number, string>>;
};

const defaultMessages: Record<number, string> = {
  400: "Dữ liệu gửi lên không hợp lệ.",
  401: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu đã thay đổi hoặc bị trùng lặp.",
  422: "Dữ liệu chưa đáp ứng điều kiện xử lý.",
  500: "Máy chủ đang gặp sự cố. Vui lòng thử lại.",
};

function getErrorMessage(
  payload: ApiErrorEnvelope | null,
  status: number,
  fallbackMessages?: Partial<Record<number, string>>,
) {
  const rawMessage = payload?.error?.message ?? payload?.message;

  if (Array.isArray(rawMessage)) {
    return rawMessage[0] || "Dữ liệu không hợp lệ.";
  }

  if (rawMessage) return rawMessage;

  return (
    fallbackMessages?.[status] ??
    defaultMessages[status] ??
    "Yêu cầu chưa thể hoàn tất. Vui lòng thử lại."
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    accessToken,
    timeoutMs = 15_000,
    fallbackMessages,
    headers,
    ...requestOptions
  } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  const isFormData =
    typeof FormData !== "undefined" && requestOptions.body instanceof FormData;

  if (requestOptions.body && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: T | ApiErrorEnvelope | null = null;

    if (text) {
      try {
        payload = JSON.parse(text) as T | ApiErrorEnvelope;
      } catch {
        throw new ApiError(
          "TrekGo API trả về dữ liệu không hợp lệ.",
          response.status,
        );
      }
    }

    if (!response.ok) {
      const errorPayload = payload as ApiErrorEnvelope | null;
      throw new ApiError(
        getErrorMessage(errorPayload, response.status, fallbackMessages),
        response.status,
        errorPayload?.error?.code,
        errorPayload?.error?.details,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new ApiError(
      timedOut
        ? "API phản hồi quá lâu. Vui lòng thử lại."
        : `Không kết nối được TrekGo API tại ${API_BASE_URL}.`,
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
