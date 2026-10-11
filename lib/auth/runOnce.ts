/**
 * Completes auth params from the landing URL at most once per page load and
 * shares that attempt with later callers.
 *
 * React Strict Mode (development) mounts effects twice. Without this, an auth
 * code in the URL would be exchanged twice and the second attempt would fail
 * with "PKCE code verifier not found" after the first had already signed the
 * user in.
 *
 * Deliberately keyless: it stores only the attempt's promise (which resolves
 * to nothing), never the URL, so no code or token outlives the attempt in
 * memory. Auth links always arrive by full page navigation, which reloads
 * this module, so "once per page load" is enough.
 */
let attempt: Promise<void> | null = null;

export function completeAuthUrlOncePerPageLoad(
  task: () => Promise<void>,
): Promise<void> {
  attempt ??= task();
  return attempt;
}
