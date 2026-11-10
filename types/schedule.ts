/**
 * Client-safe Smart Daily Scheduling types (Mission 12 / P2A).
 *
 * A schedule is a *draft*: suggested time blocks that exist only in memory for
 * the current page session. Nothing here is written to Supabase, localStorage,
 * or Google Calendar.
 */

/** User-controlled planning window and spacing. All minutes are local wall-clock. */
export interface ScheduleSettings {
  /** Minutes from local midnight when the planning window opens (default 9:00). */
  startMinute: number;
  /** Minutes from local midnight when the planning window closes (default 18:00). */
  endMinute: number;
  /** Gap kept between two consecutive scheduled task blocks. */
  bufferMinutes: number;
  /** Duration used for a task the user hasn't adjusted. */
  defaultDurationMinutes: number;
}

/**
 * How much trust the draft can place in the busy data it was built from.
 *
 * - `live` — free/busy was fetched successfully from the primary calendar.
 * - `not-connected` — Google Calendar isn't connected (or isn't configured);
 *   no calendar was consulted.
 * - `unavailable` — a calendar check was attempted and failed. Busy time is
 *   *unknown*, never assumed empty.
 */
export type ScheduleAvailability = "live" | "not-connected" | "unavailable";

/** A suggested block of time for one task. Not a calendar event. */
export interface ScheduleBlock {
  taskId: string;
  /** 1-based position of the task in Today's Plan (1 = highest priority). */
  rank: number;
  title: string;
  /** Task notes, carried through to the Google Calendar prefill. */
  notes: string;
  /** Why Today's Plan recommended this task. */
  reason: string;
  /** ISO 8601 start instant. */
  start: string;
  /** ISO 8601 end instant. */
  end: string;
  durationMinutes: number;
  /** True once the user has moved or resized this block by hand. */
  adjusted: boolean;
}

/**
 * Why a recommended task could not be placed.
 *
 * - `window-passed` — the planning window has already ended for today.
 * - `no-free-time` — busy times cover the whole remaining window.
 * - `too-long` — no single open stretch is long enough for this task.
 * - `no-room` — it would fit, but higher-priority tasks took the open time.
 */
export type UnscheduledReason =
  | "window-passed"
  | "no-free-time"
  | "too-long"
  | "no-room";

/** A recommended task the engine could not place. */
export interface UnscheduledTask {
  taskId: string;
  /** 1-based position of the task in Today's Plan. */
  rank: number;
  title: string;
  durationMinutes: number;
  reason: UnscheduledReason;
}

/** The complete result of one engine run. Deterministic for a given input. */
export interface ScheduleDraft {
  /** ISO start of the planning window actually used. */
  windowStart: string;
  /** ISO end of the planning window actually used. */
  windowEnd: string;
  /** ISO of the earliest instant the engine was allowed to schedule at. */
  earliestStart: string;
  availability: ScheduleAvailability;
  /** Placed blocks in chronological order. */
  blocks: ScheduleBlock[];
  /** Tasks that could not be placed, in priority order. */
  unscheduled: UnscheduledTask[];
}

export type ScheduleConflictKind =
  | "past"
  | "outside-window"
  | "overlaps-block"
  | "overlaps-busy";

/** A problem with a block, produced after the user adjusts a draft. */
export interface ScheduleConflict {
  taskId: string;
  kind: ScheduleConflictKind;
  message: string;
}
