import {
  CALENDAR_ERROR_MESSAGES,
  isCalendarErrorCode,
  type BusyPeriod,
  type CalendarErrorCode,
} from "@/types/calendar";
import type { ScheduleAvailability } from "@/types/schedule";

/**
 * Maps a free/busy result onto what the scheduler is allowed to claim
 * (Mission 12 / P2A).
 *
 * The rule this encodes: a failed calendar check never means "the calendar is
 * empty". Only `not-connected` is a calm, expected state; everything else is
 * `unavailable` and must be surfaced as a warning.
 */

export interface AvailabilityOutcome {
  availability: ScheduleAvailability;
  /** Copy to show the user; `null` only when there is nothing to report. */
  message: string | null;
}

export const NOT_CONNECTED_MESSAGE =
  "Google Calendar isn't connected, so this schedule doesn't check your calendar for conflicts.";

export const NOT_CONFIGURED_MESSAGE =
  "Google Calendar isn't set up on the server, so this schedule doesn't check your calendar for conflicts.";

export const UNKNOWN_AVAILABILITY_PREFIX =
  "Couldn't check your Google Calendar, so busy times are unknown — these blocks may overlap real events.";

export function availabilityFromErrorCode(
  code: CalendarErrorCode,
): AvailabilityOutcome {
  // No calendar was ever consulted in these states, so there is nothing to
  // warn about beyond saying so.
  if (code === "not_connected") {
    return { availability: "not-connected", message: NOT_CONNECTED_MESSAGE };
  }
  if (code === "not_configured") {
    return { availability: "not-connected", message: NOT_CONFIGURED_MESSAGE };
  }
  return {
    availability: "unavailable",
    message: `${UNKNOWN_AVAILABILITY_PREFIX} ${CALENDAR_ERROR_MESSAGES[code]}`,
  };
}

/** Outcome for a network/parse failure with no error code from the server. */
export function availabilityFromNetworkFailure(): AvailabilityOutcome {
  return availabilityFromErrorCode("unknown");
}

export interface BusyFetchResult extends AvailabilityOutcome {
  /** Busy periods; empty unless `availability` is `live`. */
  busy: BusyPeriod[];
  /** The server's error code, when the request failed with one. */
  errorCode: CalendarErrorCode | null;
}

function isBusyPeriod(value: unknown): value is BusyPeriod {
  if (!value || typeof value !== "object") return false;
  const period = value as Record<string, unknown>;
  return typeof period.start === "string" && typeof period.end === "string";
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Asks AI Planner's existing authenticated `/api/google-calendar/busy` route
 * for busy periods in `[start, end)`. No new endpoint and no new OAuth scope.
 *
 * Never throws. Any failure — an error status, a network error, or a
 * malformed body — yields `unavailable` (or `not-connected`) with no busy
 * periods, which callers must present as *unknown*, not as free time.
 */
export async function fetchScheduleBusy(
  window: { start: number; end: number },
  fetchImpl: FetchLike = fetch,
): Promise<BusyFetchResult> {
  const query = new URLSearchParams({
    timeMin: new Date(window.start).toISOString(),
    timeMax: new Date(window.end).toISOString(),
  });

  try {
    const response = await fetchImpl(`/api/google-calendar/busy?${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      let code: CalendarErrorCode = "unknown";
      try {
        const body = (await response.json()) as { error?: unknown };
        if (isCalendarErrorCode(body?.error)) code = body.error;
      } catch {
        // Non-JSON error body: keep "unknown".
      }
      return { busy: [], errorCode: code, ...availabilityFromErrorCode(code) };
    }

    const body = (await response.json()) as { busy?: unknown };
    if (!Array.isArray(body?.busy) || !body.busy.every(isBusyPeriod)) {
      return { busy: [], errorCode: null, ...availabilityFromNetworkFailure() };
    }
    return {
      busy: body.busy,
      errorCode: null,
      availability: "live",
      message: null,
    };
  } catch {
    return { busy: [], errorCode: null, ...availabilityFromNetworkFailure() };
  }
}
