import {
  AUTH_ERROR_PARAM,
  getAuthErrorMessage,
  isAuthErrorCode,
  isRateLimitAuthError,
  type AuthErrorCode,
} from "@/lib/auth/errors";
import {
  getAuthParamNames,
  parseAuthParamsFromUrl,
  readAuthUrlDebugFromSearchParams,
  type AuthUrlDebugSnapshot,
} from "@/lib/auth/parseAuthParams";

export type AuthFeedbackState = {
  message: string;
  errorCode: AuthErrorCode | "unknown";
  debug: AuthUrlDebugSnapshot;
};

function messageFromOAuthError(
  errorCode: string | null,
  errorDescription: string | null,
): { message: string; errorCode: AuthErrorCode } {
  if (isRateLimitAuthError(errorCode, errorDescription)) {
    return {
      message: getAuthErrorMessage("rate_limit"),
      errorCode: "rate_limit",
    };
  }
  return {
    message: getAuthErrorMessage("exchange_failed"),
    errorCode: "exchange_failed",
  };
}

/** Read sign-in error feedback from the current URL (query or hash). */
export function readAuthFeedbackFromUrl(
  href?: string,
): AuthFeedbackState | null {
  if (typeof window === "undefined") return null;

  const url = new URL(href ?? window.location.href);
  const debug = getDebugSnapshot(url);

  const authError = url.searchParams.get(AUTH_ERROR_PARAM);
  if (authError) {
    const errorCode = isAuthErrorCode(authError) ? authError : "unknown";
    return {
      message: isAuthErrorCode(authError)
        ? getAuthErrorMessage(authError)
        : getAuthErrorMessage("exchange_failed"),
      errorCode,
      debug,
    };
  }

  const parsed = parseAuthParamsFromUrl(url);
  if (parsed.kind === "oauth_error") {
    const { message, errorCode } = messageFromOAuthError(
      parsed.errorCode,
      parsed.errorDescription,
    );
    return { message, errorCode, debug };
  }

  return null;
}

function getDebugSnapshot(url: URL): AuthUrlDebugSnapshot {
  const fromRedirect = readAuthUrlDebugFromSearchParams(url.searchParams);
  if (fromRedirect) {
    return { ...fromRedirect, capturedAt: new Date().toISOString() };
  }
  const names = getAuthParamNames(url);
  return {
    path: names.path,
    query: names.query,
    hash: names.hash,
    capturedAt: new Date().toISOString(),
  };
}
