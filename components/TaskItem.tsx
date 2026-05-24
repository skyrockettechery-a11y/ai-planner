"use client";

import { useState } from "react";
import { QUADRANT_META, QUADRANTS } from "@/lib/quadrants";
import type { Quadrant, Task, TaskInput } from "@/types/task";
import { TaskEditForm } from "./TaskEditForm";

export type TaskItemVariant = "active" | "completed";

interface TaskItemProps {
  task: Task;
  variant: TaskItemVariant;
  isDoingNow?: boolean;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onEdit: (id: string, updates: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onQuadrantChange: (id: string, quadrant: Quadrant) => void;
}

function formatDueDate(dueDate: string): string {
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const actionButtonClass =
  "min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:min-h-11";

export function TaskItem({
  task,
  variant,
  isDoingNow = false,
  onStart,
  onComplete,
  onRestore,
  onEdit,
  onDelete,
  onQuadrantChange,
}: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = QUADRANT_META[task.quadrant];

  if (editing) {
    return (
      <TaskEditForm
        task={task}
        onSave={(updates) => {
          onEdit(task.id, updates);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const isActive = variant === "active";

  return (
    <article
      className={`rounded-lg border p-3 ${
        isDoingNow
          ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
          : "border-zinc-200 bg-zinc-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-medium text-zinc-900 ${
              !isActive ? "line-through text-zinc-500" : ""
            }`}
          >
            {task.title}
          </h4>
          <p className="mt-0.5 text-xs text-zinc-500">
            {meta.shortLabel}
            {isDoingNow && (
              <span className="ml-2 font-medium text-zinc-800">· Doing now</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-white hover:text-zinc-900"
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>

      {isActive && (
        <div className="mt-3 flex gap-2">
          {!isDoingNow && onStart && (
            <button
              type="button"
              onClick={() => onStart(task.id)}
              className={`${actionButtonClass} border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50`}
            >
              Start
            </button>
          )}
          {onComplete && (
            <button
              type="button"
              onClick={() => onComplete(task.id)}
              className={`${actionButtonClass} bg-zinc-900 text-white hover:bg-zinc-700`}
            >
              Done
            </button>
          )}
        </div>
      )}

      {!isActive && onRestore && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onRestore(task.id)}
            className={`${actionButtonClass} w-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 sm:w-auto`}
          >
            Restore
          </button>
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3">
          {task.dueDate && (
            <p className="text-xs text-zinc-600">
              <span className="font-medium text-zinc-700">Due:</span>{" "}
              <time dateTime={task.dueDate}>
                {formatDueDate(task.dueDate)}
              </time>
            </p>
          )}

          {task.notes && (
            <p className="text-xs leading-relaxed text-zinc-600">{task.notes}</p>
          )}

          {isActive && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`quadrant-${task.id}`}>
                Change quadrant for {task.title}
              </label>
              <select
                id={`quadrant-${task.id}`}
                value={task.quadrant}
                onChange={(e) =>
                  onQuadrantChange(task.id, e.target.value as Quadrant)
                }
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none sm:w-auto"
              >
                {QUADRANTS.map((q) => (
                  <option key={q} value={q}>
                    {QUADRANT_META[q].label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
