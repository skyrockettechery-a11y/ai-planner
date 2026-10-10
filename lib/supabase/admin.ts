import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * SERVER ONLY. Service-role Supabase client.
 *
 * Bypasses Row Level Security, so it must never be imported from a
 * "use client" module and must only be used with an explicit user id taken
 * from a verified Supabase session. The key has no NEXT_PUBLIC_ prefix, so
 * Next.js never inlines it into client bundles.
 *
 * Currently used only for `public.google_calendar_connections`.
 */
export const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

export function getServiceRoleKey(): string | null {
  return process.env[SUPABASE_SERVICE_ROLE_KEY_ENV]?.trim() || null;
}

export function createServiceRoleClient(): SupabaseClient {
  const config = getSupabasePublicConfig();
  const serviceRoleKey = getServiceRoleKey();
  if (!config || !serviceRoleKey) {
    throw new Error("Supabase service role is not configured");
  }

  return createClient(config.url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
