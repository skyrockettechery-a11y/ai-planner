/**
 * Mission 12 (P2A) — manual "Add to Google Calendar" links.
 * P2A never writes to Google Calendar; it only builds a prefilled link to
 * Google's own event-creation page.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventDetails,
  buildGoogleCalendarEventUrl,
  GOOGLE_CALENDAR_RENDER_ENDPOINT,
  MAX_DETAILS_LENGTH,
  MAX_TITLE_LENGTH,
  NOT_SYNCED_NOTICE,
  toGoogleUtcStamp,
  truncate,
} from "@/lib/schedule/calendarLink";

const BLOCK = {
  title: "Write Q4 report",
  notes: "Draft sections 1–3",
  start: "2026-11-10T14:00:00.000Z",
  end: "2026-11-10T14:30:00.000Z",
  durationMinutes: 30,
};

function parse(url: string | null) {
  assert.ok(url, "expected a URL");
  return new URL(url);
}

describe("toGoogleUtcStamp", () => {
  it("formats an instant as basic-format UTC", () => {
    assert.equal(toGoogleUtcStamp("2026-11-10T14:00:00.000Z"), "20261110T140000Z");
    // An offset input is normalized to the same UTC instant.
    assert.equal(toGoogleUtcStamp("2026-11-10T09:00:00-05:00"), "20261110T140000Z");
  });

  it("rejects unparseable input", () => {
    assert.equal(toGoogleUtcStamp("tomorrow-ish"), null);
  });
});

describe("buildGoogleCalendarEventUrl", () => {
  it("builds a TEMPLATE link on Google's event-creation page", () => {
    const url = parse(buildGoogleCalendarEventUrl(BLOCK));
    assert.equal(`${url.origin}${url.pathname}`, GOOGLE_CALENDAR_RENDER_ENDPOINT);
    assert.equal(url.protocol, "https:");
    assert.equal(url.searchParams.get("action"), "TEMPLATE");
    assert.equal(url.searchParams.get("text"), "Write Q4 report");
    assert.equal(url.searchParams.get("dates"), "20261110T140000Z/20261110T143000Z");
    assert.deepEqual(
      [...url.searchParams.keys()].sort(),
      ["action", "dates", "details", "text"],
    );
  });

  it("uses %20 for spaces and keeps the dates separator a literal slash", () => {
    const raw = buildGoogleCalendarEventUrl(BLOCK) ?? "";
    assert.ok(raw.includes("text=Write%20Q4%20report"));
    assert.ok(raw.includes("&dates=20261110T140000Z/20261110T143000Z&"));
    assert.ok(!raw.includes("+"));
  });

  it("round-trips reserved and non-ASCII characters", () => {
    const title = "Q&A = 100% #1 / déjà vu ✅ 日本語 + more?";
    const notes = "Line 1\nLine 2 & <b>tags</b>";
    const url = parse(
      buildGoogleCalendarEventUrl({ ...BLOCK, title, notes }, { includeNotes: true }),
    );
    assert.equal(url.searchParams.get("text"), title);
    const details = url.searchParams.get("details") ?? "";
    assert.ok(details.includes(notes));
    assert.equal(url.hash, "", "a # in the title must not become a fragment");
  });

  it("includes duration, notes and a not-synced notice in details when opted in", () => {
    const details = buildEventDetails(BLOCK, { includeNotes: true });
    assert.equal(
      details,
      `Planned in AI Planner — a 30-minute focus block.\n\nDraft sections 1–3\n\n${NOT_SYNCED_NOTICE}`,
    );
    assert.equal(
      buildEventDetails({ notes: "   ", durationMinutes: 45 }, { includeNotes: true }),
      `Planned in AI Planner — a 45-minute focus block.\n\n${NOT_SYNCED_NOTICE}`,
    );
  });

  it("falls back to a placeholder title", () => {
    const url = parse(buildGoogleCalendarEventUrl({ ...BLOCK, title: "   " }));
    assert.equal(url.searchParams.get("text"), "Untitled task");
  });

  it("caps long titles and notes but always keeps the notice", () => {
    const url = parse(
      buildGoogleCalendarEventUrl({
        ...BLOCK,
        title: "t".repeat(1000),
        notes: "日".repeat(5000),
      }, { includeNotes: true }),
    );
    const text = url.searchParams.get("text") ?? "";
    const details = url.searchParams.get("details") ?? "";
    assert.equal(Array.from(text).length, MAX_TITLE_LENGTH);
    assert.ok(text.endsWith("…"));
    assert.ok(Array.from(details).length <= MAX_DETAILS_LENGTH);
    assert.ok(details.endsWith(NOT_SYNCED_NOTICE));
    assert.ok(url.href.length < 8000, `URL too long: ${url.href.length}`);
  });

  it("never splits an emoji when truncating, and survives lone surrogates", () => {
    assert.equal(truncate("😀😀😀", 2), "😀…");
    const url = parse(
      buildGoogleCalendarEventUrl({ ...BLOCK, title: "bad \uD800 title" }),
    );
    assert.equal(url.searchParams.get("text"), "bad � title");
  });

  it("returns null for unparseable or inverted times", () => {
    assert.equal(buildGoogleCalendarEventUrl({ ...BLOCK, start: "nope" }), null);
    assert.equal(
      buildGoogleCalendarEventUrl({ ...BLOCK, end: BLOCK.start }),
      null,
    );
  });

  it("is deterministic", () => {
    assert.equal(
      buildGoogleCalendarEventUrl(BLOCK),
      buildGoogleCalendarEventUrl({ ...BLOCK }),
    );
  });
});

describe("task notes stay out of the link unless the user opts in", () => {
  const SECRET = "Confidential: salary negotiation with Dana";

  it("omits notes by default — title and times only", () => {
    const raw = buildGoogleCalendarEventUrl({ ...BLOCK, notes: SECRET }) ?? "";
    const url = parse(raw);
    assert.equal(url.searchParams.get("text"), BLOCK.title);
    assert.equal(url.searchParams.get("dates"), "20261110T140000Z/20261110T143000Z");
    assert.equal(
      url.searchParams.get("details"),
      `Planned in AI Planner — a 30-minute focus block.\n\n${NOT_SYNCED_NOTICE}`,
    );
    assert.ok(!raw.includes("salary"));
    assert.ok(!raw.includes(encodeURIComponent("salary")));
    assert.ok(!decodeURIComponent(raw).includes(SECRET));
  });

  it("omits notes when includeNotes is false explicitly", () => {
    const raw =
      buildGoogleCalendarEventUrl({ ...BLOCK, notes: SECRET }, { includeNotes: false }) ?? "";
    assert.ok(!decodeURIComponent(raw).includes(SECRET));
    assert.equal(buildEventDetails({ notes: SECRET, durationMinutes: 30 }).includes(SECRET), false);
  });

  it("includes notes only with includeNotes: true", () => {
    const url = parse(
      buildGoogleCalendarEventUrl({ ...BLOCK, notes: SECRET }, { includeNotes: true }),
    );
    assert.ok(url.searchParams.get("details")?.includes(SECRET));
  });
});
