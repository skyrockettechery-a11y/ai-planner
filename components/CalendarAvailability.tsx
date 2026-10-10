"use client";

import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import type { DayBusy } from "@/lib/calendarWindow";
import type { CalendarRange } from "@/types/calendar";

/**
 * Mission 11 — Google Calendar availability (free/busy only).
 * Read-only view of busy periods; never creates tasks or calendar events.
 */

const RANGE_OPTIONS: { value: CalendarRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "Next 7 days" },
];

const actionButtonClass =
  "min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40";

function formatTime(iso: string, dayEnd: string): string {
  if (iso === dayEnd) return "midnight";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function DayRow({ entry }: { entry: DayBusy }) {
  const dayStart = new Date(entry.day.start).getTime();
  const dayLength = new Date(entry.day.end).getTime() - dayStart;

  return (
    <li className="rounded-lg border border-zinc-100 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">{entry.day.label}</p>
        <p className="text-xs text-zinc-500">
          {entry.periods.length === 0
            ? "Free all day"
            : `Busy ${formatDuration(entry.busyMinutes)}`}
        </p>
      </div>

      <div
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"
        aria-hidden="true"
      >
        {entry.periods.map((period) => {
          const left =
            ((new Date(period.start).getTime() - dayStart) / dayLength) * 100;
          const width =
            ((new Date(period.end).getTime() -
              new Date(period.start).getTime()) /
              dayLength) *
            100;
          return (
            <div
              key={`${period.start}-${period.end}`}
              className="absolute inset-y-0 rounded-full bg-zinc-800"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
            />
          );
        })}
      </div>
      <div
        className="mt-1 flex justify-between text-[10px] text-zinc-400"
        aria-hidden="true"
      >
        <span>12 AM</span>
        <span>12 PM</span>
        <span>12 AM</span>
      </div>

      {entry.periods.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.periods.map((period) => (
            <li
              key={`${period.start}-${period.end}`}
              className="text-xs text-zinc-700"
            >
              Busy {formatTime(period.start, entry.day.end)} –{" "}
              {formatTime(period.end, entry.day.end)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function CalendarAvailability() {
  const {
    feedback,
    dismissFeedback,
    status,
    statusLoading,
    statusError,
    busy,
    busyLoading,
    busyError,
    disconnecting,
    connect,
    disconnect,
    loadBusy,
  } = useGoogleCalendar();

  const connected = status?.connected === true;

  return (
    <section
      aria-label="Calendar availability"
      className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Calendar
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            Availability
          </h2>
        </div>
        {connected && (
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={disconnecting}
            className={`${actionButtonClass} text-zinc-600 hover:text-zinc-900`}
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>

      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`mt-3 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
            feedback.kind === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <p>{feedback.message}</p>
          <button
            type="button"
            onClick={dismissFeedback}
            className="shrink-0 text-xs font-medium underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-3">
        {statusLoading ? (
          <p className="text-sm text-zinc-500">Checking Google Calendar…</p>
        ) : statusError ? (
          <p className="text-sm text-red-700">{statusError}</p>
        ) : status && !status.configured ? (
          <p className="text-sm text-zinc-500">
            Google Calendar isn&apos;t configured on this server yet.
          </p>
        ) : !connected ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-600">
              Connect Google Calendar to see when you&apos;re busy. AI Planner
              only reads free/busy times — never event details — and
              doesn&apos;t change your calendar.
            </p>
            <button
              type="button"
              onClick={connect}
              className={`${actionButtonClass} bg-zinc-900 text-white hover:bg-zinc-700`}
            >
              Connect Google Calendar
            </button>
            {busyError && <p className="text-xs text-red-700">{busyError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div
              role="group"
              aria-label="Planning window"
              className="flex flex-wrap gap-2"
            >
              {RANGE_OPTIONS.map((option) => {
                const active = busy?.range === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void loadBusy(option.value)}
                    disabled={busyLoading}
                    aria-pressed={active}
                    className={`${actionButtonClass} border ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {busyError && <p className="text-xs text-red-700">{busyError}</p>}

            {busyLoading && !busy ? (
              <p className="text-sm text-zinc-500">Loading busy times…</p>
            ) : busy ? (
              <ul
                className={`space-y-2 ${busyLoading ? "opacity-60" : ""}`}
                aria-busy={busyLoading}
              >
                {busy.days.map((entry) => (
                  <DayRow key={entry.day.start} entry={entry} />
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
