import { loadTasks, saveTasks } from "@/lib/storage";
import type { Task } from "@/types/task";

type Listener = () => void;

/** Stable empty snapshot for SSR and empty client state. */
export const EMPTY_TASKS: Task[] = [];

let tasks: Task[] | null = null;
const listeners = new Set<Listener>();

function normalizeTasks(next: Task[]): Task[] {
  return next.length === 0 ? EMPTY_TASKS : next;
}

function getTasks(): Task[] {
  if (tasks === null) {
    tasks = normalizeTasks(loadTasks());
  }
  return tasks;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeTasks(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTasksSnapshot(): Task[] {
  return getTasks();
}

export function getServerTasksSnapshot(): Task[] {
  return EMPTY_TASKS;
}

export function setTasksSnapshot(next: Task[]): void {
  const normalized = normalizeTasks(next);
  if (normalized === tasks) return;
  tasks = normalized;
  saveTasks(normalized);
  emitChange();
}

export function updateTasks(updater: (current: Task[]) => Task[]): void {
  setTasksSnapshot(updater(getTasks()));
}
