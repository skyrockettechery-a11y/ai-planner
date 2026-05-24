"use client";

import { useState } from "react";
import type { Quadrant, Task, TaskInput } from "@/types/task";
import { TaskItem } from "./TaskItem";

interface CompletedSectionProps {
  tasks: Task[];
  onRestore: (id: string) => void;
  onEdit: (id: string, updates: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onQuadrantChange: (id: string, quadrant: Quadrant) => void;
}

export function CompletedSection({
  tasks,
  onRestore,
  onEdit,
  onDelete,
  onQuadrantChange,
}: CompletedSectionProps) {
  const [open, setOpen] = useState(tasks.length > 0 && tasks.length <= 5);

  if (tasks.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <h3 className="text-sm font-semibold text-zinc-900">
          Completed ({tasks.length})
        </h3>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <ul className="space-y-2 border-t border-zinc-100 p-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskItem
                task={task}
                variant="completed"
                onRestore={onRestore}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuadrantChange={onQuadrantChange}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
