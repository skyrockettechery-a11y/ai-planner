"use client";

import { FormEvent, useState } from "react";
import type { TaskInput } from "@/types/task";

interface TaskFormProps {
  onAdd: (input: TaskInput) => void;
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expanded, setExpanded] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAdd({
      title: trimmed,
      notes: notes.trim() || undefined,
      dueDate: dueDate || null,
    });

    setTitle("");
    setNotes("");
    setDueDate("");
    setExpanded(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <label htmlFor="task-title" className="sr-only">
        Task title
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add task
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-800"
      >
        {expanded ? "Hide details" : "Add notes or due date"}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="task-notes"
              className="mb-1 block text-xs font-medium text-zinc-600"
            >
              Notes
            </label>
            <textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional context"
              className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>
          <div>
            <label
              htmlFor="task-due"
              className="mb-1 block text-xs font-medium text-zinc-600"
            >
              Due date
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>
      )}
    </form>
  );
}
