/**
 * Regression: React duplicate-key error after sign-in (PR #3, localhost
 * acceptance). `SmartDailySchedule` and `CalendarAvailability` are sibling
 * children of `PlannerApp`, each keyed `${user.id}:${epoch}` with both
 * epochs starting at 0, so their keys collided.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { calendarCardKey, scheduleSectionKey } from "@/lib/plannerKeys";

const USERS = [
  "3f1c2b9a-0d4e-4c55-9b7a-1e2f3a4b5c6d",
  "8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d",
];
const EPOCHS = [0, 1, 2, 3, 10];

describe("PlannerApp section keys", () => {
  it("never collide between the schedule and the calendar card, at any epochs", () => {
    for (const user of USERS) {
      for (const scheduleEpoch of EPOCHS) {
        for (const cardEpoch of EPOCHS) {
          assert.notEqual(
            scheduleSectionKey(user, scheduleEpoch),
            calendarCardKey(user, cardEpoch),
            `${user} schedule=${scheduleEpoch} card=${cardEpoch}`,
          );
        }
      }
    }
  });

  it("collide-free on first sign-in, the case that failed (both epochs 0)", () => {
    assert.notEqual(scheduleSectionKey(USERS[0], 0), calendarCardKey(USERS[0], 0));
  });

  it("change on account change, so neither section carries over between users", () => {
    assert.notEqual(scheduleSectionKey(USERS[0], 0), scheduleSectionKey(USERS[1], 0));
    assert.notEqual(calendarCardKey(USERS[0], 0), calendarCardKey(USERS[1], 0));
  });

  it("change only with their own epoch (independent remounts)", () => {
    // Calendar disconnect bumps the schedule epoch → schedule remounts.
    assert.notEqual(scheduleSectionKey(USERS[0], 0), scheduleSectionKey(USERS[0], 1));
    // Lost authorization bumps the card epoch → card remounts.
    assert.notEqual(calendarCardKey(USERS[0], 0), calendarCardKey(USERS[0], 1));
    // Same inputs, same key → no spurious remount on re-render.
    assert.equal(scheduleSectionKey(USERS[0], 2), scheduleSectionKey(USERS[0], 2));
    assert.equal(calendarCardKey(USERS[0], 2), calendarCardKey(USERS[0], 2));
  });

  it("PlannerApp keys both sections through the namespaced helpers", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "PlannerApp.tsx"),
      "utf8",
    );
    assert.ok(
      source.includes("key={scheduleSectionKey(user.id, calendarEpoch)}"),
      "SmartDailySchedule is not keyed by scheduleSectionKey",
    );
    assert.ok(
      source.includes("key={calendarCardKey(user.id, calendarCardEpoch)}"),
      "CalendarAvailability is not keyed by calendarCardKey",
    );
    // No sibling may be keyed by the bare user id pattern that collided.
    assert.ok(
      !/key=\{`\$\{user\.id\}/.test(source),
      "a section is keyed by a bare `${user.id}...` template",
    );
    // Remount triggers are still wired to the right counters.
    assert.match(source, /onCalendarAccessLost=\{\(\) =>\s*setCalendarCardEpoch\(/);
    assert.match(source, /onDisconnected=\{\(\) => setCalendarEpoch\(/);
  });
});
