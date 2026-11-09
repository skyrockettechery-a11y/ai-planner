import { buildDailyPlan } from "@/lib/dailyPlan";
import {
  freeIntervals,
  mergeIntervals,
  overlaps,
  roundUpToStep,
  toBusyIntervals,
  type Interval,
} from "@/lib/schedule/intervals";
import type { BusyPeriod } from "@/types/calendar";
import type { RecommendationMode } from "@/types/planPreferences";
import type {
  ScheduleAvailability,
  ScheduleBlock,
  ScheduleConflict,
  ScheduleDraft,
  ScheduleSettings,
  UnscheduledReason,
  UnscheduledTask,
} from "@/types/schedule";
import type { Task } from "@/types/task";

/**
 * Deterministic Smart Daily Scheduling engine (Mission 12 / P2A).
 *
 * Pure functions only: no React, no fetch, no Google SDK. Given the same
 * tasks, preferences, busy periods, settings and `now`, this module always
 * returns the same draft — which is what makes it independently testable and
 * what the UI relies on when it re-renders.
 *
 * Task prioritization is not reimplemented here: `buildDailyPlan` (Mission
 * 03/05) remains the single source of recommendation order and modes.
 */

export const MAX_SCHEDULED_TASKS = 3;
export const DEFAULT_TASK_DURATION_MINUTES = 30;
export const DEFAULT_BUFFER_MINUTES = 5;
export const DEFAULT_WINDOW_START_MINUTE = 9 * 60;
export const DEFAULT_WINDOW_END_MINUTE = 18 * 60;

/** Suggested start times snap to this grid so drafts read cleanly. */
export const SLOT_STEP_MINUTES = 5;

export const MIN_TASK_DURATION_MINUTES = 5;
export const MAX_TASK_DURATION_MINUTES = 8 * 60;
export const MAX_BUFFER_MINUTES = 60;
/** Shortest planning window the UI is allowed to request. */
export const MIN_WINDOW_MINUTES = 15;

const MINUTE_MS = 60_000;
const MINUTES_PER_DAY = 24 * 60;

export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  startMinute: DEFAULT_WINDOW_START_MINUTE,
  endMinute: DEFAULT_WINDOW_END_MINUTE,
  bufferMinutes: DEFAULT_BUFFER_MINUTES,
  defaultDurationMinutes: DEFAULT_TASK_DURATION_MINUTES,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

export function clampDurationMinutes(minutes: number): number {
  return clamp(minutes, MIN_TASK_DURATION_MINUTES, MAX_TASK_DURATION_MINUTES);
}

/** Brings user-entered settings into a usable range before any arithmetic. */
export function normalizeScheduleSettings(
  settings: ScheduleSettings,
): ScheduleSettings {
  const startMinute = clamp(
    settings.startMinute,
    0,
    MINUTES_PER_DAY - MIN_WINDOW_MINUTES,
  );
  return {
    startMinute,
    endMinute: clamp(
      settings.endMinute,
      startMinute + MIN_WINDOW_MINUTES,
      MINUTES_PER_DAY,
    ),
    bufferMinutes: clamp(settings.bufferMinutes, 0, MAX_BUFFER_MINUTES),
    defaultDurationMinutes: clampDurationMinutes(settings.defaultDurationMinutes),
  };
}

/**
 * The instant at `minuteOfDay` wall-clock time on the local day of `day`.
 *
 * Built from local date parts rather than by adding milliseconds to midnight,
 * so a daylight-saving shift earlier in the day cannot drag the working window
 * off its wall-clock anchor. A minute value of 1440 (midnight) rolls over into
 * the next local day, as `Date` normalizes out-of-range parts.
 */
export function localInstant(day: Date, minuteOfDay: number): number {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
    0,
    0,
  ).getTime();
}

export interface PlanningWindow extends Interval {
  /** Earliest instant a block may start: never in the past. */
  earliest: number;
}

/**
 * Today's planning window in the viewer's local time zone, with the lower
 * bound pushed forward so nothing is ever scheduled in the past.
 */
export function computePlanningWindow(
  now: Date,
  settings: ScheduleSettings,
): PlanningWindow {
  const normalized = normalizeScheduleSettings(settings);
  const start = localInstant(now, normalized.startMinute);
  const end = localInstant(now, normalized.endMinute);
  return {
    start,
    end,
    earliest: Math.max(start, roundUpToStep(now.getTime(), SLOT_STEP_MINUTES)),
  };
}

export interface GenerateScheduleInput {
  /** Task list; completed tasks are filtered out defensively. */
  tasks: readonly Task[];
  mode: RecommendationMode;
  /** Today's Plan dismissals — dismissed tasks are never scheduled. */
  dismissedIds: readonly string[];
  /** Busy periods from the primary Google Calendar. */
  busy: readonly BusyPeriod[];
  availability: ScheduleAvailability;
  now: Date;
  settings: ScheduleSettings;
  /** Per-task duration overrides in minutes; falls back to the default. */
  durations?: Readonly<Record<string, number>>;
}

