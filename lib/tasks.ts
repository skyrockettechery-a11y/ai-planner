import { classifyTask } from "@/lib/classify";
import type { Quadrant, Task, TaskInput } from "@/types/task";

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString();
  const notes = input.notes?.trim() ?? "";
  const quadrant =
    input.quadrant ?? classifyTask(input.title.trim(), notes);

  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    notes,
    dueDate: input.dueDate ?? null,
    quadrant,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTask(task: Task, updates: Partial<TaskInput>): Task {
  const title = updates.title?.trim() ?? task.title;
  const notes =
    updates.notes !== undefined ? updates.notes.trim() : task.notes;
  const dueDate =
    updates.dueDate !== undefined ? updates.dueDate : task.dueDate;
  const quadrant =
    updates.quadrant ??
    (updates.title !== undefined || updates.notes !== undefined
      ? classifyTask(title, notes)
      : task.quadrant);

  return {
    ...task,
    title,
    notes,
    dueDate: dueDate ?? null,
    quadrant,
    updatedAt: new Date().toISOString(),
  };
}

export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.completed);
}

export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.completed);
}

/** Pin the doing-now task to the top of an active list. */
export function pinDoingNowFirst(
  tasks: Task[],
  doingNowId: string | null,
): Task[] {
  if (!doingNowId) return tasks;
  const doingNow = tasks.find((task) => task.id === doingNowId);
  if (!doingNow) return tasks;
  return [doingNow, ...tasks.filter((task) => task.id !== doingNowId)];
}

export function groupByQuadrant(tasks: Task[]): Record<Quadrant, Task[]> {
  const groups: Record<Quadrant, Task[]> = {
    "important-urgent": [],
    "important-not-urgent": [],
    "not-important-urgent": [],
    "not-important-not-urgent": [],
  };
  for (const task of tasks) {
    groups[task.quadrant].push(task);
  }
  return groups;
}
