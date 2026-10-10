import { NextResponse, type NextRequest } from "next/server";
import {
  getGoogleCalendarConfig,
  resolveRedirectUri,
} from "@/lib/googleCalendar/config";
import { buildAuthorizationUrl } from "@/lib/googleCalendar/oauth";
import {
  OAUTH_STATE_COOKIE,
  createOAuthState,
  getVerifiedUserId,
  oauthStateCookieOptions,
  sealOAuthState,
} from "@/lib/googleCalendar/session";
import type { CalendarErrorCode } from "@/types/calendar";

export const dynamic = "force-dynamic";

function redirectHome(origin: string, error: CalendarErrorCode) {
  const url = new URL("/", origin);
  url.searchParams.set("calendar_error", error);
  return NextResponse.redirect(url);
}

/** Starts the Google Calendar OAuth flow for the signed-in Supabase user. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const config = getGoogleCalendarConfig();
  if (!config) {
    return redirectHome(origin, "not_configured");
  }

  const userId = await getVerifiedUserId();
  if (!userId) {
    return redirectHome(origin, "not_signed_in");
  }

  const redirectUri = resolveRedirectUri(config, origin);
  const oauthState = createOAuthState(userId, redirectUri);

  const response = NextResponse.redirect(
    buildAuthorizationUrl({
      config,
      redirectUri,
      state: oauthState.state,
      codeVerifier: oauthState.codeVerifier,
    }),
  );
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    sealOAuthState(oauthState, config.encryptionKey),
    oauthStateCookieOptions(),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
