import type { BusyPeriod } from "@/types/calendar";

/**
 * Pure interval arithmetic over absolute epoch milliseconds (Mission 12).
 *
 * Working in epoch ms — never in wall-clock minutes — is what makes the
 * scheduler correct across time zones and daylight-saving transitions: a
 * busy period from Google and a local working window are both reduced to
 * instants before they are ever compared.
 */

export interface Interval {
  /** Epoch ms, inclusive. */
  start: number;
  /** Epoch ms, exclusive. */
  end: number;
}

/** Sorts by start then end, and merges every overlapping or touching pair. */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals]
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/**
 * Parses free/busy periods into merged intervals clipped to `bounds`.
 * Unparseable or zero-length periods are dropped rather than guessed at.
 */
export function toBusyIntervals(
  periods: readonly BusyPeriod[],
  bounds?: Interval,
): Interval[] {
  const parsed: Interval[] = [];
  for (const period of periods) {
    const start = Date.parse(period.start);
    const end = Date.parse(period.end);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    const clipped = bounds
      ? {
          start: Math.max(start, bounds.start),
          end: Math.min(end, bounds.end),
        }
      : { start, end };
    if (clipped.end > clipped.start) parsed.push(clipped);
  }
  return mergeIntervals(parsed);
}

/**
 * The parts of `bounds` not covered by `busy`, in chronological order.
 * `busy` does not need to be sorted or merged.
 */
export function freeIntervals(
  bounds: Interval,
  busy: readonly Interval[],
): Interval[] {
  if (bounds.end <= bounds.start) return [];

  const free: Interval[] = [];
  let cursor = bounds.start;
  for (const block of mergeIntervals(busy)) {
    if (block.end <= cursor) continue;
    if (block.start >= bounds.end) break;
    if (block.start > cursor) {
      free.push({ start: cursor, end: Math.min(block.start, bounds.end) });
    }
    cursor = Math.max(cursor, block.end);
    if (cursor >= bounds.end) break;
  }
  if (cursor < bounds.end) free.push({ start: cursor, end: bounds.end });

  return free;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Rounds an instant up to the next multiple of `stepMinutes`. */
export function roundUpToStep(timeMs: number, stepMinutes: number): number {
  const step = stepMinutes * 60_000;
  if (step <= 0) return timeMs;
  return Math.ceil(timeMs / step) * step;
}
