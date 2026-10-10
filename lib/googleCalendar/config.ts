/**
 * SERVER ONLY. Google Calendar integration configuration (Mission 11).
 *
 * None of these env vars use the NEXT_PUBLIC_ prefix, so Next.js never
 * inlines them into client bundles. Import only from route handlers or
 * other server-only modules.
 */
import "server-only";

import {
  describeSupabaseSecretKeyProblem,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  SUPABASE_ANON_KEY_ENV,
  SUPABASE_URL_ENV,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

export const GOOGLE_CALENDAR_CLIENT_ID_ENV = "GOOGLE_CALENDAR_CLIENT_ID";
export const GOOGLE_CALENDAR_CLIENT_SECRET_ENV = "GOOGLE_CALENDAR_CLIENT_SECRET";
export const GOOGLE_CALENDAR_REDIRECT_URI_ENV = "GOOGLE_CALENDAR_REDIRECT_URI";
export const GOOGLE_TOKEN_ENCRYPTION_KEY_ENV = "GOOGLE_TOKEN_ENCRYPTION_KEY";

/** Minimum permission for Phase 1: free/busy only, no event details. */
export const GOOGLE_CALENDAR_FREEBUSY_SCOPE =
  "https://www.googleapis.com/auth/calendar.freebusy";

export const GOOGLE_CALENDAR_CALLBACK_PATH = "/api/google-calendar/callback";

export interface GoogleCalendarServerConfig {
  clientId: string;
  clientSecret: string;
  /** Optional explicit redirect URI; otherwise derived from request origin. */
  redirectUriOverride: string | null;
  encryptionKey: Buffer;
}

function readEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function decodeEncryptionKey(raw: string | null): Buffer | null {
  if (!raw) return null;
  try {
    const key = Buffer.from(raw, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

export function getGoogleCalendarConfig(): GoogleCalendarServerConfig | null {
  const clientId = readEnv(GOOGLE_CALENDAR_CLIENT_ID_ENV);
  const clientSecret = readEnv(GOOGLE_CALENDAR_CLIENT_SECRET_ENV);
  const encryptionKey = decodeEncryptionKey(
    readEnv(GOOGLE_TOKEN_ENCRYPTION_KEY_ENV),
  );

  if (!clientId || !clientSecret || !encryptionKey || !isSupabaseAdminConfigured()) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUriOverride: readEnv(GOOGLE_CALENDAR_REDIRECT_URI_ENV),
    encryptionKey,
  };
}

/**
 * Which settings are missing or invalid, by variable name only (never
 * values). For server logs; the browser only ever sees `configured: false`.
 */
export function describeGoogleCalendarConfigProblems(): string[] {
  const problems: string[] = [];
  if (!readEnv(GOOGLE_CALENDAR_CLIENT_ID_ENV)) {
    problems.push(`${GOOGLE_CALENDAR_CLIENT_ID_ENV} is not set`);
  }
  if (!readEnv(GOOGLE_CALENDAR_CLIENT_SECRET_ENV)) {
    problems.push(`${GOOGLE_CALENDAR_CLIENT_SECRET_ENV} is not set`);
  }
  const rawKey = readEnv(GOOGLE_TOKEN_ENCRYPTION_KEY_ENV);
  if (!rawKey) {
    problems.push(`${GOOGLE_TOKEN_ENCRYPTION_KEY_ENV} is not set`);
  } else if (!decodeEncryptionKey(rawKey)) {
    problems.push(`${GOOGLE_TOKEN_ENCRYPTION_KEY_ENV} must be base64 for 32 bytes`);
  }
  if (!getSupabasePublicConfig()) {
    problems.push(`${SUPABASE_URL_ENV} / ${SUPABASE_ANON_KEY_ENV} are not set`);
  }
  const secretKeyProblem = describeSupabaseSecretKeyProblem();
  if (secretKeyProblem) problems.push(secretKeyProblem);
  return problems;
}

export function resolveRedirectUri(
  config: GoogleCalendarServerConfig,
  origin: string,
): string {
  return (
    config.redirectUriOverride ??
    new URL(GOOGLE_CALENDAR_CALLBACK_PATH, origin).toString()
  );
}
