"use client";

import { useEffect, useRef } from "react";
import { useSupabasePublicConfig } from "@/components/SupabaseConfigProvider";
import { setDoingNowSnapshot } from "@/lib/doingNowStore";
import { setPlanPreferencesSnapshot } from "@/lib/planPreferencesStore";
import { createBrowserClientFromConfig } from "@/lib/supabase/client";
import { fetchCloudPreferences, syncCloudPreferences } from "@/lib/supabase/preferences";
import { fetchCloudTasks, syncCloudTasks } from "@/lib/supabase/tasks";
import {
  getDoingNowSnapshot,
  subscribeDoingNow,
} from "@/lib/doingNowStore";
import {
  getPlanPreferencesSnapshot,
  subscribePlanPreferences,
} from "@/lib/planPreferencesStore";
import { getTasksSnapshot, setTasksSnapshot, subscribeTasks } from "@/lib/taskStore";

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
  };
  return debounced;
}

export function useCloudSync(userId: string | undefined, enabled: boolean) {
  const config = useSupabasePublicConfig();
  const supabase = config ? createBrowserClientFromConfig(config) : null;
  const applyingRemote = useRef(false);
  const loadedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !supabase) return;

    if (loadedForUser.current === userId) return;

    let cancelled = false;

    (async () => {
      try {
        applyingRemote.current = true;
        const [cloudTasks, cloudPrefs] = await Promise.all([
          fetchCloudTasks(supabase, userId),
          fetchCloudPreferences(supabase, userId),
        ]);

        if (cancelled) return;

        setTasksSnapshot(cloudTasks);

        if (cloudPrefs) {
          setPlanPreferencesSnapshot(cloudPrefs.planPreferences);
          setDoingNowSnapshot(cloudPrefs.doingNowId);
        }

        loadedForUser.current = userId;
      } catch (error) {
        console.error("Failed to load cloud data:", error);
      } finally {
        applyingRemote.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, enabled, supabase]);

  useEffect(() => {
    if (!enabled || !userId || !supabase) {
      loadedForUser.current = null;
      return;
    }

    const pushToCloud = debounce(async () => {
      if (applyingRemote.current) return;
      if (loadedForUser.current !== userId) return;

      try {
        await syncCloudTasks(supabase, userId, getTasksSnapshot());
        await syncCloudPreferences(
          supabase,
          userId,
          getDoingNowSnapshot(),
          getPlanPreferencesSnapshot(),
        );
      } catch (error) {
        console.error("Failed to sync to cloud:", error);
      }
    }, 500);

    const unsubTasks = subscribeTasks(pushToCloud);
    const unsubPrefs = subscribePlanPreferences(pushToCloud);
    const unsubDoingNow = subscribeDoingNow(pushToCloud);

    return () => {
      unsubTasks();
      unsubPrefs();
      unsubDoingNow();
      pushToCloud.cancel();
    };
  }, [userId, enabled, supabase]);

  useEffect(() => {
    if (!userId) {
      loadedForUser.current = null;
    }
  }, [userId]);
}
