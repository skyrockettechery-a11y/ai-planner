/**
 * Supabase auth cookie names (names only — this module never reads values).
 *
 * Mirrors supabase-js's default storage key (`sb-<project-ref>-auth-token`)
 * and @supabase/ssr's chunking (`<key>`, `<key>.0`, `<key>.1`, …). The PKCE
 * code verifier lives in `<key>-code-verifier`, which is NOT a session cookie.
 */

export function supabaseAuthStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export function codeVerifierCookieName(storageKey: string): string {
  return `${storageKey}-code-verifier`;
}

/** True for the session cookie or one of its chunks; false for the verifier. */
export function isSessionCookieName(name: string, storageKey: string): boolean {
  if (name === storageKey) return true;
  const prefix = `${storageKey}.`;
  return name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length));
}

/**
 * Which auth cookies a request carried — booleans only, safe to log. Used by
 * `/auth/callback` to tell "verifier never reached the server" apart from
 * other exchange failures.
 */
export function describeAuthCookies(names: string[], storageKey: string) {
  return {
    hadCodeVerifierCookie: names.includes(codeVerifierCookieName(storageKey)),
    hadSessionCookie: names.some((name) => isSessionCookieName(name, storageKey)),
  };
}
