import { reloadDoingNowFromStorage } from "@/lib/doingNowStore";
import { reloadPlanPreferencesFromStorage } from "@/lib/planPreferencesStore";
import { loadTasks } from "@/lib/storage";
import { setTasksSnapshot } from "@/lib/taskStore";

/** Restore in-memory state from localStorage after sign-out. */
export function reloadLocalState(): void {
  setTasksSnapshot(loadTasks());
  reloadPlanPreferencesFromStorage();
  reloadDoingNowFromStorage();
}
