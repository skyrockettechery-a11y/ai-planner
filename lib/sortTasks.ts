import { isImportantQuadrant, isUrgentQuadrant } from "@/lib/quadrantFlags";
import type { Task } from "@/types/task";
import type { TaskSortOption } from "@/types/view";

function compareTitles(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

export function sortTasks(tasks: Task[], sortBy: TaskSortOption): Task[] {
  const sorted = [...tasks];

  switch (sortBy) {
    case "due-date":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return compareTitles(a, b);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const byDate = a.dueDate.localeCompare(b.dueDate);
        return byDate !== 0 ? byDate : compareTitles(a, b);
      });
    case "importance": {
      return sorted.sort((a, b) => {
        const aRank = isImportantQuadrant(a.quadrant) ? 0 : 1;
        const bRank = isImportantQuadrant(b.quadrant) ? 0 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return compareTitles(a, b);
      });
    }
    case "urgency": {
      return sorted.sort((a, b) => {
        const aRank = isUrgentQuadrant(a.quadrant) ? 0 : 1;
        const bRank = isUrgentQuadrant(b.quadrant) ? 0 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return compareTitles(a, b);
      });
    }
  }
}
