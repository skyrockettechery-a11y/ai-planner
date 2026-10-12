import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  describeAuthCookies,
  supabaseAuthStorageKey,
} from "@/lib/auth/authCookies";
import type { AuthErrorCode } from "@/lib/auth/errors";
import { completeAuthFromParsed } from "@/lib/auth/completeAuth";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  AUTH_DEBUG_HASH_PARAM,
  AUTH_DEBUG_PATH_PARAM,
  AUTH_DEBUG_QUERY_PARAM,
  getAuthParamNames,
  parseAuthParamsFromUrl,
} from "@/lib/auth/parseAuthParams";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function redirectWithError(
  origin: string,
  code: AuthErrorCode,
  next: string,
  debug?: { path: string; query: string[]; hash: string[] },
) {
  const url = new URL(next, origin);
  url.searchParams.set("auth_error", code);
  if (debug) {
    url.searchParams.set(AUTH_DEBUG_PATH_PARAM, debug.path);
    if (debug.query.length > 0) {
      url.searchParams.set(AUTH_DEBUG_QUERY_PARAM, debug.query.join(","));
    }
    if (debug.hash.length > 0) {
      url.searchParams.set(AUTH_DEBUG_HASH_PARAM, debug.hash.join(","));
    }
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const next = safeNextPath(searchParams.get("next"));
  const paramNames = getAuthParamNames(requestUrl);

  const config = getSupabasePublicConfig();
  if (!config) {
    console.error("[auth/callback] Supabase is not configured");
    return redirectWithError(origin, "not_configured", next, paramNames);
  }

  const parsed = parseAuthParamsFromUrl(requestUrl);

  try {
    const cookieNames = (await cookies()).getAll().map((cookie) => cookie.name);
    const supabase = await createServerSupabaseClient();
    const result = await completeAuthFromParsed(supabase, parsed);

    if (result.ok) {
      return NextResponse.redirect(new URL(next, origin));
    }

    const diagnostics = describeAuthCookies(
      cookieNames,
      supabaseAuthStorageKey(config.url),
    );
    // Presence flags and parameter names only — never cookie or code values.
    console.error(
      "[auth/callback] Auth failed:",
      result.errorCode,
      "query keys:",
      paramNames.query.join(",") || "(none)",
      "hash keys:",
      paramNames.hash.join(",") || "(none)",
      "code verifier cookie:",
      diagnostics.hadCodeVerifierCookie ? "present" : "missing",
      "existing session cookie:",
      diagnostics.hadSessionCookie ? "present" : "none",
    );
    return redirectWithError(origin, result.errorCode, next, paramNames);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[auth/callback] Unexpected error:", message);
    return redirectWithError(origin, "exchange_failed", next, paramNames);
  }
}
