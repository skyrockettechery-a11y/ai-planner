import { loadTasks } from "@/lib/storage";
import { updateTasks } from "@/lib/taskStore";
import type { Task } from "@/types/task";

export function getLocalTasksForImport(): Task[] {
  return loadTasks();
}

export function countImportableLocalTasks(cloudTasks: Task[]): number {
  const localTasks = getLocalTasksForImport();
  if (localTasks.length === 0) return 0;
  const cloudIds = new Set(cloudTasks.map((task) => task.id));
  return localTasks.filter((task) => !cloudIds.has(task.id)).length;
}

export function importLocalTasks(cloudTasks: Task[]): number {
  const localTasks = getLocalTasksForImport();
  const cloudIds = new Set(cloudTasks.map((task) => task.id));
  const toImport = localTasks.filter((task) => !cloudIds.has(task.id));

  if (toImport.length === 0) return 0;

  updateTasks((current) => {
    const currentIds = new Set(current.map((task) => task.id));
    const merged = [
      ...toImport.filter((task) => !currentIds.has(task.id)),
      ...current,
    ];
    return merged;
  });

  return toImport.length;
}
