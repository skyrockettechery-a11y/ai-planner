/**
 * Mission 12 (P2A) — generating against the time *after* the busy fetch.
 *
 * Regression for GPT review: the hook used to capture `now` before awaiting
 * the calendar, so a slow response could yield blocks that already started,
 * with the "past" check evaluated at the same stale instant.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BusyFetchResult } from "@/lib/schedule/availability";
import { findScheduleConflicts, type PlanningWindow } from "@/lib/schedule/engine";
import { buildFreshSchedule } from "@/lib/schedule/freshSchedule";
import { getCalendarLinkGate } from "@/lib/schedule/linkGate";
import { busy, settings, task } from "./helpers/scheduleFixtures";

process.env.TZ = "UTC";

const TASKS = [
  task("a", "important-urgent"),
  task("b", "important-not-urgent"),
  task("c", "not-important-urgent"),
];

const LIVE_EMPTY: BusyFetchResult = {
  busy: [],
  errorCode: null,
  availability: "live",
  message: null,
};

/** A clock that returns the given instants in order (the last repeats). */
function scriptedClock(...isoTimes: string[]) {
  let index = 0;
  return () => new Date(isoTimes[Math.min(index++, isoTimes.length - 1)]);
}

function recordingFetch(results: BusyFetchResult[] = [LIVE_EMPTY]) {
  const windows: PlanningWindow[] = [];
  const fetchBusy = async (window: PlanningWindow) => {
    windows.push(window);
    return results[Math.min(windows.length - 1, results.length - 1)];
  };
  return { fetchBusy, windows };
}

function input(clock: () => Date, fetchBusy: (w: PlanningWindow) => Promise<BusyFetchResult>) {
  return {
    tasks: TASKS,
    mode: "auto" as const,
    dismissedIds: [],
    settings: settings(),
    fetchBusy,
    clock,
  };
}

describe("buildFreshSchedule", () => {
  it("places blocks after the time the calendar responded, not when it was asked", async () => {
    // Asked at 09:58; the response arrives at 10:07.
    const clock = scriptedClock("2026-11-10T09:58:00Z", "2026-11-10T10:07:00Z");
    const { fetchBusy, windows } = recordingFetch();
    const { draft, now } = await buildFreshSchedule(input(clock, fetchBusy));

    assert.equal(windows.length, 1);
    assert.equal(now.toISOString(), "2026-11-10T10:07:00.000Z");
    assert.equal(draft.earliestStart, "2026-11-10T10:10:00.000Z");
    assert.equal(draft.blocks[0].start, "2026-11-10T10:10:00.000Z");
    for (const block of draft.blocks) {
      assert.ok(Date.parse(block.start) >= now.getTime(), block.taskId);
    }
    // Evaluated at the same instant, nothing is flagged and every link is offered.
    assert.deepEqual(
      findScheduleConflicts({
        blocks: draft.blocks,
        busy: [],
        availability: draft.availability,
        now,
        windowStart: draft.windowStart,
        windowEnd: draft.windowEnd,
      }),
      [],
    );
    for (const block of draft.blocks) {
      assert.equal(
        getCalendarLinkGate({
          taskId: block.taskId,
          blocks: draft.blocks,
          busy: [],
          availability: draft.availability,
          windowStart: draft.windowStart,
          windowEnd: draft.windowEnd,
          now,
        }).enabled,
        true,
      );
    }
  });

  it("uses the busy data it fetched", async () => {
    const clock = scriptedClock("2026-11-10T08:00:00Z");
    const { fetchBusy } = recordingFetch([
      { ...LIVE_EMPTY, busy: [busy("2026-11-10T09:00:00Z", "2026-11-10T10:00:00Z")] },
    ]);
    const { draft, busyResult } = await buildFreshSchedule(input(clock, fetchBusy));
    assert.equal(busyResult.busy.length, 1);
    assert.equal(draft.blocks[0].start, "2026-11-10T10:00:00.000Z");
    assert.equal(draft.availability, "live");
  });

  it("passes failures through as unknown availability", async () => {
    const clock = scriptedClock("2026-11-10T08:00:00Z");
    const failed: BusyFetchResult = {
      busy: [],
      errorCode: "reauth_required",
      availability: "unavailable",
      message: "x",
    };
    const { fetchBusy } = recordingFetch([failed]);
    const result = await buildFreshSchedule(input(clock, fetchBusy));
    assert.equal(result.draft.availability, "unavailable");
    assert.equal(result.busyResult.errorCode, "reauth_required");
  });

  it("re-fetches for the new day when midnight passes during the request", async () => {
    // A 00:00–24:00 window asked at 23:59, answered at 00:01 the next day.
    const allDay = settings({ startMinute: 0, endMinute: 24 * 60 });
    const clock = scriptedClock(
      "2026-11-10T23:59:00Z",
      "2026-11-11T00:01:00Z",
      "2026-11-11T00:01:30Z",
    );
    const { fetchBusy, windows } = recordingFetch();
    const { draft, now, busyResult } = await buildFreshSchedule({
      ...input(clock, fetchBusy),
      settings: allDay,
    });
    assert.equal(windows.length, 2);
    assert.equal(new Date(windows[0].start).toISOString(), "2026-11-10T00:00:00.000Z");
    assert.equal(new Date(windows[1].start).toISOString(), "2026-11-11T00:00:00.000Z");
    assert.equal(draft.windowStart, "2026-11-11T00:00:00.000Z");
    assert.equal(now.toISOString(), "2026-11-11T00:01:30.000Z");
    assert.equal(busyResult.availability, "live");
  });

  it("reports unknown availability if the day keeps changing", async () => {
    const allDay = settings({ startMinute: 0, endMinute: 24 * 60 });
    const clock = scriptedClock(
      "2026-11-10T23:59:00Z",
      "2026-11-11T23:59:59Z",
      "2026-11-12T00:00:01Z",
    );
    const { fetchBusy, windows } = recordingFetch();
    const { draft } = await buildFreshSchedule({
      ...input(clock, fetchBusy),
      settings: allDay,
    });
    assert.equal(windows.length, 2);
    assert.equal(draft.availability, "unavailable");
  });
});
