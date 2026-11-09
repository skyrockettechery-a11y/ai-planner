/**
 * Mission 12 (P2A) — gating of the "Add to Google Calendar" handoff and the
 * availability trust level.
 *
 * A block with any problem (overlap, busy clash, outside the window, starts
 * before now) must not offer a one-click link; time-based problems are
 * re-evaluated with a fresh clock, so a draft left open goes stale safely.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustBlock,
  findScheduleConflicts,
  generateSchedule,
} from "@/lib/schedule/engine";
import {
  calendarLinkGateFromConflicts,
  describeAvailabilityTrust,
  getCalendarLinkGate,
  LINK_BLOCKED_CONFLICT,
  LINK_BLOCKED_PAST,
  LINK_CAUTION_NOT_CHECKED,
  LINK_CAUTION_UNKNOWN,
} from "@/lib/schedule/linkGate";
import type { ScheduleAvailability, ScheduleBlock } from "@/types/schedule";
import { busy, settings, task } from "./helpers/scheduleFixtures";

process.env.TZ = "UTC";

const NOW = new Date("2026-11-10T08:00:00.000Z");
const MEETING = busy("2026-11-10T11:00:00Z", "2026-11-10T12:00:00Z");
const ANCHOR = new Date("2026-11-10T09:00:00.000Z");

function draftWith(availability: ScheduleAvailability = "live") {
  return generateSchedule({
    tasks: [
      task("a", "important-urgent"),
      task("b", "important-not-urgent"),
      task("c", "not-important-urgent"),
    ],
    mode: "auto",
    dismissedIds: [],
    busy: availability === "live" ? [MEETING] : [],
    availability,
    now: NOW,
    settings: settings(),
  });
}

function gate(
  blocks: readonly ScheduleBlock[],
  taskId: string,
  overrides: { now?: Date; availability?: ScheduleAvailability } = {},
) {
  const draft = draftWith();
  return getCalendarLinkGate({
    taskId,
    blocks,
    busy: [MEETING],
    availability: overrides.availability ?? "live",
    windowStart: draft.windowStart,
    windowEnd: draft.windowEnd,
    now: overrides.now ?? NOW,
  });
}

function move(blocks: readonly ScheduleBlock[], taskId: string, startMinute: number) {
  return blocks.map((block) =>
    block.taskId === taskId ? adjustBlock(block, { startMinute }, ANCHOR) : block,
  );
}

describe("getCalendarLinkGate — conflicts disable the link", () => {
  it("enables links for conflict-free blocks on a live check, without a caution", () => {
    const { blocks } = draftWith();
    for (const block of blocks) {
      assert.deepEqual(gate(blocks, block.taskId), { enabled: true, caution: null });
    }
  });

  it("disables a block moved onto a busy period", () => {
    const blocks = move(draftWith().blocks, "a", 11 * 60 + 15);
    assert.deepEqual(gate(blocks, "a"), { enabled: false, reason: LINK_BLOCKED_CONFLICT });
    assert.equal(gate(blocks, "b").enabled, true, "other blocks unaffected");
  });

  it("disables both blocks of a manual overlap", () => {
    const blocks = move(draftWith().blocks, "c", 9 * 60 + 5);
    assert.equal(gate(blocks, "a").enabled, false);
    assert.equal(gate(blocks, "c").enabled, false);
    assert.equal(gate(blocks, "b").enabled, true);
  });

  it("disables a block moved outside the planning window", () => {
    const blocks = move(draftWith().blocks, "c", 17 * 60 + 45);
    assert.deepEqual(gate(blocks, "c"), { enabled: false, reason: LINK_BLOCKED_CONFLICT });
  });

  it("disables a block that starts before now, with a specific reason", () => {
    const { blocks } = draftWith();
    assert.deepEqual(gate(blocks, "a", { now: new Date("2026-11-10T09:01:00Z") }), {
      enabled: false,
      reason: LINK_BLOCKED_PAST,
    });
  });

  it("disables a task that is no longer in the draft", () => {
    assert.equal(gate(draftWith().blocks, "gone").enabled, false);
  });

  it("matches the gate derived from precomputed conflicts", () => {
    const blocks = move(draftWith().blocks, "a", 11 * 60 + 15);
    const draft = draftWith();
    const conflicts = findScheduleConflicts({
      blocks,
      busy: [MEETING],
      availability: "live",
      now: NOW,
      windowStart: draft.windowStart,
      windowEnd: draft.windowEnd,
    });
    for (const id of ["a", "b", "c"]) {
      assert.deepEqual(
        calendarLinkGateFromConflicts(
          conflicts.filter((c) => c.taskId === id),
          "live",
        ),
        gate(blocks, id),
      );
    }
  });
});

describe("stale time — a draft left open", () => {
  it("re-evaluating with a fresh clock disables blocks that have started", () => {
    const { blocks } = draftWith();
    // At generation every link is offered…
    assert.ok(blocks.every((block) => gate(blocks, block.taskId).enabled));
    // …an hour later the first two blocks (09:00, 09:35) have started.
    const later = new Date("2026-11-10T10:00:00Z");
    assert.deepEqual(
      blocks.map((block) => [block.taskId, gate(blocks, block.taskId, { now: later }).enabled]),
      [
        ["a", false],
        ["b", false],
        ["c", true],
      ],
    );
    // After the window, nothing is offered.
    const evening = new Date("2026-11-10T19:00:00Z");
    assert.ok(blocks.every((block) => !gate(blocks, block.taskId, { now: evening }).enabled));
  });

  it("a block starting exactly now is still offered; one millisecond later it is not", () => {
    const { blocks } = draftWith();
    const start = new Date(blocks[0].start);
    assert.equal(gate(blocks, "a", { now: start }).enabled, true);
    assert.equal(
      gate(blocks, "a", { now: new Date(start.getTime() + 1) }).enabled,
      false,
    );
  });
});

describe("availability trust level", () => {
  it("cautions links when no live check succeeded", () => {
    const notConnected = draftWith("not-connected");
    const unknown = draftWith("unavailable");
    assert.deepEqual(gate(notConnected.blocks, "a", { availability: "not-connected" }), {
      enabled: true,
      caution: LINK_CAUTION_NOT_CHECKED,
    });
    assert.deepEqual(gate(unknown.blocks, "a", { availability: "unavailable" }), {
      enabled: true,
      caution: LINK_CAUTION_UNKNOWN,
    });
  });

  it("still blocks past or overlapping blocks when the calendar wasn't checked", () => {
    const blocks = move(draftWith("unavailable").blocks, "c", 9 * 60 + 5);
    assert.equal(gate(blocks, "c", { availability: "unavailable" }).enabled, false);
    assert.equal(
      gate(blocks, "b", {
        availability: "unavailable",
        now: new Date("2026-11-10T12:00:00Z"),
      }).enabled,
      false,
    );
  });

  it("labels each availability state distinctly", () => {
    assert.deepEqual(describeAvailabilityTrust("live"), {
      level: "checked",
      label: "Checked against primary calendar",
    });
    assert.equal(describeAvailabilityTrust("not-connected").level, "not-checked");
    assert.equal(describeAvailabilityTrust("unavailable").level, "unknown");
    const labels = (["live", "not-connected", "unavailable"] as const).map(
      (a) => describeAvailabilityTrust(a).label,
    );
    assert.equal(new Set(labels).size, 3);
  });
});
