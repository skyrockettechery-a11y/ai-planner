/**
 * Mission 12 (P2A) — calendar availability and authorization errors.
 *
 * `fetchScheduleBusy` is exercised with an injected fetch that returns the
 * same JSON error bodies `/api/google-calendar/busy` produces. The rule under
 * test: a failed calendar check is never treated as an empty calendar.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availabilityFromErrorCode,
  fetchScheduleBusy,
  NOT_CONFIGURED_MESSAGE,
  NOT_CONNECTED_MESSAGE,
  UNKNOWN_AVAILABILITY_PREFIX,
} from "@/lib/schedule/availability";
import { findScheduleConflicts, generateSchedule } from "@/lib/schedule/engine";
import { CALENDAR_ERROR_MESSAGES } from "@/types/calendar";
import { busy, jsonResponse, settings, task } from "./helpers/scheduleFixtures";

process.env.TZ = "UTC";

const WINDOW = {
  start: Date.parse("2026-11-10T09:00:00Z"),
  end: Date.parse("2026-11-10T18:00:00Z"),
};

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return respond();
  };
  return { impl, calls };
}

describe("fetchScheduleBusy — success", () => {
  it("queries the existing busy route for the planning window, uncached", async () => {
    const { impl, calls } = fakeFetch(() =>
      jsonResponse(200, {
        timeMin: "2026-11-10T09:00:00.000Z",
        timeMax: "2026-11-10T18:00:00.000Z",
        busy: [busy("2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z")],
      }),
    );
    const result = await fetchScheduleBusy(WINDOW, impl);

    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url, "https://planner.test");
    assert.equal(url.pathname, "/api/google-calendar/busy");
    assert.equal(url.searchParams.get("timeMin"), "2026-11-10T09:00:00.000Z");
    assert.equal(url.searchParams.get("timeMax"), "2026-11-10T18:00:00.000Z");
    assert.equal(calls[0].init?.cache, "no-store");
    assert.equal(calls[0].init?.method ?? "GET", "GET");

    assert.deepEqual(result, {
      busy: [busy("2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z")],
      errorCode: null,
      availability: "live",
      message: null,
    });
  });

  it("treats an empty busy list as live (genuinely no busy time)", async () => {
    const { impl } = fakeFetch(() => jsonResponse(200, { busy: [] }));
    const result = await fetchScheduleBusy(WINDOW, impl);
    assert.equal(result.availability, "live");
    assert.deepEqual(result.busy, []);
  });
});

describe("fetchScheduleBusy — authorization and other failures", () => {
  const cases = [
    { status: 401, code: "reauth_required", availability: "unavailable" },
    { status: 401, code: "not_signed_in", availability: "unavailable" },
    { status: 404, code: "not_connected", availability: "not-connected" },
    { status: 503, code: "not_configured", availability: "not-connected" },
    { status: 503, code: "google_config_error", availability: "unavailable" },
    { status: 429, code: "google_rate_limited", availability: "unavailable" },
    { status: 503, code: "google_unavailable", availability: "unavailable" },
    { status: 502, code: "google_error", availability: "unavailable" },
    { status: 500, code: "storage_error", availability: "unavailable" },
    { status: 400, code: "invalid_range", availability: "unavailable" },
  ] as const;

  for (const { status, code, availability } of cases) {
    it(`${status} ${code} → ${availability}, no busy periods`, async () => {
      const { impl } = fakeFetch(() => jsonResponse(status, { error: code }));
      const result = await fetchScheduleBusy(WINDOW, impl);
      assert.equal(result.availability, availability);
      assert.equal(result.errorCode, code);
      assert.deepEqual(result.busy, []);
      if (availability === "unavailable") {
        assert.ok(result.message?.startsWith(UNKNOWN_AVAILABILITY_PREFIX));
        assert.ok(result.message?.endsWith(CALENDAR_ERROR_MESSAGES[code]));
      }
    });
  }

  it("tells the user to reconnect when access expired or was revoked", async () => {
    const { impl } = fakeFetch(() =>
      jsonResponse(401, { error: "reauth_required" }),
    );
    const result = await fetchScheduleBusy(WINDOW, impl);
    assert.match(result.message ?? "", /expired or was revoked\. Please connect again\./);
  });

  it("uses calm, specific copy when no calendar was consulted", () => {
    assert.deepEqual(availabilityFromErrorCode("not_connected"), {
      availability: "not-connected",
      message: NOT_CONNECTED_MESSAGE,
    });
    assert.deepEqual(availabilityFromErrorCode("not_configured"), {
      availability: "not-connected",
      message: NOT_CONFIGURED_MESSAGE,
    });
  });

  it("treats an unrecognised error code as unknown", async () => {
    const { impl } = fakeFetch(() => jsonResponse(500, { error: "teapot" }));
    const result = await fetchScheduleBusy(WINDOW, impl);
    assert.equal(result.availability, "unavailable");
    assert.equal(result.errorCode, "unknown");
  });

  it("treats a non-JSON error body as unknown", async () => {
    const { impl } = fakeFetch(() => new Response("<html>502</html>", { status: 502 }));
    const result = await fetchScheduleBusy(WINDOW, impl);
    assert.equal(result.availability, "unavailable");
    assert.equal(result.errorCode, "unknown");
  });

  it("treats a network failure as unavailable, never throwing", async () => {
    const { impl } = fakeFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const result = await fetchScheduleBusy(WINDOW, impl);
    assert.equal(result.availability, "unavailable");
    assert.deepEqual(result.busy, []);
  });

  for (const [label, body] of [
    ["missing busy", { timeMin: "x" }],
    ["busy not an array", { busy: "nope" }],
    ["malformed period", { busy: [{ start: 1, end: 2 }] }],
    ["null body", null],
  ] as const) {
    it(`treats a malformed 200 response (${label}) as unavailable, not empty`, async () => {
      const { impl } = fakeFetch(() => jsonResponse(200, body));
      const result = await fetchScheduleBusy(WINDOW, impl);
      assert.equal(result.availability, "unavailable");
      assert.deepEqual(result.busy, []);
    });
  }
});

describe("unknown availability downstream", () => {
  it("still produces a draft, labelled unavailable, and claims no calendar conflicts", async () => {
    const { impl } = fakeFetch(() =>
      jsonResponse(401, { error: "reauth_required" }),
    );
    const result = await fetchScheduleBusy(WINDOW, impl);
    const draft = generateSchedule({
      tasks: [task("a", "important-urgent")],
      mode: "auto",
      dismissedIds: [],
      busy: result.busy,
      availability: result.availability,
      now: new Date("2026-11-10T08:00:00Z"),
      settings: settings(),
    });
    assert.equal(draft.availability, "unavailable");
    assert.equal(draft.blocks.length, 1);
    assert.deepEqual(
      findScheduleConflicts({
        blocks: draft.blocks,
        busy: [busy("2026-11-10T09:00:00Z", "2026-11-10T10:00:00Z")],
        availability: draft.availability,
        now: new Date("2026-11-10T08:00:00Z"),
        windowStart: draft.windowStart,
        windowEnd: draft.windowEnd,
      }),
      [],
    );
  });
});
