"use client";

import { useCallback, useEffect, useState } from "react";
import {
  computeCalendarWindow,
  groupBusyByDay,
  type DayBusy,
} from "@/lib/calendarWindow";
import {
  CALENDAR_ERROR_MESSAGES,
  isCalendarErrorCode,
  type BusyResponse,
  type CalendarErrorCode,
  type CalendarRange,
  type CalendarStatus,
} from "@/types/calendar";

/**
 * Client state for Google Calendar availability (Mission 11).
 * Talks only to AI Planner's own /api/google-calendar/* routes; no Google
 * credentials or tokens ever reach the browser.
 */

const CONNECTED_PARAM = "calendar";
const ERROR_PARAM = "calendar_error";

export type CalendarFeedback =
  | { kind: "connected"; message: string }
  | { kind: "error"; message: string };

function readFeedbackFromUrl(): CalendarFeedback | null {
  if (typeof window === "undefined") return null;
  const params = new URL(window.location.href).searchParams;
  if (params.get(CONNECTED_PARAM) === "connected") {
    return { kind: "connected", message: "Google Calendar connected." };
  }
  const error = params.get(ERROR_PARAM);
  if (error) {
    const code: CalendarErrorCode = isCalendarErrorCode(error) ? error : "unknown";
    return { kind: "error", message: CALENDAR_ERROR_MESSAGES[code] };
  }
  return null;
}

function cleanFeedbackFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CONNECTED_PARAM) && !url.searchParams.has(ERROR_PARAM)) {
    return;
  }
  url.searchParams.delete(CONNECTED_PARAM);
  url.searchParams.delete(ERROR_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

async function readErrorCode(response: Response): Promise<CalendarErrorCode> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return isCalendarErrorCode(body.error) ? body.error : "unknown";
  } catch {
    return "unknown";
  }
}

type StatusResult = { status: CalendarStatus } | { error: string };

async function fetchCalendarStatus(): Promise<StatusResult> {
  try {
    const response = await fetch("/api/google-calendar/status", {
      cache: "no-store",
    });
    if (!response.ok) {
      return { error: CALENDAR_ERROR_MESSAGES[await readErrorCode(response)] };
    }
    return { status: (await response.json()) as CalendarStatus };
  } catch {
    return { error: CALENDAR_ERROR_MESSAGES.unknown };
  }
}

export interface BusyState {
  range: CalendarRange;
  days: DayBusy[];
}

export function useGoogleCalendar() {
  const [feedback, setFeedback] = useState<CalendarFeedback | null>(() =>
    readFeedbackFromUrl(),
  );
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [busy, setBusy] = useState<BusyState | null>(null);
  const [busyLoading, setBusyLoading] = useState(false);
  const [busyError, setBusyError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const markDisconnected = useCallback(() => {
    setBusy(null);
    setStatus((current) =>
      current ? { ...current, connected: false, connectedAt: null } : current,
    );
  }, []);

  const loadBusy = useCallback(
    async (range: CalendarRange) => {
      const planWindow = computeCalendarWindow(range, new Date());
      setBusyLoading(true);
      setBusyError(null);
      try {
        const query = new URLSearchParams({
          timeMin: planWindow.timeMin,
          timeMax: planWindow.timeMax,
        });
        const response = await fetch(`/api/google-calendar/busy?${query}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const code = await readErrorCode(response);
          if (code === "reauth_required" || code === "not_connected") {
            markDisconnected();
          }
          // Drop the previous range's results so they can't be mistaken for
          // the range that just failed.
          setBusy(null);
          setBusyError(CALENDAR_ERROR_MESSAGES[code]);
          return;
        }
        const body = (await response.json()) as BusyResponse;
        setBusy({ range, days: groupBusyByDay(body.busy, planWindow.days) });
      } catch {
        setBusy(null);
        setBusyError(CALENDAR_ERROR_MESSAGES.unknown);
      } finally {
        setBusyLoading(false);
      }
    },
    [markDisconnected],
  );

  useEffect(() => {
    cleanFeedbackFromUrl();
    // State is only set from the async result, never synchronously in the
    // effect body; `active` drops results after unmount (or a Strict Mode
    // re-run).
    let active = true;
    void fetchCalendarStatus().then((result) => {
      if (!active) return;
      setStatusLoading(false);
      if ("error" in result) {
        setStatusError(result.error);
        return;
      }
      setStatus(result.status);
      setStatusError(null);
      if (result.status.connected) {
        void loadBusy("today");
      }
    });
    return () => {
      active = false;
    };
  }, [loadBusy]);

  const connect = useCallback(() => {
    // A full document navigation is required: this API route redirects
    // off-site to Google's consent screen, which router.push() can't follow.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/google-calendar/connect");
  }, []);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    setBusyError(null);
    try {
      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) {
        const code = await readErrorCode(response);
        setBusyError(CALENDAR_ERROR_MESSAGES[code]);
        return;
      }
      markDisconnected();
      setFeedback(null);
    } catch {
      setBusyError(CALENDAR_ERROR_MESSAGES.unknown);
    } finally {
      setDisconnecting(false);
    }
  }, [markDisconnected]);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  return {
    feedback,
    dismissFeedback,
    status,
    statusLoading,
    statusError,
    busy,
    busyLoading,
    busyError,
    disconnecting,
    connect,
    disconnect,
    loadBusy,
  };
}
