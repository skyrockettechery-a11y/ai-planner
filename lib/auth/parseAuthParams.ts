import { parseEmailOtpType } from "@/lib/auth/otpType";
import type { EmailOtpType } from "@supabase/supabase-js";

export type AuthParamsKind = "session" | "code" | "otp" | "oauth_error" | "none";

export type ParsedAuthParams =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "code"; code: string }
  | { kind: "otp"; tokenHash: string; otpType: EmailOtpType }
  | {
      kind: "oauth_error";
      error: string;
      errorCode: string | null;
      errorDescription: string | null;
    }
  | { kind: "none" };

export type AuthUrlDebugSnapshot = {
  path: string;
  query: string[];
  hash: string[];
  capturedAt: string;
};

export const AUTH_URL_DEBUG_STORAGE_KEY = "auth_url_debug";
export const AUTH_DEBUG_QUERY_PARAM = "auth_debug_q";
export const AUTH_DEBUG_HASH_PARAM = "auth_debug_h";
export const AUTH_DEBUG_PATH_PARAM = "auth_debug_path";

const AUTH_PARAM_NAMES = new Set([
  "code",
  "token",
  "token_hash",
  "type",
  "access_token",
  "refresh_token",
  "error",
  "error_code",
  "error_description",
  "next",
]);

function hashSearchParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return new URLSearchParams();
  return new URLSearchParams(raw);
}

export function getAuthParamNames(url: URL): {
  path: string;
  query: string[];
  hash: string[];
} {
  const hash = hashSearchParams(url.hash);
  return {
    path: url.pathname,
    query: [...url.searchParams.keys()],
    hash: [...hash.keys()],
  };
}

export function snapshotAuthUrlDebug(href?: string): AuthUrlDebugSnapshot {
  const url = new URL(href ?? (typeof window !== "undefined" ? window.location.href : "http://localhost/"));
  const snapshot: AuthUrlDebugSnapshot = {
    ...getAuthParamNames(url),
    capturedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(AUTH_URL_DEBUG_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures (private mode, quota).
    }
  }

  return snapshot;
}

export function readStoredAuthUrlDebug(): AuthUrlDebugSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_URL_DEBUG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUrlDebugSnapshot;
    if (!parsed || typeof parsed.path !== "string") return null;
    return {
      path: parsed.path,
      query: Array.isArray(parsed.query) ? parsed.query : [],
      hash: Array.isArray(parsed.hash) ? parsed.hash : [],
      capturedAt: parsed.capturedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function readAuthUrlDebugFromSearchParams(
  searchParams: URLSearchParams,
): AuthUrlDebugSnapshot | null {
  const path = searchParams.get(AUTH_DEBUG_PATH_PARAM);
  const queryRaw = searchParams.get(AUTH_DEBUG_QUERY_PARAM);
  const hashRaw = searchParams.get(AUTH_DEBUG_HASH_PARAM);
  if (!path && !queryRaw && !hashRaw) return null;

  return {
    path: path ?? "",
    query: queryRaw ? queryRaw.split(",").filter(Boolean) : [],
    hash: hashRaw ? hashRaw.split(",").filter(Boolean) : [],
    capturedAt: "",
  };
}

/** Auth params the session handler should try to complete (not error-only URLs). */
export function hasRecognizedAuthParams(url: URL): boolean {
  const kind = parseAuthParamsFromUrl(url).kind;
  return kind === "code" || kind === "otp" || kind === "session";
}

export function hasAuthRelatedParamNames(snapshot: AuthUrlDebugSnapshot): boolean {
  return [...snapshot.query, ...snapshot.hash].some((name) =>
    AUTH_PARAM_NAMES.has(name),
  );
}

export function parseAuthParamsFromUrl(url: URL): ParsedAuthParams {
  const query = url.searchParams;
  const hash = hashSearchParams(url.hash);

  const oauthError = query.get("error") ?? hash.get("error");
  if (oauthError) {
    return {
      kind: "oauth_error",
      error: oauthError,
      errorCode: query.get("error_code") ?? hash.get("error_code"),
      errorDescription:
        query.get("error_description") ?? hash.get("error_description"),
    };
  }

  const accessToken =
    hash.get("access_token") ?? query.get("access_token") ?? null;
  const refreshToken =
    hash.get("refresh_token") ?? query.get("refresh_token") ?? null;
  if (accessToken && refreshToken) {
    return { kind: "session", accessToken, refreshToken };
  }

  const code = query.get("code") ?? hash.get("code");
  if (code) {
    return { kind: "code", code };
  }

  const tokenHash =
    query.get("token_hash") ??
    hash.get("token_hash") ??
    query.get("token") ??
    hash.get("token");
  const otpType = parseEmailOtpType(query.get("type") ?? hash.get("type"));
  if (tokenHash && otpType) {
    return { kind: "otp", tokenHash, otpType };
  }

  return { kind: "none" };
}
