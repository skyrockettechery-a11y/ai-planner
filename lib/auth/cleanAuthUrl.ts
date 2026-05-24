import {
  AUTH_DEBUG_HASH_PARAM,
  AUTH_DEBUG_PATH_PARAM,
  AUTH_DEBUG_QUERY_PARAM,
  AUTH_URL_DEBUG_STORAGE_KEY,
} from "@/lib/auth/parseAuthParams";
import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";

const QUERY_KEYS_TO_REMOVE = [
  AUTH_ERROR_PARAM,
  AUTH_DEBUG_QUERY_PARAM,
  AUTH_DEBUG_HASH_PARAM,
  AUTH_DEBUG_PATH_PARAM,
  "error",
  "error_code",
  "error_description",
  "code",
  "token",
  "token_hash",
  "type",
  "access_token",
  "refresh_token",
];

const HASH_KEYS_TO_REMOVE = new Set([
  "error",
  "error_code",
  "error_description",
  "sb",
  "code",
  "token",
  "token_hash",
  "type",
  "access_token",
  "refresh_token",
]);

function hashSearchParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return new URLSearchParams();
  return new URLSearchParams(raw);
}

export function clearStoredAuthDebug(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_URL_DEBUG_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Remove auth error/debug and consumed sign-in params from the URL (no reload). */
export function cleanAuthParamsFromUrl(href?: string): void {
  if (typeof window === "undefined") return;

  const url = new URL(href ?? window.location.href);
  let changed = false;

  for (const key of QUERY_KEYS_TO_REMOVE) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  const hashParams = hashSearchParams(url.hash);
  const remainingHash = new URLSearchParams();
  for (const [key, value] of hashParams.entries()) {
    if (!HASH_KEYS_TO_REMOVE.has(key)) {
      remainingHash.set(key, value);
    } else {
      changed = true;
    }
  }

  const nextHash = remainingHash.toString();
  const nextHashFragment = nextHash ? `#${nextHash}` : "";
  if (url.hash !== nextHashFragment) {
    url.hash = nextHashFragment;
    changed = true;
  }

  if (changed) {
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
  }
}

export function dismissAuthFeedback(): void {
  clearStoredAuthDebug();
  cleanAuthParamsFromUrl();
}
