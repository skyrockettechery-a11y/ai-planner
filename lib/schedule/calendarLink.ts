import type { ScheduleBlock } from "@/types/schedule";

/**
 * Google Calendar event-creation links (Mission 12 / P2A).
 *
 * P2A deliberately does not write to Google Calendar. This builds a prefilled
 * link to Google's own event-creation page, so the user reviews and saves the
 * event themselves inside Google Calendar. No extra OAuth scope is involved
 * and AI Planner never calls the event-write API.
 *
 * Times are emitted as UTC instants (`...Z`), which is the unambiguous form:
 * Google renders them in the user's own calendar time zone, so no `ctz`
 * parameter — and no guess about the viewer's zone — is required.
 */

const RENDER_ENDPOINT = "https://calendar.google.com/calendar/render";

/** Longest title/notes Google reliably accepts in a template URL. */
const MAX_TITLE_LENGTH = 300;
const MAX_DETAILS_LENGTH = 1000;

const NOT_SYNCED_NOTICE =
  "This is a one-time copy. It does not stay in sync with the AI Planner task.";

/** `YYYYMMDDTHHMMSSZ` — Google's basic-format UTC timestamp. */
export function toGoogleUtcStamp(iso: string): string | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function buildEventDetails(block: {
  notes: string;
  durationMinutes: number;
}): string {
  const parts = [
    `Planned in AI Planner — a ${block.durationMinutes}-minute focus block.`,
  ];
  const notes = block.notes.trim();
  if (notes) parts.push("", notes);
  parts.push("", NOT_SYNCED_NOTICE);
  return truncate(parts.join("\n"), MAX_DETAILS_LENGTH);
}

/**
 * A prefilled Google Calendar event-creation URL for one suggested block,
 * or `null` if the block's times can't be parsed (nothing is better than a
 * link to the wrong time).
 */
export function buildGoogleCalendarEventUrl(
  block: Pick<ScheduleBlock, "title" | "notes" | "start" | "end" | "durationMinutes">,
): string | null {
  const start = toGoogleUtcStamp(block.start);
  const end = toGoogleUtcStamp(block.end);
  if (!start || !end) return null;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: truncate(block.title.trim() || "Untitled task", MAX_TITLE_LENGTH),
    dates: `${start}/${end}`,
    details: buildEventDetails(block),
  });

  return `${RENDER_ENDPOINT}?${params.toString()}`;
}
