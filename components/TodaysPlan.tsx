"use client";

import { useMemo } from "react";
import { buildDailyPlan } from "@/lib/dailyPlan";
import { QUADRANT_META } from "@/lib/quadrants";
import { useDoingNow } from "@/hooks/useDoingNow";
import { usePlanPreferences } from "@/hooks/usePlanPreferences";
import type { Task } from "@/types/task";
import type { RecommendationMode } from "@/types/planPreferences";

interface TodaysPlanProps {
  activeTasks: Task[];
}

const MODE_OPTIONS: { value: RecommendationMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "urgency", label: "Urgency" },
  { value: "importance", label: "Importance" },
];

const actionLinkClass =
  "text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-40";

const actionButtonClass =
  "min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors";

export function TodaysPlan({ activeTasks }: TodaysPlanProps) {
  const { setDoingNow } = useDoingNow();
  const {
    preferences,
    setMode,
    dismissOne,
    dismissAll,
    resetDismissed,
    setHidden,
  } = usePlanPreferences();

  const handleStart = (taskId: string) => {
    setDoingNow(taskId);
  };

  const plan = useMemo(
    () =>
      buildDailyPlan(activeTasks, {
        mode: preferences.mode,
        dismissedIds: preferences.dismissedIds,
      }),
    [activeTasks, preferences.mode, preferences.dismissedIds],
  );

  const recommendationIds = plan.recommendations.map((item) => item.task.id);
  const hasDismissed = preferences.dismissedIds.length > 0;

  if (preferences.hidden) {
    return (
      <section
        aria-label="Today's plan"
        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
      >
        <p className="text-sm text-zinc-600">Today&apos;s Plan is hidden</p>
        <button
          type="button"
          onClick={() => setHidden(false)}
          className={`${actionButtonClass} border border-zinc-200 text-zinc-800 hover:bg-zinc-50`}
        >
          Show
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Today's plan"
      className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Assistant
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900 sm:text-xl">
            Today&apos;s Plan
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Suggestions only — dismiss or change mode anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className={`${actionButtonClass} shrink-0 border border-zinc-200 text-zinc-600 hover:bg-zinc-50`}
        >
          Hide
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
          role="tablist"
          aria-label="Recommendation mode"
        >
          {MODE_OPTIONS.map((option) => {
            const selected = preferences.mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMode(option.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                  selected
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => dismissAll(recommendationIds)}
            disabled={recommendationIds.length === 0}
            className={actionLinkClass}
          >
            Dismiss all
          </button>
          {hasDismissed && (
            <button
              type="button"
              onClick={resetDismissed}
              className={actionLinkClass}
            >
              Reset dismissed
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-700">{plan.summary}</p>

      {plan.warning && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {plan.warning}
        </p>
      )}

      {plan.recommendations.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {plan.recommendations.map((item, index) => {
            const meta = QUADRANT_META[item.task.quadrant];
            return (
              <li
                key={item.task.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {item.task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {meta.shortLabel}
                      {item.task.dueDate && (
                        <>
                          {" "}
                          · Due{" "}
                          {new Date(
                            `${item.task.dueDate}T00:00:00`,
                          ).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      {item.reason}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStart(item.task.id)}
                        className={`${actionButtonClass} bg-zinc-900 text-white hover:bg-zinc-700`}
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissOne(item.task.id)}
                        className={`${actionButtonClass} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100`}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          {activeTasks.length === 0
            ? "No active tasks to recommend yet. Add a task to see suggestions."
            : hasDismissed
              ? "No suggestions showing. Reset dismissed or add more active tasks."
              : "No matching suggestions for this mode right now."}
        </p>
      )}
    </section>
  );
}
