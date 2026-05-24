import { isImportantQuadrant, isUrgentQuadrant } from "@/lib/quadrantFlags";
import { QUADRANT_META } from "@/lib/quadrants";
import type { Quadrant, Task } from "@/types/task";
import type { DailyPlan, TaskRecommendation } from "@/types/dailyPlan";
import type { RecommendationMode } from "@/types/planPreferences";

const TOP_RECOMMENDATION_COUNT = 3;
const OVERLOADED_TASK_THRESHOLD = 10;
const URGENT_HEAVY_COUNT = 3;
const URGENT_HEAVY_RATIO = 0.5;

const QUADRANT_PRIORITY: Record<Quadrant, number> = {
  "important-urgent": 0,
  "important-not-urgent": 1,
  "not-important-urgent": 2,
  "not-important-not-urgent": 3,
};

export interface BuildDailyPlanOptions {
  mode: RecommendationMode;
  dismissedIds: readonly string[];
}

function compareTitles(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function compareByDueDate(a: Task, b: Task): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

/** Auto — hybrid quadrant + due date (Mission 01/03 logic). */
function compareForAuto(a: Task, b: Task): number {
  const byQuadrant =
    QUADRANT_PRIORITY[a.quadrant] - QUADRANT_PRIORITY[b.quadrant];
  if (byQuadrant !== 0) return byQuadrant;

  const byDueDate = compareByDueDate(a, b);
  if (byDueDate !== 0) return byDueDate;

  return compareTitles(a, b);
}

/** Urgency — urgent, due date, important, title. */
function compareForUrgency(a: Task, b: Task): number {
  const aUrgent = isUrgentQuadrant(a.quadrant) ? 0 : 1;
  const bUrgent = isUrgentQuadrant(b.quadrant) ? 0 : 1;
  if (aUrgent !== bUrgent) return aUrgent - bUrgent;

  const byDueDate = compareByDueDate(a, b);
  if (byDueDate !== 0) return byDueDate;

  const aImportant = isImportantQuadrant(a.quadrant) ? 0 : 1;
  const bImportant = isImportantQuadrant(b.quadrant) ? 0 : 1;
  if (aImportant !== bImportant) return aImportant - bImportant;

  return compareTitles(a, b);
}

/** Importance — important, due date, urgent, title. */
function compareForImportance(a: Task, b: Task): number {
  const aImportant = isImportantQuadrant(a.quadrant) ? 0 : 1;
  const bImportant = isImportantQuadrant(b.quadrant) ? 0 : 1;
  if (aImportant !== bImportant) return aImportant - bImportant;

  const byDueDate = compareByDueDate(a, b);
  if (byDueDate !== 0) return byDueDate;

  const aUrgent = isUrgentQuadrant(a.quadrant) ? 0 : 1;
  const bUrgent = isUrgentQuadrant(b.quadrant) ? 0 : 1;
  if (aUrgent !== bUrgent) return aUrgent - bUrgent;

  return compareTitles(a, b);
}

function getComparator(mode: RecommendationMode): (a: Task, b: Task) => number {
  switch (mode) {
    case "urgency":
      return compareForUrgency;
    case "importance":
      return compareForImportance;
    case "auto":
    default:
      return compareForAuto;
  }
}

function formatDueDate(dueDate: string): string {
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getRecommendationReason(task: Task, mode: RecommendationMode): string {
  const quadrantLabel = QUADRANT_META[task.quadrant].shortLabel.toLowerCase();
  const duePhrase = task.dueDate
    ? ` Due ${formatDueDate(task.dueDate)}.`
    : "";

  const modeHint =
    mode === "urgency"
      ? "Prioritized for urgency."
      : mode === "importance"
        ? "Prioritized for importance."
        : "";

  switch (task.quadrant) {
    case "important-urgent":
      return `Marked "${quadrantLabel}" — highest impact and time-sensitive.${duePhrase} ${modeHint}`.trim();
    case "important-not-urgent":
      return `Important work (${quadrantLabel}).${duePhrase || " Schedule focused time today."} ${modeHint}`.trim();
    case "not-important-urgent":
      return `Time-sensitive (${quadrantLabel}).${duePhrase || " Handle quickly or delegate if possible."} ${modeHint}`.trim();
    case "not-important-not-urgent":
      return `Lower priority (${quadrantLabel}).${duePhrase || " Tackle after higher-impact items."} ${modeHint}`.trim();
  }
}

function getFocusSummary(activeTasks: Task[], mode: RecommendationMode): string {
  if (activeTasks.length === 0) {
    return "Add tasks to build a focused plan for today.";
  }

  if (mode === "urgency") {
    return "Suggestions favor urgent work — adjust anytime.";
  }

  if (mode === "importance") {
    return "Suggestions favor important work — adjust anytime.";
  }

  const urgentCount = activeTasks.filter((task) =>
    isUrgentQuadrant(task.quadrant),
  ).length;
  const urgentRatio = urgentCount / activeTasks.length;

  if (
    activeTasks.length < OVERLOADED_TASK_THRESHOLD &&
    urgentRatio < URGENT_HEAVY_RATIO
  ) {
    return "Good balance: your tasks are not overloaded.";
  }

  return "Focus on high-impact tasks first.";
}

function getPlanWarning(activeTasks: Task[]): string | undefined {
  if (activeTasks.length >= OVERLOADED_TASK_THRESHOLD) {
    return "Your task list looks overloaded. Consider completing or deferring lower-priority items.";
  }

  const urgentCount = activeTasks.filter((task) =>
    isUrgentQuadrant(task.quadrant),
  ).length;
  const urgentRatio =
    activeTasks.length > 0 ? urgentCount / activeTasks.length : 0;

  if (urgentCount >= URGENT_HEAVY_COUNT && urgentRatio >= URGENT_HEAVY_RATIO) {
    return "You have many urgent tasks today. Consider reducing low-value urgent work.";
  }

  return undefined;
}

export function buildDailyPlan(
  activeTasks: Task[],
  options: BuildDailyPlanOptions,
): DailyPlan {
  const dismissed = new Set(options.dismissedIds);
  const eligible = activeTasks.filter((task) => !dismissed.has(task.id));
  const ranked = [...eligible].sort(getComparator(options.mode));
  const recommendations: TaskRecommendation[] = ranked
    .slice(0, TOP_RECOMMENDATION_COUNT)
    .map((task) => ({
      task,
      reason: getRecommendationReason(task, options.mode),
    }));

  return {
    recommendations,
    summary: getFocusSummary(activeTasks, options.mode),
    warning: getPlanWarning(activeTasks),
  };
}
