/**
 * SERVER ONLY. Google error types and classification (Mission 11).
 *
 * Separates failures the user can fix by reconnecting (authorization) from
 * ones they can't: server/Google Cloud misconfiguration, quota/rate limits,
 * and transient Google outages. Only authorization failures drop the stored
 * connection.
 */
import "server-only";

import type { CalendarErrorCode } from "@/types/calendar";

export type GoogleFailureKind =
  | "authorization"
  | "configuration"
  | "rate_limited"
  | "unavailable"
  | "other";

/** Error from Google's OAuth token endpoint. */
export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    /** Google's `error` field, e.g. "invalid_grant". */
    readonly googleError: string | null,
    /** HTTP status; 0 when the request never got a response. */
    readonly status: number,
  ) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

/** Error from a Google Calendar API call. */
export class GoogleApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the request never got a response. */
    readonly status: number,
    /** `reason` values from Google's error body (errors[] and details[]). */
    readonly reasons: string[],
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

/** OAuth `error` codes meaning our client registration/config is wrong. */
const OAUTH_CONFIGURATION_ERRORS = new Set([
  "invalid_client",
  "unauthorized_client",
  "redirect_uri_mismatch",
  "invalid_request",
]);

/** Calendar API reasons meaning the token lacks access (reconnect fixes it). */
const API_AUTHORIZATION_REASONS = new Set([
  "authError",
  "insufficientPermissions",
  "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
]);

/** Calendar API reasons meaning the Google Cloud project isn't set up. */
const API_CONFIGURATION_REASONS = new Set([
  "accessNotConfigured",
  "SERVICE_DISABLED",
  "projectNotLinked",
]);

const API_RATE_LIMIT_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "dailyLimitExceeded",
  "quotaExceeded",
  "RATE_LIMIT_EXCEEDED",
]);

const API_UNAVAILABLE_REASONS = new Set(["backendError", "internalError"]);

function isServerSideStatus(status: number): boolean {
  return status === 0 || status >= 500;
}

export function classifyOAuthError(error: unknown): GoogleFailureKind {
  if (!(error instanceof GoogleOAuthError)) return "other";
  // invalid_grant: refresh token revoked/expired, or user removed access.
  if (error.googleError === "invalid_grant") return "authorization";
  if (error.googleError && OAUTH_CONFIGURATION_ERRORS.has(error.googleError)) {
    return "configuration";
  }
  if (error.status === 429) return "rate_limited";
  if (isServerSideStatus(error.status)) return "unavailable";
  return "other";
}

export function classifyApiError(error: unknown): GoogleFailureKind {
  if (!(error instanceof GoogleApiError)) return "other";
  const has = (set: Set<string>) => error.reasons.some((r) => set.has(r));

  // Order matters: Google reports quota and disabled-API problems as 403,
  // the same status as a missing scope.
  if (error.status === 429 || has(API_RATE_LIMIT_REASONS)) return "rate_limited";
  if (has(API_CONFIGURATION_REASONS)) return "configuration";
  if (error.status === 401 || has(API_AUTHORIZATION_REASONS)) {
    return "authorization";
  }
  if (isServerSideStatus(error.status) || has(API_UNAVAILABLE_REASONS)) {
    return "unavailable";
  }
  return "other";
}

const FAILURE_RESPONSES: Record<
  GoogleFailureKind,
  { code: CalendarErrorCode; status: number }
> = {
  authorization: { code: "reauth_required", status: 401 },
  configuration: { code: "google_config_error", status: 503 },
  rate_limited: { code: "google_rate_limited", status: 429 },
  unavailable: { code: "google_unavailable", status: 503 },
  other: { code: "google_error", status: 502 },
};

export function failureResponse(kind: GoogleFailureKind) {
  return FAILURE_RESPONSES[kind];
}

/** Safe log detail: status and Google reason codes only, never tokens. */
export function describeGoogleError(error: unknown): string {
  if (error instanceof GoogleOAuthError) {
    return `oauth status=${error.status} error=${error.googleError ?? "none"}`;
  }
  if (error instanceof GoogleApiError) {
    return `api status=${error.status} reasons=${error.reasons.join(",") || "none"}`;
  }
  return error instanceof Error ? error.name : "unknown";
}
