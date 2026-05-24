"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getDoingNowSnapshot,
  getServerDoingNowSnapshot,
  setDoingNowSnapshot,
  subscribeDoingNow,
} from "@/lib/doingNowStore";

export function useDoingNow() {
  const doingNowId = useSyncExternalStore(
    subscribeDoingNow,
    getDoingNowSnapshot,
    getServerDoingNowSnapshot,
  );

  const setDoingNow = useCallback((id: string | null) => {
    setDoingNowSnapshot(id);
  }, []);

  const clearDoingNow = useCallback(() => {
    setDoingNowSnapshot(null);
  }, []);

  return { doingNowId, setDoingNow, clearDoingNow };
}
