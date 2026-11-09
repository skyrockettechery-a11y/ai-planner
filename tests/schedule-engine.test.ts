/**
 * Mission 12 (P2A) — scheduling engine: priority, busy-time avoidance,
 * buffers, unscheduled reasons, settings and determinism.
 *
 * Runs in UTC so wall-clock and ISO instants line up; time-zone and DST
 * behaviour is covered separately in schedule-timezone.test.ts.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailyPlan } from "@/lib/dailyPlan";
import {
  computePlanningWindow,
  DEFAULT_SCHEDULE_SETTINGS,
  generateSchedule,
  MAX_TASK_DURATION_MINUTES,
  MIN_TASK_DURATION_MINUTES,
  normalizeScheduleSettings,
  reconcileDraftWithTasks,
  type GenerateScheduleInput,
} from "@/lib/schedule/engine";
import { freeIntervals, mergeIntervals, toBusyIntervals } from "@/lib/schedule/intervals";
import type { RecommendationMode } from "@/types/planPreferences";
import { busy, settings, task } from "./helpers/scheduleFixtures";

process.env.TZ = "UTC";

const NOW = new Date("2026-11-10T08:00:00.000Z"); // before the 09:00 window

const TASKS = [
  task("d", "not-important-not-urgent"),
  task("c", "not-important-urgent"),
  task("b", "important-not-urgent"),
  task("a", "important-urgent"),
];

function run(overrides: Partial<GenerateScheduleInput> = {}) {
  return generateSchedule({
    tasks: TASKS,
    mode: "auto",
    dismissedIds: [],
    busy: [],
    availability: "live",
    now: NOW,
    settings: settings(),
    ...overrides,
  });
}

function times(draft: ReturnType<typeof run>) {
  return draft.blocks.map((block) => [
    block.taskId,
    block.start.slice(11, 16),
    block.end.slice(11, 16),
  ]);
}

describe("generateSchedule — priority", () => {
  it("schedules Today's Plan top 3 in rank order, buffered, from window start", () => {
    const draft = run();
    assert.deepEqual(times(draft), [
      ["a", "09:00", "09:30"],
      ["b", "09:35", "10:05"],
      ["c", "10:10", "10:40"],
    ]);
    assert.deepEqual(
      draft.blocks.map((block) => block.rank),
      [1, 2, 3],
    );
    assert.equal(draft.unscheduled.length, 0);
    // The 4th task is not recommended, so it is neither placed nor reported.
    assert.ok(!draft.blocks.some((block) => block.taskId === "d"));
  });

  for (const mode of ["auto", "urgency", "importance"] as RecommendationMode[]) {
    it(`ranks match Today's Plan in ${mode} mode`, () => {
      const tasks = [
        task("u1", "not-important-urgent", { dueDate: "2026-11-10" }),
        task("i1", "important-not-urgent", { dueDate: "2026-11-12" }),
        task("x1", "important-urgent", { dueDate: "2026-11-20" }),
        task("l1", "not-important-not-urgent"),
      ];
      const plan = buildDailyPlan(tasks, { mode, dismissedIds: [] });
      const draft = run({ tasks, mode });
      const byRank = [...draft.blocks].sort((a, b) => a.rank - b.rank);
      assert.deepEqual(
        byRank.map((block) => block.taskId),
        plan.recommendations.map((item) => item.task.id),
      );
      assert.deepEqual(
        byRank.map((block) => block.reason),
        plan.recommendations.map((item) => item.reason),
      );
    });
  }

  it("never schedules completed or dismissed tasks", () => {
    const tasks = [
      task("a", "important-urgent", { completed: true }),
      task("b", "important-urgent"),
      task("c", "important-not-urgent"),
      task("d", "not-important-urgent"),
    ];
    const draft = run({ tasks, dismissedIds: ["b"] });
    assert.deepEqual(
      draft.blocks.map((block) => block.taskId),
      ["c", "d"],
    );
  });

  it("returns an empty draft when nothing is recommended", () => {
    const draft = run({ tasks: [] });
    assert.deepEqual(draft.blocks, []);
    assert.deepEqual(draft.unscheduled, []);
  });

  it("gives a higher-priority task the earliest slot it fits, and lets shorter tasks use earlier gaps", () => {
    const draft = run({
      durations: { a: 120 },
      busy: [busy("2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z")],
    });
    // a (120 min) can't fit 09:00–10:00, so it takes 11:00. b then uses the
    // morning gap instead of being pushed after a. c no longer fits before
    // the meeting (buffer after b), so it goes after a + buffer.
    assert.deepEqual(times(draft), [
      ["b", "09:00", "09:30"],
      ["a", "11:00", "13:00"],
      ["c", "13:05", "13:35"],
    ]);
    assert.deepEqual(
      draft.blocks.map((block) => block.rank),
      [2, 1, 3],
    );
  });
});

describe("generateSchedule — busy time", () => {
  it("never places a block on a busy period", () => {
    const busyPeriods = [
      busy("2026-11-10T08:00:00Z", "2026-11-10T09:20:00Z"), // overlaps window start
      busy("2026-11-10T09:50:00Z", "2026-11-10T10:30:00Z"),
      busy("2026-11-10T10:30:00Z", "2026-11-10T10:45:00Z"), // touching
    ];
    const draft = run({ busy: busyPeriods });
    assert.deepEqual(times(draft), [
      ["a", "09:20", "09:50"],
      ["b", "10:45", "11:15"],
      ["c", "11:20", "11:50"],
    ]);
    const busyIntervals = toBusyIntervals(busyPeriods);
    for (const block of draft.blocks) {
      const start = Date.parse(block.start);
      const end = Date.parse(block.end);
      for (const period of busyIntervals) {
        assert.ok(end <= period.start || start >= period.end, block.taskId);
      }
    }
  });

  it("starts right when a meeting ends (no buffer against calendar events)", () => {
    const draft = run({
      busy: [busy("2026-11-10T09:00:00Z", "2026-11-10T09:30:00Z")],
    });
    assert.equal(draft.blocks[0].start, "2026-11-10T09:30:00.000Z");
  });

  it("snaps a start after an off-grid meeting end to the 5-minute grid", () => {
    const draft = run({
      busy: [busy("2026-11-10T09:00:00Z", "2026-11-10T09:03:00Z")],
    });
    assert.equal(draft.blocks[0].start, "2026-11-10T09:05:00.000Z");
  });

  it("ignores unparseable and zero-length busy periods", () => {
    const draft = run({
      busy: [
        busy("not-a-date", "2026-11-10T12:00:00Z"),
        busy("2026-11-10T09:00:00Z", "2026-11-10T09:00:00Z"),
        busy("2026-11-10T10:00:00Z", "2026-11-10T09:00:00Z"),
      ],
    });
    assert.equal(draft.blocks[0].start, "2026-11-10T09:00:00.000Z");
  });

  it("reports no-free-time when busy covers the whole remaining window", () => {
    const draft = run({
      busy: [busy("2026-11-10T07:00:00Z", "2026-11-10T19:00:00Z")],
    });
    assert.equal(draft.blocks.length, 0);
    assert.deepEqual(
      draft.unscheduled.map((item) => [item.taskId, item.rank, item.reason]),
      [
        ["a", 1, "no-free-time"],
        ["b", 2, "no-free-time"],
        ["c", 3, "no-free-time"],
      ],
    );
  });

  it("distinguishes too-long from no-room when availability runs short", () => {
    const tight = settings({ startMinute: 9 * 60, endMinute: 10 * 60 });
    const draft = run({ settings: tight, durations: { a: 60, c: 90 } });
    assert.deepEqual(times(draft), [["a", "09:00", "10:00"]]);
    assert.deepEqual(
      draft.unscheduled.map((item) => [item.taskId, item.reason, item.durationMinutes]),
      [
        ["b", "no-room", 30],
        ["c", "too-long", 90],
      ],
    );
  });
});

describe("generateSchedule — window, buffer, durations", () => {
  it("never schedules in the past", () => {
    const draft = run({ now: new Date("2026-11-10T10:02:30Z") });
    assert.equal(draft.earliestStart, "2026-11-10T10:05:00.000Z");
    assert.equal(draft.blocks[0].start, "2026-11-10T10:05:00.000Z");
    for (const block of draft.blocks) {
      assert.ok(Date.parse(block.start) >= Date.parse("2026-11-10T10:02:30Z"));
    }
  });

  it("reports window-passed after the window has closed", () => {
    const draft = run({ now: new Date("2026-11-10T18:30:00Z") });
    assert.equal(draft.blocks.length, 0);
    assert.ok(draft.unscheduled.every((item) => item.reason === "window-passed"));
  });

  it("honors buffer and default duration settings", () => {
    const draft = run({
      settings: settings({ bufferMinutes: 0, defaultDurationMinutes: 45 }),
    });
    assert.deepEqual(times(draft), [
      ["a", "09:00", "09:45"],
      ["b", "09:45", "10:30"],
      ["c", "10:30", "11:15"],
    ]);
  });

  it("applies and clamps per-task duration overrides", () => {
    const draft = run({ durations: { a: 1, b: 10_000 } });
    const byId = Object.fromEntries(draft.blocks.map((b) => [b.taskId, b]));
    assert.equal(byId.a.durationMinutes, MIN_TASK_DURATION_MINUTES);
    assert.equal(byId.b.durationMinutes, MAX_TASK_DURATION_MINUTES);
    assert.deepEqual(times(draft), [
      ["a", "09:00", "09:05"],
      ["b", "09:10", "17:10"],
      ["c", "17:15", "17:45"],
    ]);
  });

  it("can plan until midnight", () => {
    const window = computePlanningWindow(
      NOW,
      settings({ startMinute: 20 * 60, endMinute: 24 * 60 }),
    );
    assert.equal(new Date(window.end).toISOString(), "2026-11-11T00:00:00.000Z");
  });

  it("normalizes out-of-range settings", () => {
    assert.deepEqual(
      normalizeScheduleSettings({
        startMinute: 600,
        endMinute: 300,
        bufferMinutes: -5,
        defaultDurationMinutes: Number.NaN,
      }),
      {
        startMinute: 600,
        endMinute: 615,
        bufferMinutes: 0,
        defaultDurationMinutes: MIN_TASK_DURATION_MINUTES,
      },
    );
    assert.deepEqual(
      normalizeScheduleSettings(DEFAULT_SCHEDULE_SETTINGS),
      DEFAULT_SCHEDULE_SETTINGS,
    );
  });
});

describe("generateSchedule — determinism", () => {
  it("returns identical drafts for identical input", () => {
    const busyPeriods = [busy("2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z")];
    assert.deepEqual(run({ busy: busyPeriods }), run({ busy: busyPeriods }));
  });

  it("does not depend on task or busy-period input order", () => {
    const busyPeriods = [
      busy("2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z"),
      busy("2026-11-10T13:00:00Z", "2026-11-10T14:00:00Z"),
      busy("2026-11-10T09:10:00Z", "2026-11-10T09:40:00Z"),
    ];
    const forward = run({ busy: busyPeriods });
    const reversed = run({
      tasks: [...TASKS].reverse(),
      busy: [...busyPeriods].reverse(),
    });
    assert.deepEqual(forward, reversed);
  });

  it("does not mutate its inputs", () => {
    const tasks = TASKS.map((t) => Object.freeze({ ...t }));
    const busyPeriods = Object.freeze([
      Object.freeze(busy("2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z")),
    ]);
    const before = JSON.stringify({ tasks, busyPeriods });
    run({ tasks, busy: busyPeriods });
    assert.equal(JSON.stringify({ tasks, busyPeriods }), before);
  });
});

describe("reconcileDraftWithTasks", () => {
  const draft = run({
    settings: settings({ startMinute: 9 * 60, endMinute: 10 * 60 }),
  });

  it("returns the same object when nothing changed", () => {
    assert.equal(reconcileDraftWithTasks(draft, TASKS, []), draft);
  });

  it("hides tasks completed, deleted or dismissed after generation", () => {
    const tasks = TASKS.filter((t) => t.id !== "b").map((t) =>
      t.id === "a" ? { ...t, completed: true } : t,
    );
    const view = reconcileDraftWithTasks(draft, tasks, ["c"]);
    assert.deepEqual(view.blocks, []);
    assert.deepEqual(view.unscheduled, []);
    // Un-dismissing brings the original entry back unchanged.
    const restored = reconcileDraftWithTasks(draft, TASKS, []);
    assert.deepEqual(restored, draft);
  });

  it("picks up edited titles and notes", () => {
    const tasks = TASKS.map((t) =>
      t.id === "a" ? { ...t, title: "Renamed", notes: "New notes" } : t,
    );
    const view = reconcileDraftWithTasks(draft, tasks, []);
    const a = view.blocks.find((block) => block.taskId === "a");
    assert.equal(a?.title, "Renamed");
    assert.equal(a?.notes, "New notes");
    assert.equal(a?.start, draft.blocks[0].start);
  });
});

describe("interval helpers", () => {
  it("merges overlapping and touching intervals", () => {
    assert.deepEqual(
      mergeIntervals([
        { start: 5, end: 7 },
        { start: 1, end: 3 },
        { start: 3, end: 4 },
        { start: 6, end: 9 },
        { start: 10, end: 10 },
      ]),
      [
        { start: 1, end: 4 },
        { start: 5, end: 9 },
      ],
    );
  });

  it("subtracts busy time from bounds", () => {
    assert.deepEqual(
      freeIntervals({ start: 0, end: 100 }, [
        { start: -10, end: 10 },
        { start: 40, end: 50 },
        { start: 90, end: 200 },
      ]),
      [
        { start: 10, end: 40 },
        { start: 50, end: 90 },
      ],
    );
    assert.deepEqual(freeIntervals({ start: 0, end: 0 }, []), []);
  });
});
