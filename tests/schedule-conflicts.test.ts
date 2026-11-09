/**
 * Mission 12 (P2A) — manual adjustments and conflict detection.
 * Runs in UTC; see schedule-timezone.test.ts for DST edits.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustBlock,
  conflictsByTask,
  findScheduleConflicts,
  generateSchedule,
  MAX_TASK_DURATION_MINUTES,
  type ConflictInput,
} from "@/lib/schedule/engine";
import type { ScheduleBlock, ScheduleDraft } from "@/types/schedule";
import { busy, settings, task } from "./helpers/scheduleFixtures";

process.env.TZ = "UTC";

const NOW = new Date("2026-11-10T08:00:00.000Z");
const MEETING = busy("2026-11-10T11:00:00Z", "2026-11-10T12:00:00Z");

function baseDraft(): ScheduleDraft {
  return generateSchedule({
    tasks: [
      task("a", "important-urgent", { title: "Write report" }),
      task("b", "important-not-urgent", { title: "Plan sprint" }),
      task("c", "not-important-urgent", { title: "Reply emails" }),
    ],
    mode: "auto",
    dismissedIds: [],
    busy: [MEETING],
    availability: "live",
    now: NOW,
    settings: settings(),
  });
}

function conflictsFor(
  blocks: readonly ScheduleBlock[],
  overrides: Partial<ConflictInput> = {},
) {
  const draft = baseDraft();
  return findScheduleConflicts({
    blocks,
    busy: [MEETING],
    availability: "live",
    now: NOW,
    windowStart: draft.windowStart,
    windowEnd: draft.windowEnd,
    ...overrides,
  });
}

const anchor = new Date("2026-11-10T09:00:00.000Z");

function edit(blocks: ScheduleBlock[], taskId: string, changes: Parameters<typeof adjustBlock>[1]) {
  return blocks.map((block) =>
    block.taskId === taskId ? adjustBlock(block, changes, anchor) : block,
  );
}

describe("adjustBlock", () => {
  it("moves a block to a new local start, keeping its length", () => {
    const [a] = baseDraft().blocks;
    const moved = adjustBlock(a, { startMinute: 14 * 60 + 15 }, anchor);
    assert.equal(moved.start, "2026-11-10T14:15:00.000Z");
    assert.equal(moved.end, "2026-11-10T14:45:00.000Z");
    assert.equal(moved.adjusted, true);
    assert.equal(moved.rank, a.rank);
    assert.equal(a.adjusted, false, "original block is not mutated");
  });

  it("resizes a block from its current start, clamping the length", () => {
    const [a] = baseDraft().blocks;
    const longer = adjustBlock(a, { durationMinutes: 90 }, anchor);
    assert.equal(longer.start, a.start);
    assert.equal(longer.end, "2026-11-10T10:30:00.000Z");
    assert.equal(
      adjustBlock(a, { durationMinutes: 100_000 }, anchor).durationMinutes,
      MAX_TASK_DURATION_MINUTES,
    );
  });
});

describe("findScheduleConflicts", () => {
  it("reports nothing for a freshly generated draft", () => {
    assert.deepEqual(conflictsFor(baseDraft().blocks), []);
  });

  it("flags a block moved onto a busy period", () => {
    const blocks = edit(baseDraft().blocks, "a", { startMinute: 11 * 60 + 30 });
    assert.deepEqual(
      conflictsFor(blocks).map((c) => [c.taskId, c.kind]),
      [["a", "overlaps-busy"]],
    );
  });

  it("flags both blocks when a manual edit makes them overlap", () => {
    // 09:05–09:35 overlaps a (09:00–09:30) and touches b (09:35) without overlap.
    const blocks = edit(baseDraft().blocks, "c", { startMinute: 9 * 60 + 5 });
    const conflicts = conflictsFor(blocks);
    assert.deepEqual(
      conflicts.map((c) => [c.taskId, c.kind]).sort(),
      [
        ["a", "overlaps-block"],
        ["c", "overlaps-block"],
      ],
    );
    const byTask = conflictsByTask(conflicts);
    assert.match(byTask.a[0].message, /Reply emails/);
    assert.match(byTask.c[0].message, /Write report/);
  });

  it("flags a block resized into the next block", () => {
    const blocks = edit(baseDraft().blocks, "a", { durationMinutes: 60 });
    assert.deepEqual(
      conflictsFor(blocks).map((c) => [c.taskId, c.kind]).sort(),
      [
        ["a", "overlaps-block"],
        ["b", "overlaps-block"],
      ],
    );
  });

  it("treats back-to-back blocks as not overlapping", () => {
    const blocks = edit(baseDraft().blocks, "b", { startMinute: 9 * 60 + 30 });
    assert.deepEqual(conflictsFor(blocks), []);
  });

  it("flags blocks moved outside the planning window", () => {
    const early = edit(baseDraft().blocks, "a", { startMinute: 8 * 60 + 30 });
    assert.deepEqual(
      conflictsFor(early, { now: new Date("2026-11-10T07:00:00Z") }).map((c) => c.kind),
      ["outside-window"],
    );
    const late = edit(baseDraft().blocks, "c", { startMinute: 17 * 60 + 45 });
    assert.deepEqual(
      conflictsFor(late).map((c) => [c.taskId, c.kind]),
      [["c", "outside-window"]],
    );
  });

  it("flags blocks that start before now", () => {
    const blocks = edit(baseDraft().blocks, "a", { startMinute: 9 * 60 });
    assert.deepEqual(
      conflictsFor(blocks, { now: new Date("2026-11-10T09:10:00Z") }).map(
        (c) => [c.taskId, c.kind],
      ),
      [["a", "past"]],
    );
  });

  it("does not claim calendar conflicts when availability is unknown or not connected", () => {
    const blocks = edit(baseDraft().blocks, "a", { startMinute: 11 * 60 });
    for (const availability of ["unavailable", "not-connected"] as const) {
      assert.deepEqual(conflictsFor(blocks, { availability }), [], availability);
    }
  });

  it("is order-independent and deterministic", () => {
    const blocks = edit(baseDraft().blocks, "c", { startMinute: 9 * 60 + 15 });
    assert.deepEqual(
      conflictsFor(blocks),
      conflictsFor([...blocks].reverse()),
    );
  });
});
