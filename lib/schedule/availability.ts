import {
  CALENDAR_ERROR_MESSAGES,
  type CalendarErrorCode,
} from "@/types/calendar";
import type { ScheduleAvailability } from "@/types/schedule";

/**
 * Maps a free/busy failure onto what the scheduler is allowed to claim
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

/** States where no calendar was ever consulted, so there is nothing to warn about. */
const NOT_CONNECTED_CODES: readonly CalendarErrorCode[] = [
  "not_connected",
  "not_configured",
];

export const NOT_CONNECTED_MESSAGE =
  "Google Calendar isn't connected, so this schedule doesn't check your calendar for conflicts.";

export const UNKNOWN_AVAILABILITY_PREFIX =
  "Couldn't check your Google Calendar, so busy times are unknown — these blocks may overlap real events.";

export function availabilityFromErrorCode(
  code: CalendarErrorCode,
): AvailabilityOutcome {
  if (NOT_CONNECTED_CODES.includes(code)) {
    return { availability: "not-connected", message: NOT_CONNECTED_MESSAGE };
  }
  return {
    availability: "unavailable",
    message: `${UNKNOWN_AVAILABILITY_PREFIX} ${CALENDAR_ERROR_MESSAGES[code]}`,
  };
}

/** Outcome for a network/parse failure with no error code from the server. */
export function availabilityFromNetworkFailure(): AvailabilityOutcome {
  return {
    availability: "unavailable",
    message: `${UNKNOWN_AVAILABILITY_PREFIX} ${CALENDAR_ERROR_MESSAGES.unknown}`,
  };
}
