/** Public env var names (safe to display in diagnostics). */
export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseConfigDiagnostic = {
  configured: boolean;
  missing: string[];
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env[SUPABASE_URL_ENV]?.trim();
  const anonKey = process.env[SUPABASE_ANON_KEY_ENV]?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabaseConfigDiagnostic(): SupabaseConfigDiagnostic {
  const missing: string[] = [];

  if (!process.env[SUPABASE_URL_ENV]?.trim()) {
    missing.push(SUPABASE_URL_ENV);
  }
  if (!process.env[SUPABASE_ANON_KEY_ENV]?.trim()) {
    missing.push(SUPABASE_ANON_KEY_ENV);
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}

/** @deprecated Prefer getSupabasePublicConfig() or context config from the server. */
export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}
