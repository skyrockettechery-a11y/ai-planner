"use client";

import { QUADRANT_META } from "@/lib/quadrants";
import type { Task } from "@/types/task";

interface DoingNowSectionProps {
  task: Task | null;
  onClear: () => void;
  onComplete: (id: string) => void;
}

export function DoingNowSection({
  task,
  onClear,
  onComplete,
}: DoingNowSectionProps) {
  return (
    <section
      aria-label="Doing now"
      className="rounded-xl border border-zinc-900 bg-zinc-900/[0.03] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Focus
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900 sm:text-xl">
            Doing Now
          </h2>
        </div>
        {task && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Clear
          </button>
        )}
      </div>

      {task ? (
        <div className="mt-4">
          <p className="text-base font-medium text-zinc-900">{task.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {QUADRANT_META[task.quadrant].shortLabel}
          </p>
          <button
            type="button"
            onClick={() => onComplete(task.id)}
            className="mt-4 min-h-11 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 sm:w-auto sm:min-w-[8rem]"
          >
            Done
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          Tap <span className="font-medium text-zinc-800">Start</span> on any
          active task to focus on it here.
        </p>
      )}
    </section>
  );
}
