"use client";

import { useMemo, useState } from "react";
import { QuadrantBoard } from "@/components/QuadrantBoard";
import { TaskListView } from "@/components/TaskListView";
import { sortTasks } from "@/lib/sortTasks";
import { pinDoingNowFirst } from "@/lib/tasks";
import type { Quadrant, Task, TaskInput } from "@/types/task";
import type { ActiveTaskViewMode, TaskSortOption } from "@/types/view";

interface ActiveTasksSectionProps {
  tasks: Task[];
  doingNowId: string | null;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onEdit: (id: string, updates: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onQuadrantChange: (id: string, quadrant: Quadrant) => void;
}

const VIEW_OPTIONS: { value: ActiveTaskViewMode; label: string }[] = [
  { value: "quadrant", label: "Quadrant" },
  { value: "list", label: "List" },
];

const SORT_OPTIONS: { value: TaskSortOption; label: string }[] = [
  { value: "due-date", label: "Due date" },
  { value: "importance", label: "Importance" },
  { value: "urgency", label: "Urgency" },
];

export function ActiveTasksSection({
  tasks,
  doingNowId,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onQuadrantChange,
}: ActiveTasksSectionProps) {
  const [view, setView] = useState<ActiveTaskViewMode>("quadrant");
  const [sortBy, setSortBy] = useState<TaskSortOption>("due-date");

  const pinnedTasks = useMemo(
    () => pinDoingNowFirst(tasks, doingNowId),
    [tasks, doingNowId],
  );

  const sortedTasks = useMemo(
    () =>
      view === "list"
        ? pinDoingNowFirst(sortTasks(tasks, sortBy), doingNowId)
        : pinnedTasks,
    [tasks, view, sortBy, doingNowId, pinnedTasks],
  );

  const taskHandlers = {
    doingNowId,
    onStart,
    onComplete,
    onEdit,
    onDelete,
    onQuadrantChange,
  };

  return (
    <section aria-label="Active tasks">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Active tasks
        </h2>

        <div className="flex flex-col gap-2 sm:items-end">
          <div
            className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5"
            role="tablist"
            aria-label="Active task view"
          >
            {VIEW_OPTIONS.map((option) => {
              const selected = view === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setView(option.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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

          {view === "list" && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="active-task-sort"
                className="text-xs font-medium text-zinc-500"
              >
                Sort by
              </label>
              <select
                id="active-task-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TaskSortOption)}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {view === "quadrant" ? (
        <QuadrantBoard tasks={pinnedTasks} {...taskHandlers} />
      ) : (
        <TaskListView tasks={sortedTasks} {...taskHandlers} />
      )}
    </section>
  );
}
