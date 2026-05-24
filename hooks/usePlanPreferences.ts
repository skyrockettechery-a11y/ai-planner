"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  dismissAllRecommendations,
  dismissRecommendation,
  getPlanPreferencesSnapshot,
  getServerPlanPreferencesSnapshot,
  resetDismissedRecommendations,
  setPlanHidden,
  setRecommendationMode,
  subscribePlanPreferences,
} from "@/lib/planPreferencesStore";
import type { RecommendationMode } from "@/types/planPreferences";

export function usePlanPreferences() {
  const preferences = useSyncExternalStore(
    subscribePlanPreferences,
    getPlanPreferencesSnapshot,
    getServerPlanPreferencesSnapshot,
  );

  const setMode = useCallback((mode: RecommendationMode) => {
    setRecommendationMode(mode);
  }, []);

  const dismissOne = useCallback((taskId: string) => {
    dismissRecommendation(taskId);
  }, []);

  const dismissAll = useCallback((taskIds: string[]) => {
    dismissAllRecommendations(taskIds);
  }, []);

  const resetDismissed = useCallback(() => {
    resetDismissedRecommendations();
  }, []);

  const setHidden = useCallback((hidden: boolean) => {
    setPlanHidden(hidden);
  }, []);

  return {
    preferences,
    setMode,
    dismissOne,
    dismissAll,
    resetDismissed,
    setHidden,
  };
}
