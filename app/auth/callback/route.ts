import { NextResponse } from "next/server";
import type { AuthErrorCode } from "@/lib/auth/errors";
import { completeAuthFromParsed } from "@/lib/auth/completeAuth";
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
  const next = searchParams.get("next") ?? "/";
  const paramNames = getAuthParamNames(requestUrl);

  if (!getSupabasePublicConfig()) {
    console.error("[auth/callback] Supabase is not configured");
    return redirectWithError(origin, "not_configured", next, paramNames);
  }

  const parsed = parseAuthParamsFromUrl(requestUrl);

  try {
    const supabase = await createServerSupabaseClient();
    const result = await completeAuthFromParsed(supabase, parsed);

    if (result.ok) {
      return NextResponse.redirect(new URL(next, origin));
    }

    console.error(
      "[auth/callback] Auth failed:",
      result.errorCode,
      "query keys:",
      paramNames.query.join(",") || "(none)",
      "hash keys:",
      paramNames.hash.join(",") || "(none)",
    );
    return redirectWithError(origin, result.errorCode, next, paramNames);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[auth/callback] Unexpected error:", message);
    return redirectWithError(origin, "exchange_failed", next, paramNames);
  }
}