/**
 * Packs the top recommended tasks into unoccupied time, earliest first.
 *
 * Placement is greedy in recommendation order and the cursor only moves
 * forward, so the resulting chronological order always matches priority
 * order. A task that cannot fit is reported in `unscheduled` instead of
 * displacing a higher-priority one.
 *
 * The buffer applies between scheduled task blocks, not between a block and a
 * calendar event — a block may start the moment a meeting ends.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleDraft {
  const settings = normalizeScheduleSettings(input.settings);
  const window = computePlanningWindow(input.now, settings);

  const activeTasks = input.tasks.filter((task) => !task.completed);
  const { recommendations } = buildDailyPlan(activeTasks, {
    mode: input.mode,
    dismissedIds: input.dismissedIds,
  });

  const busy = toBusyIntervals(input.busy, window);
  const free = freeIntervals({ start: window.earliest, end: window.end }, busy);

  const fallbackReason: UnscheduledReason =
    window.end <= window.earliest
      ? "window-passed"
      : free.length === 0
        ? "no-free-time"
        : "no-room";

  const blocks: ScheduleBlock[] = [];
  const unscheduled: UnscheduledTask[] = [];
  const bufferMs = settings.bufferMinutes * MINUTE_MS;
  let cursor = window.earliest;

  for (const item of recommendations.slice(0, MAX_SCHEDULED_TASKS)) {
    const durationMinutes = clampDurationMinutes(
      input.durations?.[item.task.id] ?? settings.defaultDurationMinutes,
    );
    const durationMs = durationMinutes * MINUTE_MS;

    let placement: Interval | null = null;
    for (const slot of free) {
      if (slot.end <= cursor) continue;
      const candidate = roundUpToStep(
        Math.max(slot.start, cursor),
        SLOT_STEP_MINUTES,
      );
      if (candidate + durationMs <= slot.end) {
        placement = { start: candidate, end: candidate + durationMs };
        break;
      }
    }

    if (!placement) {
      unscheduled.push({
        taskId: item.task.id,
        title: item.task.title,
        durationMinutes,
        reason: fallbackReason,
      });
      continue;
    }

    blocks.push({
      taskId: item.task.id,
      title: item.task.title,
      notes: item.task.notes,
      reason: item.reason,
      start: new Date(placement.start).toISOString(),
      end: new Date(placement.end).toISOString(),
      durationMinutes,
      adjusted: false,
    });
    cursor = placement.end + bufferMs;
  }

  return {
    windowStart: new Date(window.start).toISOString(),
    windowEnd: new Date(window.end).toISOString(),
    earliestStart: new Date(window.earliest).toISOString(),
    availability: input.availability,
    blocks,
    unscheduled,
  };
}

/** Applies a hand edit to one block, re-anchored to the draft's planning day. */
export function adjustBlock(
  block: ScheduleBlock,
  changes: { startMinute?: number; durationMinutes?: number },
  dayAnchor: Date,
): ScheduleBlock {
  const durationMinutes = clampDurationMinutes(
    changes.durationMinutes ?? block.durationMinutes,
  );
  const start =
    changes.startMinute === undefined
      ? Date.parse(block.start)
      : localInstant(dayAnchor, clamp(changes.startMinute, 0, MINUTES_PER_DAY - 1));

  return {
    ...block,
    start: new Date(start).toISOString(),
    end: new Date(start + durationMinutes * MINUTE_MS).toISOString(),
    durationMinutes,
    adjusted: true,
  };
}

export interface ConflictInput {
  blocks: readonly ScheduleBlock[];
  busy: readonly BusyPeriod[];
  availability: ScheduleAvailability;
  now: Date;
  windowStart: string;
  windowEnd: string;
}

/**
 * Problems with the current blocks, recomputed after every adjustment.
 *
 * Busy-time overlaps are only reported when availability is `live`: implying
 * "no calendar conflict" from a failed calendar check would be worse than
 * saying nothing, so unknown availability is warned about separately.
 */
export function findScheduleConflicts(input: ConflictInput): ScheduleConflict[] {
  const windowStart = Date.parse(input.windowStart);
  const windowEnd = Date.parse(input.windowEnd);
  const nowMs = input.now.getTime();

  const entries = input.blocks
    .map((block) => ({
      block,
      interval: {
        start: Date.parse(block.start),
        end: Date.parse(block.end),
      },
    }))
    .filter(
      (entry) =>
        !Number.isNaN(entry.interval.start) && !Number.isNaN(entry.interval.end),
    )
    .sort((a, b) => a.interval.start - b.interval.start);

  const busy =
    input.availability === "live"
      ? mergeIntervals(toBusyIntervals(input.busy))
      : [];

  const conflicts: ScheduleConflict[] = [];
  for (const { block, interval } of entries) {
    if (interval.start < nowMs) {
      conflicts.push({
        taskId: block.taskId,
        kind: "past",
        message: "Starts in the past.",
      });
    }

    if (
      (!Number.isNaN(windowStart) && interval.start < windowStart) ||
      (!Number.isNaN(windowEnd) && interval.end > windowEnd)
    ) {
      conflicts.push({
        taskId: block.taskId,
        kind: "outside-window",
        message: "Falls outside your planning window.",
      });
    }

    const clash = entries.find(
      (other) =>
        other.block.taskId !== block.taskId && overlaps(interval, other.interval),
    );
    if (clash) {
      conflicts.push({
        taskId: block.taskId,
        kind: "overlaps-block",
        message: `Overlaps "${clash.block.title}".`,
      });
    }

    if (busy.some((period) => overlaps(interval, period))) {
      conflicts.push({
        taskId: block.taskId,
        kind: "overlaps-busy",
        message: "Overlaps a busy time on your primary calendar.",
      });
    }
  }

  return conflicts;
}

/** Groups conflicts by task id for per-block rendering. */
export function conflictsByTask(
  conflicts: readonly ScheduleConflict[],
): Record<string, ScheduleConflict[]> {
  const grouped: Record<string, ScheduleConflict[]> = {};
  for (const conflict of conflicts) {
    (grouped[conflict.taskId] ??= []).push(conflict);
  }
  return grouped;
}

export const UNSCHEDULED_REASON_MESSAGES: Record<UnscheduledReason, string> = {
  "window-passed":
    "Today's planning window has already ended — extend the end time to schedule this.",
  "no-free-time": "Your primary calendar is busy for the whole remaining window.",
  "no-room":
    "Doesn't fit in the open time left — shorten it or widen the window.",
};
