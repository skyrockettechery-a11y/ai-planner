/**
 * Conversions between minutes-from-local-midnight and `<input type="time">`
 * values (`HH:MM`, 24-hour) for the Smart Daily Schedule (Mission 12).
 */

const MINUTES_PER_DAY = 24 * 60;

/** `HH:MM`; 1440 (end-of-day midnight) is shown as `00:00`. */
export function toTimeInputValue(minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60) % 24;
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Minutes from midnight for a valid `HH:MM` value, otherwise `null`. */
export function parseTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Like `parseTimeInput`, for a window *end*: `00:00` means the coming
 * midnight (1440), so a window can run to the end of the day.
 */
export function parseEndTimeInput(value: string): number | null {
  const minute = parseTimeInput(value);
  return minute === 0 ? MINUTES_PER_DAY : minute;
}
