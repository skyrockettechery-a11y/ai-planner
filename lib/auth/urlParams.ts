import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";
import { isAuthErrorCode, getAuthErrorMessage } from "@/lib/auth/errors";

export function hasClientAuthParamsInUrl(): boolean {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  if (url.hash.includes("access_token=")) return true;
  if (url.pathname === "/" && url.searchParams.get("code")) return true;
  if (
    url.pathname === "/" &&
    url.searchParams.get("token_hash") &&
    url.searchParams.get("type")
  ) {
    return true;
  }
  return false;
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
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
