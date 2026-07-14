import * as SecureStore from "expo-secure-store";
import { createApiClient, type AuthUser } from "@magaza/api-client";
import { invalidateCache } from "@magaza/shared";
import { API_URL } from "./config";

const TOKEN_KEY = "auth_token";
const REFRESH_KEY = "auth_refresh";
const USER_KEY = "auth_user";

let tokenCache: string | null = null;
let tokenLoadPromise: Promise<string | null> | null = null;
let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function getToken() {
  if (tokenCache) return tokenCache;
  if (!tokenLoadPromise) {
    tokenLoadPromise = SecureStore.getItemAsync(TOKEN_KEY).then((token) => {
      tokenCache = token;
      tokenLoadPromise = null;
      return token;
    });
  }
  return tokenLoadPromise;
}

export async function setAuth(token: string, user: AuthUser, refreshToken?: string) {
  tokenCache = token;
  invalidateCache("api:");
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth() {
  tokenCache = null;
  tokenLoadPromise = null;
  refreshPromise = null;
  invalidateCache("api:");
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) return null;

      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token) return null;

      const user = (data.user as AuthUser | undefined) ?? (await getUser());
      if (!user) return null;

      tokenCache = data.token as string;
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      invalidateCache("api:");
      return data.token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleUnauthorized() {
  unauthorizedHandler?.();
}

export const api = createApiClient({
  baseUrl: API_URL,
  getToken,
  refreshAuth: refreshAccessToken,
  onUnauthorized: handleUnauthorized,
});

export async function initApi() {
  const [token, userRaw, refreshToken] = await Promise.all([
    getToken(),
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);

  const hasAnySessionData = Boolean(token || userRaw || refreshToken);
  const hasCompleteSession = Boolean(token && userRaw && refreshToken);

  if (hasAnySessionData && !hasCompleteSession) {
    await clearAuth();
  }
}
