/**
 * Client-safe Google Calendar types (Mission 11).
 * Nothing in here may contain tokens or secrets.
 */

export type CalendarRange = "today" | "tomorrow" | "week";

export interface BusyPeriod {
  /** ISO 8601 start time */
  start: string;
  /** ISO 8601 end time */
  end: string;
}

export interface CalendarStatus {
  /** Server has all Google Calendar env vars configured. */
  configured: boolean;
  /** Signed-in user has a stored Google Calendar connection. */
  connected: boolean;
  connectedAt: string | null;
}

export interface BusyResponse {
  timeMin: string;
  timeMax: string;
  busy: BusyPeriod[];
}

/** Error codes returned by /api/google-calendar/* and the callback redirect. */
export type CalendarErrorCode =
  | "not_configured"
  | "not_signed_in"
  | "not_connected"
  | "reauth_required"
  | "access_denied"
  | "scope_denied"
  | "state_mismatch"
  | "user_mismatch"
  | "no_refresh_token"
  | "token_exchange_failed"
  | "invalid_range"
  | "google_error"
  | "storage_error"
  | "unknown";

export const CALENDAR_ERROR_MESSAGES: Record<CalendarErrorCode, string> = {
  not_configured:
    "Google Calendar isn't configured on the server yet.",
  not_signed_in: "Sign in to AI Planner before connecting Google Calendar.",
  not_connected: "Google Calendar isn't connected.",
  reauth_required:
    "Google Calendar access expired or was revoked. Please connect again.",
  access_denied: "Google Calendar access was not granted.",
  scope_denied:
    "Free/busy permission wasn't granted. Connect again and allow calendar availability access.",
  state_mismatch:
    "The Google sign-in session expired or didn't match. Please try connecting again.",
  user_mismatch:
    "You signed in as a different AI Planner user during connection. Please try again.",
  no_refresh_token:
    "Google didn't return long-lived access. Remove AI Planner from your Google account permissions and connect again.",
  token_exchange_failed:
    "Couldn't complete Google Calendar connection. Please try again.",
  invalid_range: "That time range isn't supported.",
  google_error: "Google Calendar didn't respond as expected. Try again shortly.",
  storage_error: "Couldn't save the Google Calendar connection. Please try again.",
  unknown: "Something went wrong with Google Calendar. Please try again.",
};

export function isCalendarErrorCode(value: unknown): value is CalendarErrorCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(CALENDAR_ERROR_MESSAGES, value)
  );
}
