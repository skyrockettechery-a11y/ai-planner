/**
 * SERVER ONLY. Google Calendar FreeBusy query (Mission 11).
 * Returns only busy intervals for the user's primary calendar —
 * no event titles, attendees, or descriptions.
 */
import "server-only";

import { GoogleApiError } from "@/lib/googleCalendar/errors";
import type { BusyPeriod } from "@/types/calendar";

const FREEBUSY_ENDPOINT = "https://www.googleapis.com/calendar/v3/freeBusy";

/** Longest window accepted from the client (7 days + DST/zone slack). */
export const MAX_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;

/** Google's standard JSON error body (v1 `errors[]` plus AIP-193 `details[]`). */
interface GoogleErrorBody {
  error?: {
    errors?: { reason?: string }[];
    details?: { reason?: string }[];
  };
}

async function readErrorReasons(response: Response): Promise<string[]> {
  try {
    const body = (await response.json()) as GoogleErrorBody;
    return [...(body.error?.errors ?? []), ...(body.error?.details ?? [])]
      .map((entry) => entry.reason)
      .filter((reason): reason is string => typeof reason === "string");
  } catch {
    return [];
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
  let response: Response;
  try {
    response = await fetch(FREEBUSY_ENDPOINT, {
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
  } catch {
    throw new GoogleApiError("Google FreeBusy unreachable", 0, []);
  }

  if (!response.ok) {
    throw new GoogleApiError(
      `Google FreeBusy returned ${response.status}`,
      response.status,
      await readErrorReasons(response),
    );
  }

  let json: FreeBusyResponse;
  try {
    json = (await response.json()) as FreeBusyResponse;
  } catch {
    throw new GoogleApiError("Google FreeBusy returned invalid JSON", 200, []);
  }
  const calendar = json.calendars?.primary;
  if (!calendar) {
    throw new GoogleApiError("Google FreeBusy omitted the primary calendar", 200, []);
  }
  if (calendar.errors && calendar.errors.length > 0) {
    // Per-calendar errors arrive inside a 200 (e.g. notFound, backendError).
    throw new GoogleApiError(
      "Google FreeBusy returned calendar errors",
      200,
      calendar.errors
        .map((entry) => entry.reason)
        .filter((reason): reason is string => typeof reason === "string"),
    );
  }

  return (calendar.busy ?? [])
    .filter(
      (period): period is { start: string; end: string } =>
        typeof period.start === "string" && typeof period.end === "string",
    )
    .map((period) => ({ start: period.start, end: period.end }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
