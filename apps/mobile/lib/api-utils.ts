import { ApiError } from "@magaza/api-client";

export function ignoreAuthError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return;
  throw error;
}

export function catchAuthError<T>(fallback: T) {
  return (error: unknown): T => {
    if (error instanceof ApiError && error.status === 401) return fallback;
    throw error;
  };
}
