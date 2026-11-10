/**
 * Mission 12 (P2A) — time zones and daylight-saving transitions.
 *
 * The planning window is anchored to local wall-clock time, while all
 * comparisons happen on absolute instants. These tests switch the process
 * time zone per case (see `withTimeZone`).
 *
 * 2026 transitions used:
 * - America/New_York: spring forward Sun 8 Mar (02:00 → 03:00),
 *   fall back Sun 1 Nov (02:00 → 01:00).
 * - Europe/London: spring forward Sun 29 Mar (01:00 → 02:00).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGoogleCalendarEventUrl } from "@/lib/schedule/calendarLink";
import {
  adjustBlock,
  computePlanningWindow,
  findScheduleConflicts,
  generateSchedule,
  localInstant,
} from "@/lib/schedule/engine";
import type { BusyPeriod } from "@/types/calendar";
import { busy, settings, task, withTimeZone } from "./helpers/scheduleFixtures";

const iso = (ms: number) => new Date(ms).toISOString();

function draftFor(
  now: Date,
  overrides: Parameters<typeof settings>[0] = {},
  busyPeriods: BusyPeriod[] = [],
) {
  return generateSchedule({
    tasks: [
      task("a", "important-urgent"),
      task("b", "important-not-urgent"),
      task("c", "not-important-urgent"),
    ],
    mode: "auto",
    dismissedIds: [],
    busy: busyPeriods,
    availability: "live",
    now,
    settings: settings(overrides),
  });
}

describe("planning window in the viewer's time zone", () => {
  it("anchors 09:00–18:00 to local time on an ordinary day", () => {
    withTimeZone("America/New_York", () => {
      const window = computePlanningWindow(
        new Date("2026-11-10T12:00:00Z"), // 07:00 EST
        settings(),
      );
      assert.equal(iso(window.start), "2026-11-10T14:00:00.000Z");
      assert.equal(iso(window.end), "2026-11-10T23:00:00.000Z");
    });
    withTimeZone("Asia/Kolkata", () => {
      const window = computePlanningWindow(
        new Date("2026-11-10T01:00:00Z"), // 06:30 IST (+05:30)
        settings(),
      );
      assert.equal(iso(window.start), "2026-11-10T03:30:00.000Z");
      assert.equal(iso(window.end), "2026-11-10T12:30:00.000Z");
    });
  });

  it("uses the viewer's local date, not the UTC date", () => {
    // 23:30 on 9 Nov in Los Angeles is already 10 Nov in UTC.
    withTimeZone("America/Los_Angeles", () => {
      const window = computePlanningWindow(
        new Date("2026-11-10T07:30:00Z"),
        settings({ startMinute: 0, endMinute: 24 * 60 }),
      );
      assert.equal(iso(window.start), "2026-11-09T08:00:00.000Z");
      assert.equal(iso(window.end), "2026-11-10T08:00:00.000Z");
    });
  });

  it("keeps 09:00 at 09:00 local on the spring-forward day", () => {
    withTimeZone("America/New_York", () => {
      const window = computePlanningWindow(
        new Date("2026-03-08T06:00:00Z"), // 01:00 EST, before the jump
        settings(),
      );
      // EDT (-4) after the jump; midnight + 9 h would wrongly give 14:00Z.
      assert.equal(iso(window.start), "2026-03-08T13:00:00.000Z");
      assert.equal(iso(window.end), "2026-03-08T22:00:00.000Z");
    });
  });

  it("keeps 09:00 at 09:00 local on the fall-back day", () => {
    withTimeZone("America/New_York", () => {
      const window = computePlanningWindow(
        new Date("2026-11-01T04:30:00Z"), // 00:30 EDT, before the repeat
        settings(),
      );
      // EST (-5) after the repeat; midnight + 9 h would wrongly give 13:00Z.
      assert.equal(iso(window.start), "2026-11-01T14:00:00.000Z");
      assert.equal(iso(window.end), "2026-11-01T23:00:00.000Z");
    });
  });

  it("measures a whole-day window as 23 h / 25 h on transition days", () => {
    withTimeZone("America/New_York", () => {
      const allDay = settings({ startMinute: 0, endMinute: 24 * 60 });
      const spring = computePlanningWindow(new Date("2026-03-08T06:00:00Z"), allDay);
      const fall = computePlanningWindow(new Date("2026-11-01T04:30:00Z"), allDay);
      assert.equal((spring.end - spring.start) / 3_600_000, 23);
      assert.equal((fall.end - fall.start) / 3_600_000, 25);
    });
  });

  it("resolves a non-existent local time forward and an ambiguous one to its first occurrence", () => {
    withTimeZone("America/New_York", () => {
      const springDay = new Date("2026-03-08T12:00:00Z");
      const fallDay = new Date("2026-11-01T12:00:00Z");
      // 02:30 doesn't exist on 8 Mar → 03:30 EDT.
      assert.equal(iso(localInstant(springDay, 2 * 60 + 30)), "2026-03-08T07:30:00.000Z");
      // 01:30 happens twice on 1 Nov → the first (EDT) one.
      assert.equal(iso(localInstant(fallDay, 60 + 30)), "2026-11-01T05:30:00.000Z");
    });
  });
});

describe("scheduling across DST transitions", () => {
  it("schedules real 30-minute blocks across the spring-forward gap", () => {
    withTimeZone("America/New_York", () => {
      const draft = draftFor(
        new Date("2026-03-08T06:30:00Z"), // 01:30 EST
        { startMinute: 60 + 30, endMinute: 4 * 60, bufferMinutes: 0 },
      );
      assert.deepEqual(
        draft.blocks.map((block) => [block.start, block.end]),
        [
          // 01:30–02:00 EST, then 03:00–03:30 EDT: contiguous real time.
          ["2026-03-08T06:30:00.000Z", "2026-03-08T07:00:00.000Z"],
          ["2026-03-08T07:00:00.000Z", "2026-03-08T07:30:00.000Z"],
          ["2026-03-08T07:30:00.000Z", "2026-03-08T08:00:00.000Z"],
        ],
      );
      for (const block of draft.blocks) {
        assert.equal(Date.parse(block.end) - Date.parse(block.start), 30 * 60_000);
      }
    });
  });

  it("avoids busy time correctly in the repeated fall-back hour", () => {
    withTimeZone("America/New_York", () => {
      // Busy during the *second* 01:00–02:00 (EST, 06:00–07:00Z).
      const draft = draftFor(
        new Date("2026-11-01T04:30:00Z"), // 00:30 EDT
        { startMinute: 60, endMinute: 4 * 60, bufferMinutes: 0, defaultDurationMinutes: 60 },
        [busy("2026-11-01T06:00:00Z", "2026-11-01T07:00:00Z")],
      );
      assert.deepEqual(
        draft.blocks.map((block) => [block.taskId, block.start]),
        [
          ["a", "2026-11-01T05:00:00.000Z"], // first 01:00 (EDT)
          ["b", "2026-11-01T07:00:00.000Z"], // 02:00 EST, after the busy repeat
          ["c", "2026-11-01T08:00:00.000Z"],
        ],
      );
    });
  });

  it("re-anchors manual edits to the draft's local day across a transition", () => {
    withTimeZone("Europe/London", () => {
      const draft = draftFor(new Date("2026-03-29T06:00:00Z")); // 07:00 BST
      const anchor = new Date(draft.windowStart);
      assert.equal(draft.windowStart, "2026-03-29T08:00:00.000Z"); // 09:00 BST
      const moved = adjustBlock(draft.blocks[0], { startMinute: 13 * 60 }, anchor);
      assert.equal(moved.start, "2026-03-29T12:00:00.000Z"); // 13:00 BST
      const conflicts = findScheduleConflicts({
        blocks: [moved],
        busy: [busy("2026-03-29T12:15:00Z", "2026-03-29T12:45:00Z")],
        availability: "live",
        now: new Date("2026-03-29T06:00:00Z"),
        windowStart: draft.windowStart,
        windowEnd: draft.windowEnd,
      });
      assert.deepEqual(conflicts.map((c) => c.kind), ["overlaps-busy"]);
    });
  });

  it("emits the same UTC instants in the calendar link whatever the zone", () => {
    const fromZone = (tz: string) =>
      withTimeZone(tz, () =>
        buildGoogleCalendarEventUrl({
          title: "Focus",
          notes: "",
          start: "2026-11-01T06:30:00.000Z",
          end: "2026-11-01T07:00:00.000Z",
          durationMinutes: 30,
        }),
      );
    const ny = fromZone("America/New_York");
    assert.ok(ny?.includes("dates=20261101T063000Z/20261101T070000Z"));
    assert.equal(ny, fromZone("Asia/Tokyo"));
  });
});
