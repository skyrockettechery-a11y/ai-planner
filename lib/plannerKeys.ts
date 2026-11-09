/**
 * React keys for the signed-in calendar sections in `PlannerApp`
 * (Mission 12 / P2A).
 *
 * `SmartDailySchedule` and `CalendarAvailability` are siblings, and each is
 * keyed so it remounts for its own reason:
 * - schedule: on account change, or when the Calendar card reports a
 *   disconnect (discards the transient draft)
 * - calendar card: on account change, or when the schedule finds Google
 *   access revoked (re-checks connection status)
 *
 * Sibling keys must be unique. Both epoch counters start at 0, so keys built
 * from `userId:epoch` alone collide (React "Encountered two children with the
 * same key"). Each key therefore carries its own namespace prefix.
 */

export function scheduleSectionKey(userId: string, epoch: number): string {
  return `schedule:${userId}:${epoch}`;
}

export function calendarCardKey(userId: string, epoch: number): string {
  return `calendar:${userId}:${epoch}`;
}
