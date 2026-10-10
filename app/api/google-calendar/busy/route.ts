import type { NextRequest } from "next/server";
import { getGoogleCalendarConfig } from "@/lib/googleCalendar/config";
import { GoogleApiError, parseWindow, queryPrimaryBusy } from "@/lib/googleCalendar/freebusy";
import { GoogleOAuthError, refreshAccessToken } from "@/lib/googleCalendar/oauth";
import {
  getVerifiedUserId,
  jsonError,
  jsonOk,
} from "@/lib/googleCalendar/session";
import {
  deleteConnection,
  getConnection,
  type StoredConnection,
  UndecryptableTokenError,
} from "@/lib/googleCalendar/store";
import type { BusyResponse } from "@/types/calendar";

export const dynamic = "force-dynamic";

/**
 * Busy periods from the signed-in user's primary Google Calendar.
 * Query: ?timeMin=<ISO>&timeMax=<ISO> (window up to ~7 days, computed by the
 * client in its local time zone). Results are not stored.
 */
export async function GET(request: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return jsonError("not_signed_in", 401);
  }

  const config = getGoogleCalendarConfig();
  if (!config) {
    return jsonError("not_configured", 503);
  }

  const range = parseWindow(
    request.nextUrl.searchParams.get("timeMin"),
    request.nextUrl.searchParams.get("timeMax"),
  );
  if (!range) {
    return jsonError("invalid_range", 400);
  }

  let connection: StoredConnection | null;
  try {
    connection = await getConnection(userId, config.encryptionKey);
  } catch (error) {
    if (error instanceof UndecryptableTokenError) {
      try {
        await deleteConnection(userId);
      } catch {
        // Ignore; the user is asked to reconnect either way.
      }
      return jsonError("reauth_required", 401);
    }
    console.error(
      "[google-calendar/busy] Lookup failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonError("storage_error", 500);
  }
  if (!connection) {
    return jsonError("not_connected", 404);
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken({
      config,
      refreshToken: connection.refreshToken,
    });
  } catch (error) {
    if (error instanceof GoogleOAuthError && error.googleError === "invalid_grant") {
      // Revoked or expired by Google: drop the dead connection so the UI
      // returns to the disconnected state and offers reconnect.
      try {
        await deleteConnection(userId);
      } catch {
        // Ignore; status will still report reauth on the next attempt.
      }
      return jsonError("reauth_required", 401);
    }
    console.error(
      "[google-calendar/busy] Token refresh failed:",
      error instanceof GoogleOAuthError ? error.googleError ?? error.message : "unknown",
    );
    return jsonError("google_error", 502);
  }

  try {
    const busy = await queryPrimaryBusy({ accessToken, ...range });
    return jsonOk<BusyResponse>({ ...range, busy });
  } catch (error) {
    if (error instanceof GoogleApiError && (error.status === 401 || error.status === 403)) {
      return jsonError("reauth_required", 401);
    }
    console.error(
      "[google-calendar/busy] FreeBusy failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonError("google_error", 502);
  }
}
