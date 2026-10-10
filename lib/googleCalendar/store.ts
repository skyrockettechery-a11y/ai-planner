/**
 * SERVER ONLY. Persistence for `public.google_calendar_connections` (Mission 11).
 *
 * Uses the service-role client because the table denies all access to the
 * anon/authenticated roles. Every function takes an explicit userId that the
 * caller must have obtained from a verified Supabase session.
 */
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { seal, unseal } from "@/lib/googleCalendar/crypto";

const TABLE = "google_calendar_connections";

function tokenContext(userId: string): string {
  return `google-calendar-refresh-token:${userId}`;
}

/** Stored ciphertext exists but cannot be decrypted (e.g. rotated key). */
export class UndecryptableTokenError extends Error {
  constructor() {
    super("Stored Google refresh token could not be decrypted");
    this.name = "UndecryptableTokenError";
  }
}

export interface StoredConnection {
  refreshToken: string;
  scope: string;
  connectedAt: string;
}

export interface ConnectionMetadata {
  connectedAt: string;
}

interface ConnectionRow {
  user_id: string;
  refresh_token_ciphertext: string;
  scope: string;
  connected_at: string;
  updated_at: string;
}

export async function saveConnection(params: {
  userId: string;
  refreshToken: string;
  scope: string;
  encryptionKey: Buffer;
}): Promise<void> {
  const now = new Date().toISOString();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: params.userId,
      refresh_token_ciphertext: seal(
        params.refreshToken,
        params.encryptionKey,
        tokenContext(params.userId),
      ),
      scope: params.scope,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`saveConnection failed: ${error.code ?? "unknown"}`);
}

export async function getConnectionMetadata(
  userId: string,
): Promise<ConnectionMetadata | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getConnectionMetadata failed: ${error.code ?? "unknown"}`);
  if (!data) return null;
  return { connectedAt: (data as Pick<ConnectionRow, "connected_at">).connected_at };
}

/**
 * Returns null if not connected. Throws UndecryptableTokenError when a row
 * exists but its token cannot be decrypted with the current key.
 */
export async function getConnection(
  userId: string,
  encryptionKey: Buffer,
): Promise<StoredConnection | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("refresh_token_ciphertext, scope, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getConnection failed: ${error.code ?? "unknown"}`);
  if (!data) return null;

  const row = data as Pick<
    ConnectionRow,
    "refresh_token_ciphertext" | "scope" | "connected_at"
  >;
  const refreshToken = unseal(
    row.refresh_token_ciphertext,
    encryptionKey,
    tokenContext(userId),
  );
  if (!refreshToken) throw new UndecryptableTokenError();

  return {
    refreshToken,
    scope: row.scope,
    connectedAt: row.connected_at,
  };
}

export async function deleteConnection(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from(TABLE).delete().eq("user_id", userId);
  if (error) throw new Error(`deleteConnection failed: ${error.code ?? "unknown"}`);
}
