/**
 * Mission 12 (P2A) scope guard: Smart Daily Scheduling must not write to
 * Google Calendar or widen the OAuth scope (that is P2B, not approved).
 * A static check over source files, so no server-only module is imported.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(__dirname, "..");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** Source without block and whole-line comments (docs may name what's avoided). */
function code(path: string): string {
  return read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const P2A_FILES = [
  ...readdirSync(join(ROOT, "lib/schedule")).map((f) => `lib/schedule/${f}`),
  "hooks/useDailySchedule.ts",
  "components/SmartDailySchedule.tsx",
  "types/schedule.ts",
];

describe("P2A scope", () => {
  it("requests only the calendar.freebusy OAuth scope", () => {
    const scopes = read("lib/googleCalendar/config.ts").match(
      /https:\/\/www\.googleapis\.com\/auth\/[\w.]+/g,
    );
    assert.deepEqual(scopes, ["https://www.googleapis.com/auth/calendar.freebusy"]);
  });

  it("scheduling code never calls Google APIs or writes events", () => {
    for (const file of P2A_FILES) {
      const source = code(file);
      assert.ok(!source.includes("googleapis.com"), `${file} calls a Google API`);
      assert.ok(!/\/events\b/.test(source), `${file} references an events endpoint`);
      assert.ok(!/localStorage|sessionStorage/.test(source), `${file} persists drafts`);
      assert.ok(!/supabase/i.test(source), `${file} touches the database`);
    }
  });

  it("only talks to AI Planner's existing busy route", () => {
    const routes = P2A_FILES.flatMap(
      (file) => code(file).match(/\/api\/[\w/-]+/g) ?? [],
    );
    assert.deepEqual([...new Set(routes)], ["/api/google-calendar/busy"]);
  });
});
