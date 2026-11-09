"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanPreferences } from "@/hooks/usePlanPreferences";
import { fetchScheduleBusy } from "@/lib/schedule/availability";
import {
  adjustBlock,
  clampDurationMinutes,
  conflictsByTask,
  DEFAULT_SCHEDULE_SETTINGS,
  findScheduleConflicts,
  normalizeScheduleSettings,
  reconcileDraftWithTasks,
} from "@/lib/schedule/engine";
import { buildFreshSchedule } from "@/lib/schedule/freshSchedule";
import {
  getCalendarLinkGate,
  LINK_BLOCKED_CONFLICT,
  type CalendarLinkGate,
} from "@/lib/schedule/linkGate";
import type { BusyPeriod } from "@/types/calendar";
import type {
  ScheduleBlock,
  ScheduleDraft,
  ScheduleSettings,
} from "@/types/schedule";
import type { Task } from "@/types/task";

/**
 * Transient Smart Daily Schedule state (Mission 12 / P2A).
 *
 * Drafts live in React state only — never Supabase, never localStorage. They
 * disappear on reload, and `PlannerApp` remounts this hook on account change
 * or Google Calendar disconnect so a draft can never outlive the context it
 * was built in.
 *
 * Availability comes from the existing authenticated
 * `/api/google-calendar/busy` route; no new endpoint and no new OAuth scope.
 */

export type SchedulePending = "generate" | "refresh" | null;

/**
 * How often the "starts before now" check is re-run while a draft is shown,
 * so a page left open can't keep offering calendar links for blocks that
 * have slipped into the past. It is also re-run when the tab regains focus
 * and, for the link itself, at click time.
 */
export const CLOCK_RECHECK_MS = 30_000;

export interface UseDailyScheduleOptions {
  /**
   * Called when the busy route reports that Google Calendar access was
   * revoked or expired (the server has already dropped the stored
   * connection), so the Calendar card can re-check its status.
   */
  onCalendarAccessLost?: () => void;
}

