import type { AuthErrorCode } from "@/lib/auth/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAuthParamsFromUrl, type ParsedAuthParams } from "@/lib/auth/parseAuthParams";

export type AuthCompletionResult =
  | { ok: true }
  | { ok: false; errorCode: AuthErrorCode };

export async function completeAuthFromParsed(
  supabase: SupabaseClient,
  params: ParsedAuthParams,
): Promise<AuthCompletionResult> {
  switch (params.kind) {
    case "session": {
      const { error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) {
        console.error("[auth] setSession failed:", error.message);
        return { ok: false, errorCode: "session_failed" };
      }
      return { ok: true };
    }
    case "code": {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        console.error("[auth] exchangeCodeForSession failed:", error.message);
        return { ok: false, errorCode: "exchange_failed" };
      }
      return { ok: true };
    }
    case "otp": {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.tokenHash,
        type: params.otpType,
      });
      if (error) {
        console.error("[auth] verifyOtp failed:", error.message);
        return { ok: false, errorCode: "verify_failed" };
      }
      return { ok: true };
    }
    case "oauth_error": {
      console.error(
        "[auth] OAuth error:",
        params.error,
        params.errorCode ?? "",
        params.errorDescription ?? "",
      );
      return { ok: false, errorCode: "exchange_failed" };
    }
    case "none":
      return { ok: false, errorCode: "missing_params" };
  }
}

export async function completeAuthFromUrl(
  supabase: SupabaseClient,
  href: string,
): Promise<AuthCompletionResult> {
  return completeAuthFromParsed(
    supabase,
    parseAuthParamsFromUrl(new URL(href)),
  );
}
