"use client";

import { useEffect, useState } from "react";
import { useSupabasePublicConfig } from "@/components/SupabaseConfigProvider";
import { completeAuthFromParsed } from "@/lib/auth/completeAuth";
import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";
import {
  getAuthParamNames,
  hasRecognizedAuthParams,
  parseAuthParamsFromUrl,
  snapshotAuthUrlDebug,
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
      snapshotAuthUrlDebug(url.href);

      const cleanUrl = new URL(url.pathname, url.origin);
      for (const [key, value] of url.searchParams.entries()) {
        if (
          key !== AUTH_ERROR_PARAM &&
          !key.startsWith("auth_debug_") &&
          key !== "code" &&
          key !== "token_hash" &&
          key !== "token" &&
          key !== "type" &&
          key !== "error" &&
          key !== "error_code" &&
          key !== "error_description"
        ) {
          cleanUrl.searchParams.set(key, value);
        }
      }

      if (result.ok) {
        window.history.replaceState(null, "", cleanUrl.toString());
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

      cleanUrl.searchParams.set(AUTH_ERROR_PARAM, result.errorCode);
      cleanUrl.searchParams.set("auth_debug_path", names.path);
      if (names.query.length > 0) {
        cleanUrl.searchParams.set("auth_debug_q", names.query.join(","));
      }
      if (names.hash.length > 0) {
        cleanUrl.searchParams.set("auth_debug_h", names.hash.join(","));
      }
      window.history.replaceState(null, "", cleanUrl.toString());
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
