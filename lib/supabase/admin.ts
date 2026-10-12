import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * SERVER ONLY. Privileged Supabase client authenticated with a Supabase
 * Secret API key (`sb_secret_...`).
 *
 * Bypasses Row Level Security, so it must only be used with an explicit user
 * id taken from a verified Supabase session. `import "server-only"` makes any
 * client-bundle import a build error; the env var has no NEXT_PUBLIC_ prefix,
 * so Next.js never inlines it, and Supabase itself rejects secret keys sent
 * from a browser.
 *
 * Currently used only for `public.google_calendar_connections`.
 */
export const SUPABASE_SECRET_KEY_ENV = "SUPABASE_SECRET_KEY";

/** Replaced by SUPABASE_SECRET_KEY; only read to explain a stale setup. */
const LEGACY_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

const SECRET_KEY_PREFIX = "sb_secret_";

export type SupabaseSecretKeyStatus = "ok" | "missing" | "invalid_format";

function readSecretKey(): string | null {
  return process.env[SUPABASE_SECRET_KEY_ENV]?.trim() || null;
}

export function getSupabaseSecretKeyStatus(): SupabaseSecretKeyStatus {
  const key = readSecretKey();
  if (!key) return "missing";
  // Catches a publishable key (sb_publishable_...) or a legacy JWT pasted
  // into the wrong variable before it surfaces as an RLS/storage error.
  return key.startsWith(SECRET_KEY_PREFIX) ? "ok" : "invalid_format";
}

/** Names (never values) of variables to fix, for server-side logs only. */
export function describeSupabaseSecretKeyProblem(): string | null {
  switch (getSupabaseSecretKeyStatus()) {
    case "ok":
      return null;
    case "invalid_format":
      return `${SUPABASE_SECRET_KEY_ENV} must be a Supabase Secret API key (${SECRET_KEY_PREFIX}...)`;
    case "missing":
      return process.env[LEGACY_SERVICE_ROLE_KEY_ENV]?.trim()
        ? `${SUPABASE_SECRET_KEY_ENV} is not set (${LEGACY_SERVICE_ROLE_KEY_ENV} is no longer used)`
        : `${SUPABASE_SECRET_KEY_ENV} is not set`;
  }
}

export function isSupabaseAdminConfigured(): boolean {
  return (
    getSupabaseSecretKeyStatus() === "ok" && getSupabasePublicConfig() !== null
  );
}

export function createSupabaseAdminClient(): SupabaseClient {
  const config = getSupabasePublicConfig();
  const secretKey = readSecretKey();
  if (!config || !secretKey?.startsWith(SECRET_KEY_PREFIX)) {
    throw new Error("Supabase secret key is not configured");
  }

  return createClient(config.url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
