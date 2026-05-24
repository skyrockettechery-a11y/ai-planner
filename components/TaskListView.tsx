"use client";

import type { Quadrant, Task, TaskInput } from "@/types/task";
import { TaskItem } from "./TaskItem";

interface TaskListViewProps {
  tasks: Task[];
  doingNowId: string | null;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onEdit: (id: string, updates: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onQuadrantChange: (id: string, quadrant: Quadrant) => void;
}

export function TaskListView({
  tasks,
  doingNowId,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onQuadrantChange,
}: TaskListViewProps) {
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
    <section aria-label="Task list" className="rounded-xl border border-zinc-200 bg-white">
      <ul className="divide-y divide-zinc-100 p-3">
        {tasks.map((task) => (
          <li key={task.id} className="py-2 first:pt-0 last:pb-0">
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
        ))}
      </ul>
    </section>
  );
}
