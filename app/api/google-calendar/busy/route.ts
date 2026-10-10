import type { NextRequest } from "next/server";
import { getGoogleCalendarConfig } from "@/lib/googleCalendar/config";
import {
  classifyApiError,
  classifyOAuthError,
  describeGoogleError,
  failureResponse,
  type GoogleFailureKind,
} from "@/lib/googleCalendar/errors";
import { parseWindow, queryPrimaryBusy } from "@/lib/googleCalendar/freebusy";
import { refreshAccessToken } from "@/lib/googleCalendar/oauth";
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
 * Maps a classified Google failure to the response. Only authorization
 * failures (revoked/expired grant, missing scope) drop the stored connection
 * so the UI offers reconnect; configuration, quota and outage errors keep it,
 * because reconnecting would not help.
 */
async function googleFailure(
  userId: string,
  kind: GoogleFailureKind,
  stage: string,
  error: unknown,
) {
  console.error(
    `[google-calendar/busy] ${stage} failed (${kind}):`,
    describeGoogleError(error),
  );
  if (kind === "authorization") {
    try {
      await deleteConnection(userId);
    } catch {
      // Ignore; the user is asked to reconnect either way.
    }
  }
  const { code, status } = failureResponse(kind);
  return jsonError(code, status);
}

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
    return googleFailure(userId, classifyOAuthError(error), "Token refresh", error);
  }

  try {
    const busy = await queryPrimaryBusy({ accessToken, ...range });
    return jsonOk<BusyResponse>({ ...range, busy });
  } catch (error) {
    return googleFailure(userId, classifyApiError(error), "FreeBusy", error);
  }
}
