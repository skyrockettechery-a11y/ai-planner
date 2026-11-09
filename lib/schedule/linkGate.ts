import { findScheduleConflicts } from "@/lib/schedule/engine";
import type { BusyPeriod } from "@/types/calendar";
import type {
  ScheduleAvailability,
  ScheduleBlock,
  ScheduleConflict,
} from "@/types/schedule";

/**
 * When a block may be handed to Google Calendar, and how much the schedule
 * can be trusted (Mission 12 / P2A).
 *
 * "Add to Google Calendar" is a one-click handoff, so it is only offered for
 * a block with no known problem *at the moment it is evaluated*. Callers
 * evaluate it with a fresh `now` both when rendering and again at click
 * time, so a block that has drifted into the past is never handed off.
 */

export type AvailabilityTrustLevel = "checked" | "not-checked" | "unknown";

export interface AvailabilityTrust {
  level: AvailabilityTrustLevel;
  /** Short badge text. */
  label: string;
}

export function describeAvailabilityTrust(
  availability: ScheduleAvailability,
): AvailabilityTrust {
  switch (availability) {
    case "live":
      return { level: "checked", label: "Checked against primary calendar" };
    case "not-connected":
      return { level: "not-checked", label: "Calendar not checked" };
    case "unavailable":
      return { level: "unknown", label: "Calendar check failed — busy times unknown" };
  }
}

export type CalendarLinkGate =
  | {
      enabled: true;
      /** Shown next to the link when the calendar wasn't checked. */
      caution: string | null;
    }
  | {
      enabled: false;
      /** Why the link is unavailable and what to do about it. */
      reason: string;
    };

export const LINK_BLOCKED_PAST =
  "Starts before now — move it later to add it to Google Calendar.";
export const LINK_BLOCKED_CONFLICT =
  "Resolve the warning above to add this to Google Calendar.";
export const LINK_CAUTION_NOT_CHECKED =
  "Not checked against your calendar — this time may clash with events.";
export const LINK_CAUTION_UNKNOWN =
  "Calendar check failed — this time may clash with events.";

/** Gate from a block's already-computed conflicts. */
export function calendarLinkGateFromConflicts(
  conflicts: readonly ScheduleConflict[],
  availability: ScheduleAvailability,
): CalendarLinkGate {
  if (conflicts.some((conflict) => conflict.kind === "past")) {
    return { enabled: false, reason: LINK_BLOCKED_PAST };
  }
  if (conflicts.length > 0) {
    return { enabled: false, reason: LINK_BLOCKED_CONFLICT };
  }
  return {
    enabled: true,
    caution:
      availability === "live"
        ? null
        : availability === "not-connected"
          ? LINK_CAUTION_NOT_CHECKED
          : LINK_CAUTION_UNKNOWN,
  };
}

export interface CalendarLinkGateInput {
  taskId: string;
  /** All blocks currently shown (block/block overlaps need the full set). */
  blocks: readonly ScheduleBlock[];
  busy: readonly BusyPeriod[];
  availability: ScheduleAvailability;
  windowStart: string;
  windowEnd: string;
  /** Evaluate against this instant — pass a fresh `new Date()` at click time. */
  now: Date;
}

/** Recomputes one block's conflicts at `now` and gates its link. */
export function getCalendarLinkGate(input: CalendarLinkGateInput): CalendarLinkGate {
  if (!input.blocks.some((block) => block.taskId === input.taskId)) {
    return { enabled: false, reason: LINK_BLOCKED_CONFLICT };
  }
  const conflicts = findScheduleConflicts({
    blocks: input.blocks,
    busy: input.busy,
    availability: input.availability,
    now: input.now,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
  }).filter((conflict) => conflict.taskId === input.taskId);
  return calendarLinkGateFromConflicts(conflicts, input.availability);
}
