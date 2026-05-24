"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cleanAuthParamsFromUrl,
  dismissAuthFeedback,
} from "@/lib/auth/cleanAuthUrl";
import type { AuthUrlDebugSnapshot } from "@/lib/auth/parseAuthParams";
import {
  readAuthFeedbackFromUrl,
  type AuthFeedbackState,
} from "@/lib/auth/readAuthFeedback";

function formatParamList(keys: string[]): string {
  return keys.length > 0 ? keys.join(", ") : "(none)";
}

function AuthUrlDebugDetails({ snapshot }: { snapshot: AuthUrlDebugSnapshot }) {
  return (
    <p className="mt-2 rounded-md bg-zinc-100 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-zinc-700">
      Sign-in URL debug (names only): path={snapshot.path || "/"} · query=[
      {formatParamList(snapshot.query)}] · hash=[{formatParamList(snapshot.hash)}]
    </p>
  );
}

export function AuthFeedback() {
  const [feedback, setFeedback] = useState<AuthFeedbackState | null>(() =>
    readAuthFeedbackFromUrl(),
  );

  useEffect(() => {
    if (feedback) {
      cleanAuthParamsFromUrl();
    }
  }, [feedback]);

  const dismiss = useCallback(() => {
    dismissAuthFeedback();
    setFeedback(null);
  }, []);

  if (!feedback) return null;

  const showDebug =
    feedback.debug.query.length > 0 || feedback.debug.hash.length > 0;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
    >
      <p>{feedback.message}</p>
      {showDebug && <AuthUrlDebugDetails snapshot={feedback.debug} />}
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 min-h-9 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100/50"
      >
        Dismiss
      </button>
    </div>
  );
}
