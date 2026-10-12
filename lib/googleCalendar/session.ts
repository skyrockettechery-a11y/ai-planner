/**
 * SERVER ONLY. Request helpers shared by /api/google-calendar/* routes (Mission 11).
 */
import "server-only";

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { randomToken, seal, unseal } from "@/lib/googleCalendar/crypto";
import type { CalendarErrorCode } from "@/types/calendar";

/**
 * Returns the Supabase user id from the verified session cookie.
 * `getUser()` validates the JWT with Supabase Auth (not just decoding it).
 */
export async function getVerifiedUserId(): Promise<string | null> {
  if (!getSupabasePublicConfig()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export function jsonError(code: CalendarErrorCode, status: number) {
  return NextResponse.json(
    { error: code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function jsonOk<T>(body: T) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

// --- OAuth state cookie -------------------------------------------------

export const OAUTH_STATE_COOKIE = "gcal_oauth_state";
const OAUTH_STATE_CONTEXT = "google-calendar-oauth-state";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export interface OAuthState {
  state: string;
  codeVerifier: string;
  userId: string;
  redirectUri: string;
  createdAt: number;
}

export function createOAuthState(
  userId: string,
  redirectUri: string,
): OAuthState {
  return {
    state: randomToken(32),
    codeVerifier: randomToken(48),
    userId,
    redirectUri,
    createdAt: Date.now(),
  };
}

export function oauthStateCookieOptions(maxAge = OAUTH_STATE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax is required: Google's redirect back is a cross-site top-level GET.
    sameSite: "lax" as const,
    path: "/api/google-calendar",
    maxAge,
  };
}

export function sealOAuthState(state: OAuthState, key: Buffer): string {
  return seal(JSON.stringify(state), key, OAUTH_STATE_CONTEXT);
}

export function unsealOAuthState(
  value: string | undefined,
  key: Buffer,
): OAuthState | null {
  if (!value) return null;
  const json = unseal(value, key, OAUTH_STATE_CONTEXT);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as OAuthState;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.redirectUri !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.createdAt > OAUTH_STATE_MAX_AGE_SECONDS * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
