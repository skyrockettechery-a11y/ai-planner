import { NextResponse } from "next/server";
import { parseEmailOtpType } from "@/lib/auth/otpType";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function redirectWithError(origin: string, code: string, next: string) {
  const url = new URL(next, origin);
  url.searchParams.set("auth_error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  if (!getSupabasePublicConfig()) {
    console.error("[auth/callback] Supabase is not configured");
    return redirectWithError(origin, "not_configured", next);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = parseEmailOtpType(searchParams.get("type"));

  try {
    const supabase = await createServerSupabaseClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error(
          "[auth/callback] exchangeCodeForSession failed:",
          error.message,
        );
        return redirectWithError(origin, "exchange_failed", next);
      }
      return NextResponse.redirect(new URL(next, origin));
    }

    if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (error) {
        console.error("[auth/callback] verifyOtp failed:", error.message);
        return redirectWithError(origin, "verify_failed", next);
      }
      return NextResponse.redirect(new URL(next, origin));
    }

    console.error(
      "[auth/callback] Missing auth params. Has code:",
      Boolean(code),
      "Has token_hash/type:",
      Boolean(tokenHash && otpType),
    );
    return redirectWithError(origin, "missing_params", next);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[auth/callback] Unexpected error:", message);
    return redirectWithError(origin, "exchange_failed", next);
  }
}
