"use client";

import { useEffect, useState } from "react";
import { useSupabasePublicConfig } from "@/components/SupabaseConfigProvider";
import { AUTH_ERROR_PARAM } from "@/lib/auth/errors";
import { parseEmailOtpType } from "@/lib/auth/otpType";
import { hasClientAuthParamsInUrl } from "@/lib/auth/urlParams";
import { createBrowserClientFromConfig } from "@/lib/supabase/client";

/**
 * Handles auth params that never reach the server (hash tokens) or land on "/"
 * when the email app opens the site URL directly (common on mobile).
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
    if (!config || !hasClientAuthParamsInUrl()) {
      return;
    }

    const supabase = createBrowserClientFromConfig(config);
    let cancelled = false;

    const run = async () => {
      setStatus("working");

      const url = new URL(window.location.href);

      const hashParams = new URLSearchParams(
        url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
      );
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        url.hash = "";
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);

        if (error) {
          console.error(
            "[AuthSessionHandler] setSession failed:",
            error.message,
          );
          url.searchParams.set(AUTH_ERROR_PARAM, "session_failed");
          window.history.replaceState(null, "", url.toString());
        } else {
          await supabase.auth.getSession();
        }
        return;
      }

      const code = url.searchParams.get("code");
      if (code && url.pathname === "/") {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        url.searchParams.delete("code");
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);

        if (error) {
          console.error(
            "[AuthSessionHandler] exchangeCodeForSession failed:",
            error.message,
          );
          url.searchParams.set(AUTH_ERROR_PARAM, "exchange_failed");
          window.history.replaceState(null, "", url.toString());
        } else {
          await supabase.auth.getSession();
        }
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const otpType = parseEmailOtpType(url.searchParams.get("type"));
      if (tokenHash && otpType && url.pathname === "/") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);

        if (error) {
          console.error("[AuthSessionHandler] verifyOtp failed:", error.message);
          url.searchParams.set(AUTH_ERROR_PARAM, "verify_failed");
          window.history.replaceState(null, "", url.toString());
        } else {
          await supabase.auth.getSession();
        }
      }
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
