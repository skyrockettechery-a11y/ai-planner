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
 *
 * Privacy: everything in the link is part of its URL. Opening it sends that
 * text to Google and leaves it in browser history, even if the event is never
 * saved. So the link carries only the task title and times by default; task
 * notes are added only when the user explicitly opts in (`includeNotes`).
 */

export const GOOGLE_CALENDAR_RENDER_ENDPOINT =
  "https://calendar.google.com/calendar/render";

/**
 * Caps keep the whole URL well under the ~8 KB that Google's front end
 * accepts, even when every character is a 3-byte UTF-8 code point
 * percent-encoded to 9 characters.
 */
export const MAX_TITLE_LENGTH = 200;
export const MAX_DETAILS_LENGTH = 500;

export const NOT_SYNCED_NOTICE =
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

/**
 * Replaces lone UTF-16 surrogates with U+FFFD. `encodeURIComponent` throws on
 * them, and one malformed character must not break the whole link.
 */
export function toWellFormed(value: string): string {
  return Array.from(value)
    .map((char) =>
      char.length === 1 && char >= "\uD800" && char <= "\uDFFF" ? "\uFFFD" : char,
    )
    .join("");
}

/** Truncates by code point so a surrogate pair (e.g. an emoji) is never split. */
export function truncate(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length <= max ? value : `${chars.slice(0, max - 1).join("")}…`;
}

export interface CalendarLinkOptions {
  /**
   * Put the task's notes in the event details. Off by default: notes may be
   * private, and URL contents end up at Google and in browser history.
   */
  includeNotes?: boolean;
}

export function buildEventDetails(
  block: { notes: string; durationMinutes: number },
  options: CalendarLinkOptions = {},
): string {
  const header = `Planned in AI Planner — a ${block.durationMinutes}-minute focus block.`;
  const footer = `\n\n${NOT_SYNCED_NOTICE}`;
  const notes = options.includeNotes ? toWellFormed(block.notes.trim()) : "";
  if (!notes) return `${header}${footer}`;

  // Long notes are shortened, never the header or the not-synced notice.
  const room =
    MAX_DETAILS_LENGTH - Array.from(header).length - Array.from(footer).length - 2;
  return `${header}\n\n${truncate(notes, Math.max(room, 1))}${footer}`;
}

/**
 * A prefilled Google Calendar event-creation URL for one suggested block,
 * or `null` if the block's times can't be parsed or are out of order
 * (nothing is better than a link to the wrong time).
 *
 * Values are percent-encoded with `encodeURIComponent` (spaces become `%20`,
 * never `+`), and the `dates` separator stays a literal `/` as in Google's
 * documented format.
 */
export function buildGoogleCalendarEventUrl(
  block: Pick<ScheduleBlock, "title" | "notes" | "start" | "end" | "durationMinutes">,
  options: CalendarLinkOptions = {},
): string | null {
  const start = toGoogleUtcStamp(block.start);
  const end = toGoogleUtcStamp(block.end);
  if (!start || !end || Date.parse(block.end) <= Date.parse(block.start)) {
    return null;
  }

  const title = truncate(
    toWellFormed(block.title.trim()) || "Untitled task",
    MAX_TITLE_LENGTH,
  );
  const query = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(title)}`,
    `dates=${start}/${end}`,
    `details=${encodeURIComponent(buildEventDetails(block, options))}`,
  ].join("&");

  return `${GOOGLE_CALENDAR_RENDER_ENDPOINT}?${query}`;
}
