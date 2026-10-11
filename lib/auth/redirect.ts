export const AUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Exactly `<origin>/auth/callback`, with no query string. Supabase matches
 * redirect URLs against its allow-list as globs over the full URL, so an
 * extra `?next=/` misses an exact entry like `http://localhost:3000/auth/callback`
 * and Supabase falls back to the Site URL — possibly another host that doesn't
 * hold this browser's PKCE code verifier. The callback defaults `next` to "/".
 */
export function authCallbackUrl(origin: string): string {
  return `${origin}${AUTH_CALLBACK_PATH}`;
}

/** Same-origin paths only; anything else (e.g. `//evil.example`) goes home. */
export function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/";
  }
  return raw;
}