export function useDailySchedule(
  activeTasks: Task[],
  options: UseDailyScheduleOptions = {},
) {
  const { onCalendarAccessLost } = options;
  const { preferences } = usePlanPreferences();

  const [settings, setSettings] = useState<ScheduleSettings>(
    DEFAULT_SCHEDULE_SETTINGS,
  );
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [rawDraft, setRawDraft] = useState<ScheduleDraft | null>(null);
  const [busy, setBusy] = useState<BusyPeriod[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    null,
  );
  /** Instant the "starts before now" check is evaluated against. */
  const [evaluatedAt, setEvaluatedAt] = useState<Date | null>(null);
  const [pending, setPending] = useState<SchedulePending>(null);

  /** Drops responses from a superseded request (or after `clear`). */
  const requestIdRef = useRef(0);

  const updateSettings = useCallback((patch: Partial<ScheduleSettings>) => {
    setSettings((current) =>
      normalizeScheduleSettings({ ...current, ...patch }),
    );
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    setRawDraft(null);
    setBusy([]);
    setAvailabilityMessage(null);
    setEvaluatedAt(null);
    setDurations({});
    setPending(null);
  }, []);

  const generate = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    setPending("generate");

    // Blocks are placed — and the "past" check runs — against the time
    // *after* the calendar responds, so a slow request can't leave blocks
    // that already started looking valid.
    const { draft: next, busyResult, now } = await buildFreshSchedule({
      tasks: activeTasks,
      mode: preferences.mode,
      dismissedIds: preferences.dismissedIds,
      settings,
      durations,
      fetchBusy: (window) => fetchScheduleBusy(window),
      clock: () => new Date(),
    });
    if (requestIdRef.current !== requestId) return;

    setBusy(busyResult.busy);
    setAvailabilityMessage(busyResult.message);
    setRawDraft(next);
    setEvaluatedAt(now);
    setPending(null);
    if (busyResult.errorCode === "reauth_required") onCalendarAccessLost?.();
  }, [
    activeTasks,
    durations,
    onCalendarAccessLost,
    preferences.dismissedIds,
    preferences.mode,
    settings,
  ]);

  /**
   * Re-checks the calendar without re-packing, so hand adjustments survive.
   * Offered after the user returns from saving an event in Google Calendar.
   */
  const refreshAvailability = useCallback(async () => {
    if (!rawDraft) return;
    const requestId = (requestIdRef.current += 1);

    setPending("refresh");
    const result = await fetchScheduleBusy({
      start: Date.parse(rawDraft.windowStart),
      end: Date.parse(rawDraft.windowEnd),
    });
    if (requestIdRef.current !== requestId) return;

    setBusy(result.busy);
    setAvailabilityMessage(result.message);
    setRawDraft((current) =>
      current ? { ...current, availability: result.availability } : current,
    );
    setEvaluatedAt(new Date());
    setPending(null);
    if (result.errorCode === "reauth_required") onCalendarAccessLost?.();
  }, [onCalendarAccessLost, rawDraft]);

  const updateBlock = useCallback(
    (
      taskId: string,
      changes: { startMinute?: number; durationMinutes?: number },
    ) => {
      setRawDraft((current) => {
        if (!current) return current;
        // Re-anchor to the draft's own local day, not "today", so a draft
        // left open past midnight is still edited on the day it describes.
        const anchor = new Date(current.windowStart);
        // Order is left as generated: re-sorting while the user types a time
        // would move the focused input. Overlaps are flagged as conflicts.
        const blocks: ScheduleBlock[] = current.blocks.map((block) =>
          block.taskId === taskId ? adjustBlock(block, changes, anchor) : block,
        );
        return { ...current, blocks };
      });
      setEvaluatedAt(new Date());
    },
    [],
  );

  const setBlockStart = useCallback(
    (taskId: string, startMinute: number) =>
      updateBlock(taskId, { startMinute }),
    [updateBlock],
  );

  const setBlockDuration = useCallback(
    (taskId: string, minutes: number) => {
      const durationMinutes = clampDurationMinutes(minutes);
      // Remembered so Regenerate keeps the length the user chose.
      setDurations((current) => ({ ...current, [taskId]: durationMinutes }));
      updateBlock(taskId, { durationMinutes });
    },
    [updateBlock],
  );

  /** Re-runs time-based checks against the current clock. */
  const recheckClock = useCallback(() => setEvaluatedAt(new Date()), []);

  const hasDraft = rawDraft !== null;
  useEffect(() => {
    if (!hasDraft) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") recheckClock();
    };
    const timer = window.setInterval(recheckClock, CLOCK_RECHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", recheckClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recheckClock);
    };
  }, [hasDraft, recheckClock]);

  /** The draft as shown: hides tasks completed, deleted or dismissed since. */
  const draft = useMemo(
    () =>
      rawDraft
        ? reconcileDraftWithTasks(
            rawDraft,
            activeTasks,
            preferences.dismissedIds,
          )
        : null,
    [activeTasks, preferences.dismissedIds, rawDraft],
  );

  const conflicts = useMemo(() => {
    if (!draft || !evaluatedAt) return [];
    return findScheduleConflicts({
      blocks: draft.blocks,
      busy,
      availability: draft.availability,
      now: evaluatedAt,
      windowStart: draft.windowStart,
      windowEnd: draft.windowEnd,
    });
  }, [busy, draft, evaluatedAt]);

  const conflictsByTaskId = useMemo(
    () => conflictsByTask(conflicts),
    [conflicts],
  );

  /**
   * Gate for one block's calendar link evaluated at `now` — called with a
   * fresh clock at click time, so a stale render can't hand off a block that
   * has since moved into the past.
   */
  const calendarLinkGateAt = useCallback(
    (taskId: string, now: Date): CalendarLinkGate => {
      if (!draft) return { enabled: false, reason: LINK_BLOCKED_CONFLICT };
      return getCalendarLinkGate({
        taskId,
        blocks: draft.blocks,
        busy,
        availability: draft.availability,
        windowStart: draft.windowStart,
        windowEnd: draft.windowEnd,
        now,
      });
    },
    [busy, draft],
  );

  return {
    settings,
    updateSettings,
    durations,
    draft,
    conflicts,
    conflictsByTaskId,
    availabilityMessage,
    pending,
    generate,
    refreshAvailability,
    recheckClock,
    calendarLinkGateAt,
    clear,
    setBlockStart,
    setBlockDuration,
  };
}
