"use client";

import { useState, type MouseEvent } from "react";
import { useDailySchedule } from "@/hooks/useDailySchedule";
import { useDoingNow } from "@/hooks/useDoingNow";
import { NOT_CONNECTED_MESSAGE } from "@/lib/schedule/availability";
import { buildGoogleCalendarEventUrl } from "@/lib/schedule/calendarLink";
import {
  MAX_BUFFER_MINUTES,
  UNSCHEDULED_REASON_MESSAGES,
} from "@/lib/schedule/engine";
import {
  calendarLinkGateFromConflicts,
  describeAvailabilityTrust,
  type AvailabilityTrustLevel,
  type CalendarLinkGate,
} from "@/lib/schedule/linkGate";
import {
  parseEndTimeInput,
  parseTimeInput,
  toTimeInputValue,
} from "@/lib/schedule/timeInput";
import type {
  ScheduleAvailability,
  ScheduleBlock,
  ScheduleConflict,
} from "@/types/schedule";
import type { Task } from "@/types/task";

/**
 * Mission 12 / P2A — Smart Daily Schedule.
 *
 * Turns the Today's Plan recommendations into suggested time blocks that fit
 * around the primary Google Calendar's busy times. Everything here is a
 * *suggestion*: nothing is written to Google Calendar, and nothing is stored.
 * "Add to Google Calendar" opens Google's own event-creation page prefilled,
 * so the user saves the event themselves.
 */

interface SmartDailyScheduleProps {
  activeTasks: Task[];
  /** Google Calendar access was revoked/expired while checking availability. */
  onCalendarAccessLost?: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30];

const actionButtonClass =
  "min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40";

const fieldClass =
  "min-h-9 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800";

function localMinuteOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWindowLabel(startMinute: number, endMinute: number): string {
  const sample = (minute: number) =>
    new Date(2000, 0, 1, Math.floor(minute / 60) % 24, minute % 60)
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${sample(startMinute)} – ${endMinute === 24 * 60 ? "midnight" : sample(endMinute)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

const TRUST_BADGE_CLASS: Record<AvailabilityTrustLevel, string> = {
  checked: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "not-checked": "border-zinc-200 bg-zinc-50 text-zinc-700",
  unknown: "border-amber-200 bg-amber-50 text-amber-900",
};

function TrustBadge({ availability }: { availability: ScheduleAvailability }) {
  const trust = describeAvailabilityTrust(availability);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${TRUST_BADGE_CLASS[trust.level]}`}
    >
      {trust.label}
    </span>
  );
}

function BlockRow({
  block,
  conflicts,
  linkGate,
  includeNotes,
  onCalendarLinkClick,
  onStart,
  onStartTimeChange,
  onDurationChange,
}: {
  block: ScheduleBlock;
  conflicts: ScheduleConflict[];
  linkGate: CalendarLinkGate;
  includeNotes: boolean;
  onCalendarLinkClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onStart: () => void;
  onStartTimeChange: (startMinute: number) => void;
  onDurationChange: (minutes: number) => void;
}) {
  const calendarUrl = linkGate.enabled
    ? buildGoogleCalendarEventUrl(block, { includeNotes })
    : null;
  const durationOptions = DURATION_OPTIONS.includes(block.durationMinutes)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, block.durationMinutes].sort((a, b) => a - b);

  return (
    <li className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-2.5">
      <div className="flex flex-wrap items-start gap-2">
        <span
          title={`#${block.rank} in Today's Plan`}
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
        >
          <span aria-hidden="true">{block.rank}</span>
          <span className="sr-only">Priority {block.rank} in Today&apos;s Plan:</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-zinc-900">{block.title}</p>
            <span className="rounded-full border border-dashed border-zinc-300 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {block.adjusted ? "Adjusted" : "Suggested"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-600">
            {formatClock(block.start)} – {formatClock(block.end)} ·{" "}
            {formatDuration(block.durationMinutes)}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span className="sr-only sm:not-sr-only">Start</span>
              <input
                type="time"
                value={toTimeInputValue(localMinuteOfDay(block.start))}
                aria-label={`Start time for ${block.title}`}
                onChange={(event) => {
                  const minute = parseTimeInput(event.target.value);
                  if (minute !== null) onStartTimeChange(minute);
                }}
                className={fieldClass}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span className="sr-only sm:not-sr-only">Length</span>
              <select
                value={block.durationMinutes}
                aria-label={`Duration for ${block.title}`}
                onChange={(event) =>
                  onDurationChange(Number(event.target.value))
                }
                className={fieldClass}
              >
                {durationOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {conflicts.length > 0 && (
            <ul role="alert" className="mt-2 space-y-1">
              {conflicts.map((conflict) => (
                <li
                  key={conflict.kind}
                  className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900"
                >
                  {conflict.message}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStart}
              className={`${actionButtonClass} bg-zinc-900 text-white hover:bg-zinc-700`}
            >
              Start
            </button>
            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onCalendarLinkClick}
                className={`${actionButtonClass} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100`}
              >
                Add to Google Calendar
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-describedby={`calendar-link-note-${block.taskId}`}
                className={`${actionButtonClass} border border-zinc-200 bg-white text-zinc-700`}
              >
                Add to Google Calendar
              </button>
            )}
          </div>
          {!linkGate.enabled ? (
            <p
              id={`calendar-link-note-${block.taskId}`}
              className="mt-1.5 text-[11px] text-zinc-600"
            >
              {linkGate.reason}
            </p>
          ) : (
            linkGate.caution && (
              <p className="mt-1.5 text-[11px] text-amber-800">
                {linkGate.caution}
              </p>
            )
          )}
        </div>
      </div>
    </li>
  );
}

export function SmartDailySchedule({
  activeTasks,
  onCalendarAccessLost,
}: SmartDailyScheduleProps) {
  const { setDoingNow } = useDoingNow();
  const {
    settings,
    updateSettings,
    draft,
    conflictsByTaskId,
    availabilityMessage,
    pending,
    generate,
    refreshAvailability,
    recheckClock,
    calendarLinkGateAt,
    setBlockStart,
    setBlockDuration,
  } = useDailySchedule(activeTasks, { onCalendarAccessLost });

  // Off by default and never saved: notes go into the link's URL.
  const [includeNotes, setIncludeNotes] = useState(false);

  const [editingWindow, setEditingWindow] = useState(false);

  const nothingToSchedule =
    draft !== null &&
    draft.blocks.length === 0 &&
    draft.unscheduled.length === 0;
  const hasAdjustedBlocks =
    draft?.blocks.some((block) => block.adjusted) ?? false;
  const anyBlockHasNotes =
    draft?.blocks.some((block) => block.notes.trim() !== "") ?? false;

  /**
   * Final check at click time with a fresh clock: the rendered state may be
   * up to one re-check interval old, so a block that has just slipped into
   * the past is stopped here and the warnings refresh instead.
   */
  const handleCalendarLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    taskId: string,
  ) => {
    if (!calendarLinkGateAt(taskId, new Date()).enabled) {
      event.preventDefault();
      recheckClock();
    }
  };

  return (
    <section
      aria-label="Smart daily schedule"
      className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Assistant
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            Smart Daily Schedule
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Suggested time blocks for today&apos;s plan. Nothing is added to
            Google Calendar unless you save it there yourself.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={pending !== null}
          className={`${actionButtonClass} shrink-0 bg-zinc-900 text-white hover:bg-zinc-700`}
        >
          {pending === "generate"
            ? "Generating…"
            : draft
              ? "Regenerate"
              : "Generate Schedule"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-600">
        <span>
          Window {formatWindowLabel(settings.startMinute, settings.endMinute)} ·{" "}
          {settings.bufferMinutes} min buffer ·{" "}
          {formatDuration(settings.defaultDurationMinutes)} default
        </span>
        <button
          type="button"
          onClick={() => setEditingWindow((current) => !current)}
          aria-expanded={editingWindow}
          className="font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          {editingWindow ? "Done" : "Change"}
        </button>
      </div>

      {editingWindow && (
        <div className="mt-2 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Start
            <input
              type="time"
              value={toTimeInputValue(settings.startMinute)}
              onChange={(event) => {
                const minute = parseTimeInput(event.target.value);
                if (minute !== null) updateSettings({ startMinute: minute });
              }}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            End
            <input
              type="time"
              value={toTimeInputValue(settings.endMinute)}
              onChange={(event) => {
                const minute = parseEndTimeInput(event.target.value);
                if (minute !== null) updateSettings({ endMinute: minute });
              }}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Buffer
            <select
              value={settings.bufferMinutes}
              onChange={(event) =>
                updateSettings({ bufferMinutes: Number(event.target.value) })
              }
              className={fieldClass}
            >
              {BUFFER_OPTIONS.filter(
                (minutes) => minutes <= MAX_BUFFER_MINUTES,
              ).map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Default length
            <select
              value={settings.defaultDurationMinutes}
              onChange={(event) =>
                updateSettings({
                  defaultDurationMinutes: Number(event.target.value),
                })
              }
              className={fieldClass}
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </select>
          </label>
          <p className="basis-full text-[11px] text-zinc-500">
            Changes apply the next time you generate. Set End to midnight
            (00:00 / 12:00 AM) to plan to the end of the day. Window settings are not saved between
            visits.
          </p>
        </div>
      )}

      {draft && (
        <div className="mt-3">
          <TrustBadge availability={draft.availability} />
        </div>
      )}

      {draft && draft.availability === "not-connected" && (
        <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          {availabilityMessage ?? NOT_CONNECTED_MESSAGE}
        </p>
      )}

      {draft && draft.availability === "unavailable" && availabilityMessage && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          {availabilityMessage}
        </p>
      )}

      {draft && draft.availability === "live" && (
        <p className="mt-3 text-xs text-zinc-500">
          Checked against busy times on your primary Google Calendar only.
          Other calendars aren&apos;t included, so open time here doesn&apos;t
          guarantee you&apos;re free.
        </p>
      )}

      {!draft ? (
        <p className="mt-3 text-sm text-zinc-500">
          Generate a schedule to see when today&apos;s top tasks could fit
          around your calendar.
        </p>
      ) : nothingToSchedule ? (
        <p className="mt-3 text-sm text-zinc-500">
          No recommended tasks to schedule. Add a task — or reset dismissed
          suggestions in Today&apos;s Plan.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {draft.blocks.length > 0 && (
            <ol className="space-y-3">
              {draft.blocks.map((block) => (
                <BlockRow
                  key={block.taskId}
                  block={block}
                  conflicts={conflictsByTaskId[block.taskId] ?? []}
                  linkGate={calendarLinkGateFromConflicts(
                    conflictsByTaskId[block.taskId] ?? [],
                    draft.availability,
                  )}
                  includeNotes={includeNotes}
                  onCalendarLinkClick={(event) =>
                    handleCalendarLinkClick(event, block.taskId)
                  }
                  onStart={() => setDoingNow(block.taskId)}
                  onStartTimeChange={(startMinute) =>
                    setBlockStart(block.taskId, startMinute)
                  }
                  onDurationChange={(minutes) =>
                    setBlockDuration(block.taskId, minutes)
                  }
                />
              ))}
            </ol>
          )}

          {anyBlockHasNotes && (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2">
              <label className="flex items-start gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(event) => setIncludeNotes(event.target.checked)}
                  className="mt-0.5"
                />
                <span>Include task notes in Google Calendar links</span>
              </label>
              <p className="mt-1 pl-5 text-[11px] text-zinc-500">
                Links carry the task title and times. Anything in a link is
                part of its web address: opening it sends it to Google and
                keeps it in your browser history, even if you don&apos;t save
                the event. Off by default.
              </p>
            </div>
          )}

          {hasAdjustedBlocks && (
            <p className="text-[11px] text-zinc-500">
              Regenerate re-plans start times from scratch; lengths you chose
              are kept.
            </p>
          )}

          {draft.unscheduled.length > 0 && (
            <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5">
              <p className="text-xs font-medium text-zinc-700">
                Couldn&apos;t fit today
              </p>
              <ul className="mt-1.5 space-y-1">
                {draft.unscheduled.map((item) => (
                  <li key={item.taskId} className="text-xs text-zinc-600">
                    <span className="font-medium text-zinc-800">
                      #{item.rank} {item.title}
                    </span>{" "}
                    ({formatDuration(item.durationMinutes)}) —{" "}
                    {UNSCHEDULED_REASON_MESSAGES[item.reason]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshAvailability()}
              disabled={pending !== null}
              className={`${actionButtonClass} border border-zinc-200 text-zinc-700 hover:bg-zinc-50`}
            >
              {pending === "refresh" ? "Refreshing…" : "Refresh availability"}
            </button>
            <p className="text-[11px] text-zinc-500">
              Saved an event in Google Calendar? Refresh to check availability
              again — AI Planner can&apos;t tell whether you saved it.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
