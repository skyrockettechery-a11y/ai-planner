import type { BusyPeriod, CalendarRange } from "@/types/calendar";

/** One local calendar day within a requested planning window. */
export interface CalendarDay {
  /** Human label: "Today", "Tomorrow", or e.g. "Mon, Oct 12" */
  label: string;
  /** Local midnight, ISO */
  start: string;
  /** Next local midnight, ISO */
  end: string;
}

export interface CalendarWindow {
  range: CalendarRange;
  timeMin: string;
  timeMax: string;
  days: CalendarDay[];
}

export interface DayBusy {
  day: CalendarDay;
  /** Busy periods clipped to this day. */
  periods: BusyPeriod[];
  busyMinutes: number;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayLabel(date: Date, offsetFromToday: number): string {
  if (offsetFromToday === 0) return "Today";
  if (offsetFromToday === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Computes a planning window in the browser's local time zone. */
export function computeCalendarWindow(
  range: CalendarRange,
  now: Date,
): CalendarWindow {
  const today = startOfLocalDay(now);
  const firstDayOffset = range === "tomorrow" ? 1 : 0;
  const dayCount = range === "week" ? 7 : 1;

  const days: CalendarDay[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const offset = firstDayOffset + i;
    const start = addLocalDays(today, offset);
    days.push({
      label: dayLabel(start, offset),
      start: start.toISOString(),
      end: addLocalDays(today, offset + 1).toISOString(),
    });
  }

  return {
    range,
    timeMin: days[0].start,
    timeMax: days[days.length - 1].end,
    days,
  };
}

/** Clips busy periods to each local day of the window (merging overlaps). */
export function groupBusyByDay(
  busy: BusyPeriod[],
  days: CalendarDay[],
): DayBusy[] {
  return days.map((day) => {
    const dayStart = new Date(day.start).getTime();
    const dayEnd = new Date(day.end).getTime();

    const clipped = busy
      .map((period) => ({
        start: Math.max(new Date(period.start).getTime(), dayStart),
        end: Math.min(new Date(period.end).getTime(), dayEnd),
      }))
      .filter((period) => period.end > period.start)
      .sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [];
    for (const period of clipped) {
      const last = merged[merged.length - 1];
      if (last && period.start <= last.end) {
        last.end = Math.max(last.end, period.end);
      } else {
        merged.push({ ...period });
      }
    }

    const busyMinutes = Math.round(
      merged.reduce((sum, period) => sum + (period.end - period.start), 0) /
        60000,
    );

    return {
      day,
      periods: merged.map((period) => ({
        start: new Date(period.start).toISOString(),
        end: new Date(period.end).toISOString(),
      })),
      busyMinutes,
    };
  });
}
