/** Mission 12 (P2A) — `<input type="time">` conversions for the schedule UI. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseEndTimeInput,
  parseTimeInput,
  toTimeInputValue,
} from "@/lib/schedule/timeInput";

describe("time input helpers", () => {
  it("formats minutes as HH:MM", () => {
    assert.equal(toTimeInputValue(0), "00:00");
    assert.equal(toTimeInputValue(9 * 60 + 5), "09:05");
    assert.equal(toTimeInputValue(23 * 60 + 59), "23:59");
    assert.equal(toTimeInputValue(24 * 60), "00:00");
  });

  it("parses valid values and rejects invalid ones", () => {
    assert.equal(parseTimeInput("09:05"), 545);
    assert.equal(parseTimeInput("9:05"), 545);
    for (const bad of ["", "24:00", "12:60", "noon", "12:5"]) {
      assert.equal(parseTimeInput(bad), null, bad);
    }
  });

  it("reads 00:00 as end-of-day midnight for a window end", () => {
    assert.equal(parseEndTimeInput("00:00"), 24 * 60);
    assert.equal(parseEndTimeInput("18:00"), 18 * 60);
    assert.equal(parseEndTimeInput(""), null);
  });
});
