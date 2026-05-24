"use client";

import { useEffect, useState } from "react";
import { useSupabasePublicConfig } from "@/components/SupabaseConfigProvider";
import { cleanAuthParamsFromUrl } from "@/lib/auth/cleanAuthUrl";
import { completeAuthFromParsed } from "@/lib/auth/completeAuth";
import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";
import {
  AUTH_DEBUG_HASH_PARAM,
  AUTH_DEBUG_PATH_PARAM,
  AUTH_DEBUG_QUERY_PARAM,
  getAuthParamNames,
  hasRecognizedAuthParams,
  parseAuthParamsFromUrl,
} from "@/lib/auth/parseAuthParams";
import { captureAuthUrlOnLanding } from "@/lib/auth/urlParams";
import { createBrowserClientFromConfig } from "@/lib/supabase/client";

/**
 * Handles auth params in query or hash on any route (common on mobile email apps).
 * Hash fragments never reach the server — this client handler is required.
 */
export function AuthSessionHandler({
  onCompletingChange,
}: {
  onCompletingChange?: (completing: boolean) => void;
}) {
  const config = useSupabasePublicConfig();
  const [status, setStatus] = useState<"hidden" | "working" | "done">("hidden");

  useEffect(() => {
    onCompletingChange?.(status === "working");
  }, [status, onCompletingChange]);

  useEffect(() => {
    captureAuthUrlOnLanding();

    if (!config) {
      return;
    }

    const initialUrl = new URL(window.location.href);
    if (!hasRecognizedAuthParams(initialUrl)) {
      return;
    }

    const supabase = createBrowserClientFromConfig(config);
    let cancelled = false;

    const run = async () => {
      setStatus("working");

      const url = new URL(window.location.href);
      const parsed = parseAuthParamsFromUrl(url);
      const result = await completeAuthFromParsed(supabase, parsed);
      const names = getAuthParamNames(url);

      if (result.ok) {
        cleanAuthParamsFromUrl(url.href);
        await supabase.auth.getSession();
        return;
      }

      console.error(
        "[AuthSessionHandler] Auth failed:",
        result.errorCode,
        "path:",
        names.path,
        "query keys:",
        names.query.join(",") || "(none)",
        "hash keys:",
        names.hash.join(",") || "(none)",
      );

      const failUrl = new URL(url.pathname, url.origin);
      failUrl.searchParams.set(AUTH_ERROR_PARAM, result.errorCode);
      failUrl.searchParams.set(AUTH_DEBUG_PATH_PARAM, names.path);
      if (names.query.length > 0) {
        failUrl.searchParams.set(AUTH_DEBUG_QUERY_PARAM, names.query.join(","));
      }
      if (names.hash.length > 0) {
        failUrl.searchParams.set(AUTH_DEBUG_HASH_PARAM, names.hash.join(","));
      }
      window.history.replaceState(null, "", failUrl.toString());
    };

    void run().finally(() => {
      if (!cancelled) {
        setStatus("done");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [config]);

  if (status !== "working") return null;

  return (
    <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
      Completing sign-in…
    </p>
  );
}
