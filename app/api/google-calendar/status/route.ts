import { getGoogleCalendarConfig } from "@/lib/googleCalendar/config";
import {
  getVerifiedUserId,
  jsonError,
  jsonOk,
} from "@/lib/googleCalendar/session";
import { getConnectionMetadata } from "@/lib/googleCalendar/store";
import type { CalendarStatus } from "@/types/calendar";

export const dynamic = "force-dynamic";

/** Connection status for the signed-in user. Never returns token material. */
export async function GET() {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return jsonError("not_signed_in", 401);
  }

  if (!getGoogleCalendarConfig()) {
    return jsonOk<CalendarStatus>({
      configured: false,
      connected: false,
      connectedAt: null,
    });
  }

  try {
    const metadata = await getConnectionMetadata(userId);
    return jsonOk<CalendarStatus>({
      configured: true,
      connected: metadata !== null,
      connectedAt: metadata?.connectedAt ?? null,
    });
  } catch (error) {
    console.error(
      "[google-calendar/status] Lookup failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonError("storage_error", 500);
  }
}
