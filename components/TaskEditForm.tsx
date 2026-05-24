"use client";

import { FormEvent, useState } from "react";
import { QUADRANT_META, QUADRANTS } from "@/lib/quadrants";
import type { Quadrant, Task, TaskInput } from "@/types/task";

interface TaskEditFormProps {
  task: Task;
  onSave: (updates: Partial<TaskInput>) => void;
  onCancel: () => void;
}

export function TaskEditForm({ task, onSave, onCancel }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [quadrant, setQuadrant] = useState<Quadrant>(task.quadrant);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onSave({
      title: trimmed,
      notes,
      dueDate: dueDate || null,
      quadrant,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-300 bg-white p-3 shadow-sm"
    >
      <div className="space-y-3">
        <div>
          <label
            htmlFor={`edit-title-${task.id}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Title
          </label>
          <input
            id={`edit-title-${task.id}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-notes-${task.id}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Notes
          </label>
          <textarea
            id={`edit-notes-${task.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`edit-due-${task.id}`}
              className="mb-1 block text-xs font-medium text-zinc-600"
            >
              Due date
            </label>
            <input
              id={`edit-due-${task.id}`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>
          <div>
            <label
              htmlFor={`edit-quadrant-${task.id}`}
              className="mb-1 block text-xs font-medium text-zinc-600"
            >
              Quadrant
            </label>
            <select
              id={`edit-quadrant-${task.id}`}
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value as Quadrant)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              {QUADRANTS.map((q) => (
                <option key={q} value={q}>
                  {QUADRANT_META[q].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
