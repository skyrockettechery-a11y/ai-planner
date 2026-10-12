import { createBrowserClient } from "@supabase/ssr";
import type { SupabasePublicConfig } from "@/lib/supabase/config";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createBrowserClientFromConfig(config: SupabasePublicConfig) {
  return createBrowserClient(config.url, config.anonKey, {
    auth: {
      // AuthSessionHandler is the single owner of auth params in the URL.
      // With auto-detection on as well, both exchange the same PKCE code; the
      // loser fails with "PKCE code verifier not found" and reports an error
      // even though sign-in succeeded.
      detectSessionInUrl: false,
    },
  });
}

export function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("Supabase is not configured");
  }
  return createBrowserClientFromConfig(config);
}

export function createClientIfConfigured(
  config?: SupabasePublicConfig | null,
) {
  const resolved = config ?? getSupabasePublicConfig();
  if (!resolved) return null;
  return createBrowserClientFromConfig(resolved);
}
