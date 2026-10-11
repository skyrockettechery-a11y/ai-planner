/**
 * Runs `task` at most once per key for the lifetime of the page and shares
 * its promise with later callers.
 *
 * React Strict Mode (development) mounts effects twice. Without this, an auth
 * code in the URL would be exchanged twice and the second attempt would fail
 * with "PKCE code verifier not found" after the first had already signed the
 * user in. Keys stay in memory only and are never logged.
 */
const tasks = new Map<string, Promise<unknown>>();

export function runOncePerKey<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = tasks.get(key);
  if (existing) return existing as Promise<T>;
  const started = task();
  tasks.set(key, started);
  return started;
}
