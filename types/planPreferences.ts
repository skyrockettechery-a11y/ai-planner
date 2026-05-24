export type RecommendationMode = "auto" | "urgency" | "importance";

export interface PlanPreferences {
  mode: RecommendationMode;
  dismissedIds: string[];
  hidden: boolean;
}

export const DEFAULT_PLAN_PREFERENCES: PlanPreferences = {
  mode: "auto",
  dismissedIds: [],
  hidden: false,
};
