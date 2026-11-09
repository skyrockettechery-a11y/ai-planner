"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePlanPreferences } from "@/hooks/usePlanPreferences";
import {
  availabilityFromErrorCode,
  availabilityFromNetworkFailure,
} from "@/lib/schedule/availability";
import {
  adjustBlock,
  clampDurationMinutes,
  computePlanningWindow,
  conflictsByTask,
  DEFAULT_SCHEDULE_SETTINGS,
  findScheduleConflicts,
  generateSchedule,
  normalizeScheduleSettings,
} from "@/lib/schedule/engine";
import type { PlanningWindow } from "@/lib/schedule/engine";
import {
  isCalendarErrorCode,
  type BusyPeriod,
  type BusyResponse,
} from "@/types/calendar";
import type {
  ScheduleAvailability,
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

interface BusyFetchResult {
  busy: BusyPeriod[];
  availability: ScheduleAvailability;
  message: string | null;
}

async function fetchBusyPeriods(window: PlanningWindow): Promise<BusyFetchResult> {
  const query = new URLSearchParams({
    timeMin: new Date(window.start).toISOString(),
    timeMax: new Date(window.end).toISOString(),
  });

  try {
    const response = await fetch(`/api/google-calendar/busy?${query}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      let code: unknown;
      try {
        ({ error: code } = (await response.json()) as { error?: unknown });
      } catch {
        code = undefined;
      }
      const outcome = isCalendarErrorCode(code)
        ? availabilityFromErrorCode(code)
        : availabilityFromNetworkFailure();
      // Busy time is unknown, not empty — the caller must warn, not assume.
      return { busy: [], ...outcome };
    }
    const body = (await response.json()) as BusyResponse;
    return { busy: body.busy ?? [], availability: "live", message: null };
  } catch {
    return { busy: [], ...availabilityFromNetworkFailure() };
  }
}

export function useDailySchedule(activeTasks: Task[]) {
  const { preferences } = usePlanPreferences();

  const [settings, setSettings] = useState<ScheduleSettings>(
    DEFAULT_SCHEDULE_SETTINGS,
  );
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [busy, setBusy] = useState<BusyPeriod[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    null,
  );
  const [evaluatedAt, setEvaluatedAt] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** Drops responses from a superseded Generate/Refresh click. */
  const requestIdRef = useRef(0);

  const updateSettings = useCallback((patch: Partial<ScheduleSettings>) => {
    setSettings((current) =>
      normalizeScheduleSettings({ ...current, ...patch }),
    );
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    setDraft(null);
    setBusy([]);
    setAvailabilityMessage(null);
    setEvaluatedAt(null);
    setDurations({});
    setGenerating(false);
    setRefreshing(false);
  }, []);

  const generate = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    const now = new Date();
    const window = computePlanningWindow(now, settings);

    setGenerating(true);
    const result = await fetchBusyPeriods(window);
    if (requestIdRef.current !== requestId) return;

    setBusy(result.busy);
    setAvailabilityMessage(result.message);
    setDraft(
      generateSchedule({
        tasks: activeTasks,
        mode: preferences.mode,
        dismissedIds: preferences.dismissedIds,
        busy: result.busy,
        availability: result.availability,
        now,
        settings,
        durations,
      }),
    );
    setEvaluatedAt(new Date());
    setGenerating(false);
  }, [activeTasks, durations, preferences.dismissedIds, preferences.mode, settings]);

  /**
   * Re-checks the calendar without re-packing, so hand adjustments survive.
   * Offered after the user returns from saving an event in Google Calendar.
   */
  const refreshAvailability = useCallback(async () => {
    if (!draft) return;
    const requestId = (requestIdRef.current += 1);

    setRefreshing(true);
    const result = await fetchBusyPeriods({
      start: Date.parse(draft.windowStart),
      end: Date.parse(draft.windowEnd),
      earliest: Date.parse(draft.earliestStart),
    });
    if (requestIdRef.current !== requestId) return;

    setBusy(result.busy);
    setAvailabilityMessage(result.message);
    setDraft((current) =>
      current ? { ...current, availability: result.availability } : current,
    );
    setEvaluatedAt(new Date());
    setRefreshing(false);
  }, [draft]);

  /** Local day the draft is anchored to, used to re-place adjusted blocks. */
  const planningDay = useMemo(
    () => (draft ? new Date(draft.windowStart) : null),
    [draft],
  );

  const setBlockStart = useCallback(
    (taskId: string, startMinute: number) => {
      setDraft((current) => {
        if (!current) return current;
        const anchor = new Date(current.windowStart);
        return {
          ...current,
          blocks: current.blocks.map((block) =>
            block.taskId === taskId
              ? adjustBlock(block, { startMinute }, anchor)
              : block,
          ),
        };
      });
      setEvaluatedAt(new Date());
    },
    [],
  );

  const setBlockDuration = useCallback((taskId: string, minutes: number) => {
    const durationMinutes = clampDurationMinutes(minutes);
    setDurations((current) => ({ ...current, [taskId]: durationMinutes }));
    setDraft((current) => {
      if (!current) return current;
      const anchor = new Date(current.windowStart);
      return {
        ...current,
        blocks: current.blocks.map((block) =>
          block.taskId === taskId
            ? adjustBlock(block, { durationMinutes }, anchor)
            : block,
        ),
      };
    });
    setEvaluatedAt(new Date());
  }, []);

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

  return {
    settings,
    updateSettings,
    durations,
    draft,
    planningDay,
    conflicts,
    conflictsByTaskId,
    availabilityMessage,
    generating,
    refreshing,
    generate,
    refreshAvailability,
    clear,
    setBlockStart,
    setBlockDuration,
  };
}
