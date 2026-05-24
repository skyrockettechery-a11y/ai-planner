import {
  hasRecognizedAuthParams,
  snapshotAuthUrlDebug,
} from "@/lib/auth/parseAuthParams";
import { readAuthFeedbackFromUrl } from "@/lib/auth/readAuthFeedback";

export function hasClientAuthParamsInUrl(): boolean {
  if (typeof window === "undefined") return false;
  return hasRecognizedAuthParams(new URL(window.location.href));
}

/** Snapshot landing URL for debug — skip when URL is already an error state. */
export function captureAuthUrlOnLanding(): void {
  if (typeof window === "undefined") return;
  if (readAuthFeedbackFromUrl()) return;
  snapshotAuthUrlDebug();
}
