import type { Task } from "@/types/task";

export const STORAGE_KEY = "ai-planner-tasks";
export const DOING_NOW_STORAGE_KEY = "ai-planner-doing-now";
export const PLAN_PREFERENCES_STORAGE_KEY = "ai-planner-plan-preferences";

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTask);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function isValidTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.notes === "string" &&
    (task.dueDate === null || typeof task.dueDate === "string") &&
    typeof task.quadrant === "string" &&
    typeof task.completed === "boolean" &&
    typeof task.createdAt === "string" &&
    typeof task.updatedAt === "string"
  );
}
