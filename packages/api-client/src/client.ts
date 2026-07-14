import type { PaginatedResponse } from "@magaza/shared";
import { fetchCached } from "@magaza/shared";

export type ApiConfig = {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  refreshAuth?: () => Promise<string | null>;
  onUnauthorized?: () => void;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient(config: ApiConfig) {
  async function request<T>(
    path: string,
    options: RequestInit = {},
    retried = false
  ): Promise<T> {
    const token = config.getToken ? await Promise.resolve(config.getToken()) : null;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers,
    }).catch(() => {
      throw new ApiError(
        `Sunucuya bağlanılamadı (${config.baseUrl}). Web sunucusu çalışıyor mu? Telefon ve bilgisayar aynı Wi-Fi'de olmalı.`,
        0
      );
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Only run session recovery when we actually sent a token (i.e. an
      // authenticated session that expired). Requests without a token — such
      // as the login endpoint — should surface their error normally.
      const isSessionExpired =
        res.status === 401 && Boolean(token) && path !== "/api/v1/auth/refresh";

      if (isSessionExpired) {
        if (!retried && config.refreshAuth) {
          const newToken = await config.refreshAuth();
          if (newToken) {
            return request<T>(path, options, true);
          }
        }
        // Session cannot be recovered: trigger logout/redirect and stop the
        // promise chain here so callers don't produce uncaught rejections.
        config.onUnauthorized?.();
        return new Promise<T>(() => {});
      }

      throw new ApiError(
        (data as { error?: string })?.error ?? "Bir hata oluştu",
        res.status,
        data
      );
    }

    return data as T;
  }

  async function getCached<T>(path: string, ttlMs = 60_000): Promise<T> {
    return fetchCached(`api:${path}`, ttlMs, () => request<T>(path));
  }

  async function getPaginated<T>(path: string): Promise<PaginatedResponse<T>> {
    return request<PaginatedResponse<T>>(path);
  }

  return {
    get: <T>(path: string) => request<T>(path),
    getCached,
    getPaginated,
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}

export type AuthUser = {
  id: string;
  username: string;
  role: "ADMIN" | "MANAGER" | "STORE";
  storeId?: string | null;
  storeName?: string | null;
};

export type LoginResponse = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};
