export const AUTH_ERROR_PARAM = "auth_error";

export type AuthErrorCode =
  | "exchange_failed"
  | "verify_failed"
  | "session_failed"
  | "missing_params"
  | "not_configured";

export function getAuthErrorMessage(code: string): string {
  switch (code as AuthErrorCode) {
    case "exchange_failed":
      return "Sign-in link could not be completed. Request a new email link and open it in Safari if possible.";
    case "verify_failed":
      return "Email verification failed. Request a new link and try again.";
    case "session_failed":
      return "Could not start your session. Try signing in again in Safari.";
    case "missing_params":
      return "Sign-in link was incomplete. Request a new email link.";
    case "not_configured":
      return "Cloud sign-in is not configured on this deployment.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return [
    "exchange_failed",
    "verify_failed",
    "session_failed",
    "missing_params",
    "not_configured",
  ].includes(value);
}
