/**
 * SERVER ONLY. Google Calendar FreeBusy query (Mission 11).
 * Returns only busy intervals for the user's primary calendar —
 * no event titles, attendees, or descriptions.
 */
import type { BusyPeriod } from "@/types/calendar";

const FREEBUSY_ENDPOINT = "https://www.googleapis.com/calendar/v3/freeBusy";

/** Longest window accepted from the client (7 days + DST/zone slack). */
export const MAX_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

interface FreeBusyResponse {
  calendars?: Record<
    string,
    {
      busy?: { start?: string; end?: string }[];
      errors?: { domain?: string; reason?: string }[];
    }
  >;
}

export function parseWindow(
  timeMinRaw: string | null,
  timeMaxRaw: string | null,
): { timeMin: string; timeMax: string } | null {
  if (!timeMinRaw || !timeMaxRaw) return null;
  const min = new Date(timeMinRaw);
  const max = new Date(timeMaxRaw);
  const minMs = min.getTime();
  const maxMs = max.getTime();
  if (Number.isNaN(minMs) || Number.isNaN(maxMs)) return null;
  if (maxMs <= minMs || maxMs - minMs > MAX_WINDOW_MS) return null;
  return { timeMin: min.toISOString(), timeMax: max.toISOString() };
}

export async function queryPrimaryBusy(params: {
  accessToken: string;
  timeMin: string;
  timeMax: string;
}): Promise<BusyPeriod[]> {
  const response = await fetch(FREEBUSY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      items: [{ id: "primary" }],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GoogleApiError(
      `Google FreeBusy returned ${response.status}`,
      response.status,
    );
  }

  const json = (await response.json()) as FreeBusyResponse;
  const calendar = json.calendars?.primary;
  if (!calendar || (calendar.errors && calendar.errors.length > 0)) {
    throw new GoogleApiError("Google FreeBusy returned calendar errors", 502);
  }

  return (calendar.busy ?? [])
    .filter(
      (period): period is { start: string; end: string } =>
        typeof period.start === "string" && typeof period.end === "string",
    )
    .map((period) => ({ start: period.start, end: period.end }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
