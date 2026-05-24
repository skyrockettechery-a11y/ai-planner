"use client";

import { useMemo } from "react";
import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";
import {
  readAuthUrlDebugFromSearchParams,
  readStoredAuthUrlDebug,
  type AuthUrlDebugSnapshot,
} from "@/lib/auth/parseAuthParams";

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

function loadDebugSnapshot(): AuthUrlDebugSnapshot | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const fromRedirect = readAuthUrlDebugFromSearchParams(url.searchParams);
  const stored = readStoredAuthUrlDebug();

  if (fromRedirect) {
    return {
      path: fromRedirect.path || stored?.path || url.pathname,
      query:
        fromRedirect.query.length > 0
          ? fromRedirect.query
          : (stored?.query ?? []),
      hash:
        fromRedirect.hash.length > 0 ? fromRedirect.hash : (stored?.hash ?? []),
      capturedAt: fromRedirect.capturedAt || stored?.capturedAt || "",
    };
  }

  return stored;
}

interface AuthUrlDebugBannerProps {
  show: boolean;
}

export function AuthUrlDebugBanner({ show }: AuthUrlDebugBannerProps) {
  const snapshot = useMemo(() => {
    if (!show) return null;
    return loadDebugSnapshot();
  }, [show]);

  if (!show || !snapshot) return null;

  const hasAuthError =
    typeof window !== "undefined" &&
    new URL(window.location.href).searchParams.has(AUTH_ERROR_PARAM);

  const hasData =
    snapshot.query.length > 0 ||
    snapshot.hash.length > 0 ||
    (snapshot.path !== "/" && snapshot.path !== "");

  if (!hasAuthError && !hasData) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <p className="font-medium">Sign-in link debug</p>
      <p className="mt-1 text-amber-900">
        Share this with support if magic links fail on mobile. Only parameter names
        are shown — never token values.
      </p>
      <AuthUrlDebugDetails snapshot={snapshot} />
    </div>
  );
}
