import { Platform } from "react-native";

import {
  AuthSession,
  AuthUser,
  MessageResponse,
  RefreshTokenResponse,
  RegisterInput,
  RegisterResponse,
} from "@/features/auth/types";

const fallbackApiUrl = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://127.0.0.1:3000",
});

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

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function getErrorMessage(payload: ApiErrorEnvelope | null, status: number) {
  const rawMessage = payload?.error?.message ?? payload?.message;

  if (Array.isArray(rawMessage)) return rawMessage[0] || "Dữ liệu không hợp lệ.";
  if (rawMessage) return rawMessage;

  if (status === 401) return "Email hoặc mật khẩu không chính xác.";
  if (status === 409) return "Email này đã được đăng ký.";
  return "Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T | ApiErrorEnvelope) : null;

    if (!response.ok) {
      const errorPayload = payload as ApiErrorEnvelope | null;
      throw new AuthApiError(
        getErrorMessage(errorPayload, response.status),
        response.status,
        errorPayload?.error?.code,
        errorPayload?.error?.details,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;

    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new AuthApiError(
      timedOut
        ? "API phản hồi quá lâu. Vui lòng thử lại."
        : `Không kết nối được TrekGo API tại ${API_BASE_URL}.`,
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<RegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...input, role: "USER" }),
    }),

  login: (email: string, password: string) =>
    request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyOtp: (email: string, otp: string) =>
    request<AuthSession>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  resendOtp: (email: string) =>
    request<MessageResponse>("/api/v1/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    request<MessageResponse>("/api/v1/auth/reset-forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  refresh: (refreshToken: string) =>
    request<RefreshTokenResponse>("/api/v1/auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  me: (accessToken: string) =>
    request<AuthUser>("/api/v1/auth/me", { method: "GET" }, accessToken),

  logout: (accessToken: string) =>
    request<MessageResponse>(
      "/api/v1/auth/logout",
      { method: "POST" },
      accessToken,
    ),
};
