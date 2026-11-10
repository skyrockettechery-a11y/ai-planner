/**
 * Shared fixtures for the Mission 12 (Smart Daily Scheduling) tests.
 * Not a test file itself (no `.test.ts` suffix).
 */
import { DEFAULT_SCHEDULE_SETTINGS } from "@/lib/schedule/engine";
import type { BusyPeriod } from "@/types/calendar";
import type { ScheduleSettings } from "@/types/schedule";
import type { Quadrant, Task } from "@/types/task";

export function task(
  id: string,
  quadrant: Quadrant,
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: "",
    dueDate: null,
    quadrant,
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function busy(start: string, end: string): BusyPeriod {
  return { start, end };
}

export function settings(overrides: Partial<ScheduleSettings> = {}): ScheduleSettings {
  return { ...DEFAULT_SCHEDULE_SETTINGS, ...overrides };
}

/**
 * Runs `fn` with the process time zone set to `tz`, then restores it.
 * Node re-reads `process.env.TZ` on assignment, so local-time `Date`
 * methods follow the new zone immediately.
 */
export function withTimeZone<T>(tz: string, fn: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

/** Minimal `Response` stand-in factory for injected-fetch tests. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
