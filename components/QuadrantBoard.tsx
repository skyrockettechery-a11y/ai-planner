"use client";

import { QUADRANT_META, QUADRANTS } from "@/lib/quadrants";
import { groupByQuadrant } from "@/lib/tasks";
import type { Quadrant, Task, TaskInput } from "@/types/task";
import { TaskItem } from "./TaskItem";

interface QuadrantBoardProps {
  tasks: Task[];
  doingNowId: string | null;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onEdit: (id: string, updates: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onQuadrantChange: (id: string, quadrant: Quadrant) => void;
}

const QUADRANT_ACCENT: Record<Quadrant, string> = {
  "important-urgent": "border-t-red-400",
  "important-not-urgent": "border-t-blue-400",
  "not-important-urgent": "border-t-amber-400",
  "not-important-not-urgent": "border-t-zinc-300",
};

export function QuadrantBoard({
  tasks,
  doingNowId,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onQuadrantChange,
}: QuadrantBoardProps) {
  const grouped = groupByQuadrant(tasks);

  if (tasks.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center">
        <p className="text-sm text-zinc-500">
          No active tasks yet. Add one above to get started.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Task quadrants" className="grid gap-4 lg:grid-cols-2">
      {QUADRANTS.map((quadrant) => {
        const meta = QUADRANT_META[quadrant];
        const quadrantTasks = grouped[quadrant];

        return (
          <div
            key={quadrant}
            className={`rounded-xl border border-zinc-200 border-t-4 bg-white ${QUADRANT_ACCENT[quadrant]}`}
          >
            <header className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                {meta.label}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">{meta.description}</p>
              <p className="mt-1 text-xs font-medium text-zinc-600">
                {quadrantTasks.length} task
                {quadrantTasks.length === 1 ? "" : "s"}
              </p>
            </header>
            <ul className="space-y-2 p-3">
              {quadrantTasks.length === 0 ? (
                <li className="rounded-lg border border-dashed border-zinc-100 px-3 py-4 text-center text-xs text-zinc-400">
                  No tasks here
                </li>
              ) : (
                quadrantTasks.map((task) => (
                  <li key={task.id}>
                    <TaskItem
                      task={task}
                      variant="active"
                      isDoingNow={task.id === doingNowId}
                      onStart={onStart}
                      onComplete={onComplete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onQuadrantChange={onQuadrantChange}
                    />
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
