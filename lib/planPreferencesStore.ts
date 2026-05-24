import { PLAN_PREFERENCES_STORAGE_KEY } from "@/lib/storage";
import {
  DEFAULT_PLAN_PREFERENCES,
  type PlanPreferences,
  type RecommendationMode,
} from "@/types/planPreferences";

type Listener = () => void;

const EMPTY_DISMISSED: string[] = [];
const SERVER_SNAPSHOT = DEFAULT_PLAN_PREFERENCES;

let preferences: PlanPreferences | undefined;
const listeners = new Set<Listener>();

const MODES: RecommendationMode[] = ["auto", "urgency", "importance"];

function isRecommendationMode(value: unknown): value is RecommendationMode {
  return typeof value === "string" && MODES.includes(value as RecommendationMode);
}

function normalizeDismissedIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return EMPTY_DISMISSED;
  const unique = [...new Set(ids.filter((id): id is string => typeof id === "string"))];
  return unique.length === 0 ? EMPTY_DISMISSED : unique;
}

function normalizePreferences(raw: unknown): PlanPreferences {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PLAN_PREFERENCES, dismissedIds: EMPTY_DISMISSED };
  }

  const value = raw as Record<string, unknown>;
  const dismissedIds = normalizeDismissedIds(value.dismissedIds);

  return {
    mode: isRecommendationMode(value.mode) ? value.mode : "auto",
    dismissedIds,
    hidden: value.hidden === true,
  };
}

function loadPreferences(): PlanPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PLAN_PREFERENCES, dismissedIds: EMPTY_DISMISSED };
  }

  try {
    const raw = localStorage.getItem(PLAN_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PLAN_PREFERENCES, dismissedIds: EMPTY_DISMISSED };
    }
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PLAN_PREFERENCES, dismissedIds: EMPTY_DISMISSED };
  }
}

function getPreferences(): PlanPreferences {
  if (!preferences) {
    preferences = loadPreferences();
  }
  return preferences;
}

function persistPreferences(next: PlanPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function updatePreferences(updater: (current: PlanPreferences) => PlanPreferences): void {
  const current = getPreferences();
  const next = updater(current);

  if (
    next.mode === current.mode &&
    next.hidden === current.hidden &&
    next.dismissedIds === current.dismissedIds
  ) {
    return;
  }

  preferences = next;
  persistPreferences(next);
  emitChange();
}

export function subscribePlanPreferences(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlanPreferencesSnapshot(): PlanPreferences {
  return getPreferences();
}

export function getServerPlanPreferencesSnapshot(): PlanPreferences {
  return SERVER_SNAPSHOT;
}

export function setRecommendationMode(mode: RecommendationMode): void {
  updatePreferences((current) =>
    current.mode === mode ? current : { ...current, mode },
  );
}

export function setPlanHidden(hidden: boolean): void {
  updatePreferences((current) =>
    current.hidden === hidden ? current : { ...current, hidden },
  );
}

export function dismissRecommendation(taskId: string): void {
  updatePreferences((current) => {
    if (current.dismissedIds.includes(taskId)) return current;
    const dismissedIds = [...current.dismissedIds, taskId];
    return { ...current, dismissedIds };
  });
}

export function dismissAllRecommendations(taskIds: string[]): void {
  updatePreferences((current) => {
    const merged = [...new Set([...current.dismissedIds, ...taskIds])];
    if (merged.length === current.dismissedIds.length) return current;
    return {
      ...current,
      dismissedIds: merged.length === 0 ? EMPTY_DISMISSED : merged,
    };
  });
}

export function resetDismissedRecommendations(): void {
  updatePreferences((current) =>
    current.dismissedIds.length === 0
      ? current
      : { ...current, dismissedIds: EMPTY_DISMISSED },
  );
}
