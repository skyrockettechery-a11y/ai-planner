import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getGoogleCalendarConfig } from "@/lib/googleCalendar/config";
import {
  GoogleOAuthError,
  exchangeAuthorizationCode,
  type ExchangedTokens,
  hasFreeBusyScope,
  revokeToken,
} from "@/lib/googleCalendar/oauth";
import {
  OAUTH_STATE_COOKIE,
  getVerifiedUserId,
  oauthStateCookieOptions,
  unsealOAuthState,
} from "@/lib/googleCalendar/session";
import { saveConnection } from "@/lib/googleCalendar/store";
import type { CalendarErrorCode } from "@/types/calendar";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function finish(origin: string, result: "connected" | CalendarErrorCode) {
  const url = new URL("/", origin);
  if (result === "connected") {
    url.searchParams.set("calendar", "connected");
  } else {
    url.searchParams.set("calendar_error", result);
  }
  const response = NextResponse.redirect(url);
  // The state cookie is single-use: always clear it.
  response.cookies.set(OAUTH_STATE_COOKIE, "", oauthStateCookieOptions(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** Google redirects here after consent. Exchanges the code server-side. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const config = getGoogleCalendarConfig();
  if (!config) {
    return finish(origin, "not_configured");
  }

  const googleError = params.get("error");
  if (googleError) {
    console.error("[google-calendar/callback] Google returned error:", googleError);
    return finish(
      origin,
      googleError === "access_denied" ? "access_denied" : "token_exchange_failed",
    );
  }

  const oauthState = unsealOAuthState(
    request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    config.encryptionKey,
  );
  const stateParam = params.get("state");
  if (!oauthState || !stateParam || !safeEqual(oauthState.state, stateParam)) {
    return finish(origin, "state_mismatch");
  }

  const userId = await getVerifiedUserId();
  if (!userId) {
    return finish(origin, "not_signed_in");
  }
  if (userId !== oauthState.userId) {
    return finish(origin, "user_mismatch");
  }

  const code = params.get("code");
  if (!code) {
    return finish(origin, "token_exchange_failed");
  }

  let tokens: ExchangedTokens;
  try {
    tokens = await exchangeAuthorizationCode({
      config,
      code,
      codeVerifier: oauthState.codeVerifier,
      redirectUri: oauthState.redirectUri,
    });
  } catch (error) {
    console.error(
      "[google-calendar/callback] Token exchange failed:",
      error instanceof GoogleOAuthError ? error.googleError ?? error.message : "unknown",
    );
    return finish(origin, "token_exchange_failed");
  }

  if (!hasFreeBusyScope(tokens.scope)) {
    if (tokens.refreshToken) await revokeToken(tokens.refreshToken);
    return finish(origin, "scope_denied");
  }
  if (!tokens.refreshToken) {
    return finish(origin, "no_refresh_token");
  }

  try {
    await saveConnection({
      userId,
      refreshToken: tokens.refreshToken,
      scope: tokens.scope,
      encryptionKey: config.encryptionKey,
    });
  } catch (error) {
    console.error(
      "[google-calendar/callback] Storing connection failed:",
      error instanceof Error ? error.message : "unknown",
    );
    await revokeToken(tokens.refreshToken);
    return finish(origin, "storage_error");
  }

  return finish(origin, "connected");
}
