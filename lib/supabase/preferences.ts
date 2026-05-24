import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanPreferences, RecommendationMode } from "@/types/planPreferences";
import { DEFAULT_PLAN_PREFERENCES } from "@/types/planPreferences";

export interface CloudPreferences {
  doingNowId: string | null;
  planPreferences: PlanPreferences;
}

interface PreferencesRow {
  user_id: string;
  doing_now_id: string | null;
  plan_mode: string;
  dismissed_ids: string[] | null;
  plan_hidden: boolean;
  updated_at: string;
}

const MODES: RecommendationMode[] = ["auto", "urgency", "importance"];

function normalizeMode(value: string): RecommendationMode {
  return MODES.includes(value as RecommendationMode)
    ? (value as RecommendationMode)
    : "auto";
}

function rowToCloudPreferences(row: PreferencesRow): CloudPreferences {
  const dismissedIds = Array.isArray(row.dismissed_ids)
    ? [...new Set(row.dismissed_ids.filter((id) => typeof id === "string"))]
    : [];

  return {
    doingNowId: row.doing_now_id,
    planPreferences: {
      mode: normalizeMode(row.plan_mode),
      dismissedIds,
      hidden: row.plan_hidden === true,
    },
  };
}

export async function fetchCloudPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<CloudPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToCloudPreferences(data as PreferencesRow);
}

export async function syncCloudPreferences(
  supabase: SupabaseClient,
  userId: string,
  doingNowId: string | null,
  planPreferences: PlanPreferences,
): Promise<void> {
  const row = {
    user_id: userId,
    doing_now_id: doingNowId,
    plan_mode: planPreferences.mode,
    dismissed_ids: planPreferences.dismissedIds,
    plan_hidden: planPreferences.hidden,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_preferences").upsert(row, {
    onConflict: "user_id",
  });
  if (error) throw error;
}

export function emptyCloudPreferences(): CloudPreferences {
  return {
    doingNowId: null,
    planPreferences: { ...DEFAULT_PLAN_PREFERENCES, dismissedIds: [] },
  };
}
