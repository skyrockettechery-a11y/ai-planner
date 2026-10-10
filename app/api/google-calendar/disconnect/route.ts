import { getGoogleCalendarConfig } from "@/lib/googleCalendar/config";
import { revokeToken } from "@/lib/googleCalendar/oauth";
import {
  getVerifiedUserId,
  jsonError,
  jsonOk,
} from "@/lib/googleCalendar/session";
import {
  UndecryptableTokenError,
  deleteConnection,
  getConnection,
  type StoredConnection,
} from "@/lib/googleCalendar/store";

export const dynamic = "force-dynamic";

/** Revokes the Google grant (best effort) and deletes the stored connection. */
export async function POST() {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return jsonError("not_signed_in", 401);
  }

  const config = getGoogleCalendarConfig();
  if (!config) {
    return jsonError("not_configured", 503);
  }

  try {
    let connection: StoredConnection | null = null;
    try {
      connection = await getConnection(userId, config.encryptionKey);
    } catch (error) {
      // An undecryptable token can't be revoked; still delete the row.
      if (!(error instanceof UndecryptableTokenError)) throw error;
    }
    if (connection) {
      await revokeToken(connection.refreshToken);
    }
    await deleteConnection(userId);
    return jsonOk({ connected: false });
  } catch (error) {
    console.error(
      "[google-calendar/disconnect] Failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonError("storage_error", 500);
  }
}
