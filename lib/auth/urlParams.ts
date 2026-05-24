import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";
import { isAuthErrorCode, getAuthErrorMessage } from "@/lib/auth/errors";
import {
  hasRecognizedAuthParams,
  snapshotAuthUrlDebug,
} from "@/lib/auth/parseAuthParams";

export function hasClientAuthParamsInUrl(): boolean {
  if (typeof window === "undefined") return false;
  return hasRecognizedAuthParams(new URL(window.location.href));
}

export function captureAuthUrlOnLanding(): void {
  if (typeof window === "undefined") return;
  snapshotAuthUrlDebug();
}

export function getAuthErrorFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const code = new URL(window.location.href).searchParams.get(AUTH_ERROR_PARAM);
  if (!code) return null;
  return isAuthErrorCode(code)
    ? getAuthErrorMessage(code)
    : "Sign-in failed. Please try again.";
}

export function clearAuthErrorFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(AUTH_ERROR_PARAM)) return;
  url.searchParams.delete(AUTH_ERROR_PARAM);
  url.searchParams.delete("auth_debug_q");
  url.searchParams.delete("auth_debug_h");
  url.searchParams.delete("auth_debug_path");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
