/**
 * SERVER ONLY. Google OAuth 2.0 helpers for the Calendar connection (Mission 11).
 *
 * Separate from Supabase Auth: this never signs the user in to AI Planner,
 * it only grants AI Planner free/busy access to the user's Google Calendar.
 */
import "server-only";

import { createHash } from "node:crypto";
import {
  GOOGLE_CALENDAR_FREEBUSY_SCOPE,
  type GoogleCalendarServerConfig,
} from "@/lib/googleCalendar/config";
import { GoogleOAuthError } from "@/lib/googleCalendar/errors";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthorizationUrl(params: {
  config: GoogleCalendarServerConfig;
  redirectUri: string;
  state: string;
  codeVerifier: string;
}): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", params.config.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_FREEBUSY_SCOPE);
  // offline + consent so Google returns a refresh token on every connect.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", pkceChallenge(params.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

async function postTokenEndpoint(
  body: Record<string, string>,
): Promise<GoogleTokenResponse> {
  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
      cache: "no-store",
    });
  } catch {
    throw new GoogleOAuthError("Google token endpoint unreachable", null, 0);
  }

  let json: GoogleTokenResponse;
  try {
    json = (await response.json()) as GoogleTokenResponse;
  } catch {
    json = {};
  }

  if (!response.ok || json.error) {
    // Never log or rethrow token values; only Google's error code.
    throw new GoogleOAuthError(
      `Google token endpoint returned ${response.status}`,
      json.error ?? null,
      response.status,
    );
  }

  return json;
}

export interface ExchangedTokens {
  refreshToken: string | null;
  scope: string;
}

export async function exchangeAuthorizationCode(params: {
  config: GoogleCalendarServerConfig;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<ExchangedTokens> {
  const json = await postTokenEndpoint({
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
  });

  return {
    refreshToken: json.refresh_token ?? null,
    scope: json.scope ?? "",
  };
}

export async function refreshAccessToken(params: {
  config: GoogleCalendarServerConfig;
  refreshToken: string;
}): Promise<string> {
  const json = await postTokenEndpoint({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
  });

  if (!json.access_token) {
    throw new GoogleOAuthError("Google returned no access token", null, 200);
  }
  return json.access_token;
}

/** Best-effort revocation; failures are ignored (token may already be revoked). */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
      cache: "no-store",
    });
  } catch {
    // Ignore network errors on revoke.
  }
}

export function hasFreeBusyScope(scope: string): boolean {
  return scope.split(/\s+/).includes(GOOGLE_CALENDAR_FREEBUSY_SCOPE);
}
