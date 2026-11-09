# Mission 12 — Smart Daily Scheduling (P2A)

## Goal
Turn Today's Plan into a **suggested schedule for today**: time blocks for the top recommended tasks, placed around the busy times on the user's primary Google Calendar. The user can adjust blocks, then copy any block into Google Calendar themselves.

```
Today's Plan (priority) ─┐
                         ├─► scheduling engine ─► draft time blocks (in memory)
Google free/busy ────────┘                              │
                                                        ├─► adjust start / length (live conflict warnings)
                                                        ├─► Start → Doing Now
                                                        └─► "Add to Google Calendar" (opens Google's own prefilled form)
```

AI Planner stays the source of truth for tasks. Google Calendar stays an **external, read-only availability source** (Mission 11). P2A never writes to Google Calendar.

## Authorization
Owner-approved as Calendar Phase 2A (P2A), the next step after Mission 11. Calendar write-back is **P2B**, a separate, not-yet-approved milestone.

## Scope

### In scope (P2A)
1. **Daily schedule recommendations**
   - Uses `buildDailyPlan` (Missions 03/05) for ranking, so the schedule always matches Today's Plan: same mode (Auto / Urgency / Importance), same top 3, same dismissals
   - Completed and dismissed tasks are never scheduled
   - Placed inside a planning window (default 09:00–18:00 local), never before now (rounded up to the next 5 minutes), never on a busy period
   - Tasks are placed in priority order, and each takes the **earliest** open slot that fits it, so a lower-priority task can never push a higher-priority one out. A short lower-priority task may still use an early gap a longer task couldn't fit into
   - A configurable buffer (default 5 min) separates task blocks from each other; blocks may start right when a calendar event ends
   - Tasks that can't be placed are listed with a reason: window already ended · calendar busy for the rest of the window · longer than any open stretch · higher-priority tasks took the open time
2. **User adjustments**
   - Change a block's start time or length; the block is marked *Adjusted*
   - Warnings appear immediately for: overlapping another block, overlapping a busy period (only when availability is live), outside the planning window, starting before now
   - Window, buffer and default length are adjustable for the session (not saved)
   - Regenerate re-plans start times from scratch; lengths the user chose are kept
   - Refresh availability re-checks the calendar without moving any block
3. **Manual "Add to Google Calendar" links**
   - Each block links to `https://calendar.google.com/calendar/render?action=TEMPLATE…` with title, UTC start/end and details (duration, task notes, "one-time copy, not synced" notice)
   - The user reviews and saves the event in Google's UI. AI Planner doesn't call any event API and can't tell whether the event was saved

### Out of scope (not implemented)
- **P2B automated calendar write-back** (creating, updating or deleting events through the API)
- Any OAuth scope change: the only scope is still `calendar.freebusy`; Testing/publishing status is unchanged
- Persisting drafts (no database table, no localStorage, no schema change)
- Production, secrets, deployment configuration, authentication changes
- P1.1 privacy hardening (deferred, separate task)
- Multi-day scheduling, recurring blocks, auto-replanning, LLM scheduling

## Behaviour details

### Availability states
A failed calendar check never counts as an empty calendar.

| State | When | UI |
|-------|------|----|
| `live` | Busy route returned busy periods | Caption: primary calendar only, open time isn't a guarantee of being free |
| `not-connected` | `not_connected` (404) or `not_configured` (503) | Calm note: the schedule doesn't check the calendar |
| `unavailable` | Any other error (`reauth_required`, `not_signed_in`, rate limit, Google outage, storage error, network failure, malformed response) | Amber warning: "busy times are unknown — these blocks may overlap real events" + the Mission 11 error message |

When the schedule sees `reauth_required` (the server has already dropped the stored grant), the Google Calendar card is remounted so it re-checks status and shows **Connect**.

### Draft lifetime (transient state only)
- Held in React state for the current page only
- Cleared on reload, sign-out, account change (component keyed by user id) and Google Calendar disconnect/revocation detected by the Calendar card
- Shown through `reconcileDraftWithTasks`: blocks for tasks completed, deleted or dismissed after generation are hidden (and come back if restored); edited titles and notes are picked up

### Time zones and DST
- The window is built from local date parts (`new Date(y, m, d, h, min)`), not "midnight + N hours", so 09:00 stays 09:00 local on spring-forward and fall-back days
- All placement and conflict maths uses absolute epoch milliseconds, so busy periods from Google (UTC) and local windows compare correctly
- A non-existent local time (e.g. 02:30 on spring-forward day) resolves forward; an ambiguous one (01:30 on fall-back day) resolves to its first occurrence, which is standard `Date` behaviour
- Calendar links use UTC (`YYYYMMDDTHHMMSSZ`), so Google shows them in the user's calendar zone without a `ctz` guess

## Files

| File | Role |
|------|------|
| `types/schedule.ts` | Settings, draft, block (with Today's Plan `rank`), unscheduled reasons, conflict types |
| `lib/schedule/intervals.ts` | Epoch-ms interval merge / subtract / overlap |
| `lib/schedule/engine.ts` | Pure, deterministic engine: window, placement, manual edits, conflicts, task reconciliation |
| `lib/schedule/availability.ts` | `fetchScheduleBusy` (existing busy route, injectable fetch, never throws) and error → availability mapping |
| `lib/schedule/calendarLink.ts` | Prefilled Google Calendar link (percent-encoded, length-capped, surrogate-safe) |
| `lib/schedule/timeInput.ts` | `<input type="time">` helpers (`00:00` as end-of-day for the window end) |
| `hooks/useDailySchedule.ts` | Transient draft state, generate / refresh / adjust |
| `components/SmartDailySchedule.tsx` | UI, mounted under Today's Plan for signed-in users |
| `components/PlannerApp.tsx`, `components/CalendarAvailability.tsx`, `hooks/useGoogleCalendar.ts` | Mounting, clearing drafts on disconnect, re-checking the card on revocation |

No new API route, no server change, no database change, no new dependency.

## Review fixes applied to the handoff (`71390be`)
The handoff code compiled and linted, but review found these behaviour problems, now fixed:
1. **Wasted open time:** a forward-only cursor meant that once a high-priority long task landed late, lower-priority tasks couldn't use earlier gaps and showed "doesn't fit" while time was open. Now: earliest fit in priority order, with the buffer on both sides of placed blocks.
2. **Vague unscheduled reason:** a single global reason replaced by a per-task reason (adds `too-long`).
3. **Stuck "Refreshing…":** Generate during a pending Refresh superseded it without resetting its flag. Now one `pending` state, and both buttons are disabled while it's set.
4. **Stale drafts:** completed, deleted or dismissed tasks stayed in the draft, and edited titles weren't picked up. Fixed with `reconcileDraftWithTasks`.
5. **"Past" race:** placement used the time before the fetch, but conflicts used the time after it, so a slow response could flag a fresh block as past. Both now use the same instant.
6. **Malformed success response:** a 200 response without a valid `busy` array was treated as an empty calendar. It's now `unavailable`.
7. **Calendar link:** `URLSearchParams` produced `+` for spaces and `%2F` in `dates`. Now `encodeURIComponent` with a literal `/`, code-point-safe truncation, lone-surrogate replacement, inverted times rejected, and caps that keep CJK-heavy links under ~8 KB.
8. **Midnight window end** couldn't be selected (`00:00` was clamped). It now means end of day.
9. **Revoked grant during scheduling** left the Calendar card showing "connected". The card now re-checks its status.
10. Block badges show the Today's Plan rank, since blocks are listed in time order. Editing a time doesn't reorder the list, so the focused input never jumps.

## Tests
`npm test` runs `tests/**/*.test.ts` with Node's test runner (`tsx`). P2A adds:

| File | Covers |
|------|--------|
| `tests/schedule-engine.test.ts` | Priority and rank parity with Today's Plan in all three modes, completed/dismissed exclusion, earliest-fit, busy avoidance, grid snapping, buffers, durations, window-passed / no-free-time / too-long / no-room, never in the past, settings normalization, determinism and input-order independence, no input mutation, draft reconciliation, interval helpers |
| `tests/schedule-conflicts.test.ts` | Manual moves and resizes, block/block and block/busy overlaps, back-to-back blocks, outside window, starts before now, no busy claims when availability is unknown, order-independence |
| `tests/schedule-timezone.test.ts` | New York / Kolkata / Los Angeles / London windows, local vs UTC date, spring-forward and fall-back (23 h / 25 h days), non-existent and ambiguous local times, blocks across the gap and the repeated hour, edits on a transition day, zone-independent links |
| `tests/schedule-availability.test.ts` | Busy-route request shape, every error code (incl. `reauth_required`, `not_signed_in`, `not_connected`, `not_configured`), non-JSON errors, network failure, malformed 200 bodies, unknown availability downstream |
| `tests/schedule-calendar-link.test.ts` | URL shape, UTC stamps, `%20` / literal `/`, reserved and non-ASCII round-trip, details, caps, emoji and lone surrogates, invalid times, determinism |
| `tests/schedule-time-input.test.ts` | Time input parsing and midnight end |
| `tests/schedule-scope.test.ts` | Guard: OAuth scope still only `calendar.freebusy`; scheduling code has no Google API or events call, no storage or database access, and only uses `/api/google-calendar/busy` |

## Known limitations
- Only the **primary** calendar is checked (Mission 11 limitation); open time doesn't guarantee being free
- Today only. Drafts aren't saved, and a draft left open past midnight isn't refreshed automatically (Regenerate fixes it)
- Buffer spacing is applied when generating, but not re-checked after manual edits (overlaps are)
- AI Planner can't detect whether the user saved a linked event; "Refresh availability" re-reads free/busy
- Task notes are put into the Google link that the user opens (visible in the URL and browser history). This happens only when the user clicks
- A start time typed for a non-existent DST hour moves forward by an hour (browser `Date` behaviour)
- The Smart Daily Schedule is shown only to signed-in users, like the Calendar card
- No React component test framework in the repo (per AGENT_RULES: no heavy test frameworks), so the hook and component are covered by the pure-function tests plus a manual check

## Validation
- `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass
- UI checked in a headless browser (desktop 1000 px and mobile 390 px, `America/New_York`) with a stubbed busy route: live state, a manual edit onto a busy period showing the warning immediately, revoked-access warning, link encoding, no console errors. The temporary preview page wasn't committed

## Manual acceptance checklist (Sam, real accounts)
Run on `http://localhost:3000` with `.env.local` (secrets entered by Sam from Bitwarden only), signed in with a magic link.

**1. Generate**
- [ ] With Google Calendar connected and 3+ active tasks, **Generate Schedule** shows up to 3 blocks whose numbers match Today's Plan order
- [ ] Switch Today's Plan mode (Auto / Urgency / Importance) → Regenerate → ranks follow the new order
- [ ] Dismiss a task in Today's Plan → its block disappears; **Reset dismissed** → it comes back
- [ ] Complete a scheduled task → its block disappears
- [ ] Rename a scheduled task → the block title updates

**2. Busy time**
- [ ] Create a primary-calendar event in today's window → Regenerate → no block overlaps it
- [ ] An event on a secondary calendar is not avoided (expected; caption says primary only)
- [ ] Block the whole remaining window → tasks are listed under "Couldn't fit today" with the busy reason
- [ ] After the window end (or with a narrow window), the reason says the window has ended / to shorten or widen

**3. Adjust**
- [ ] Change a block's start onto a calendar event → "Overlaps a busy time" appears immediately
- [ ] Move one block onto another → both show "Overlaps …"
- [ ] Change a length → the end time updates, the block is marked *Adjusted*, and Regenerate keeps that length
- [ ] **Change** window: start 13:00, end 00:00 (midnight) → Regenerate → blocks are in the afternoon/evening

**4. Add to Google Calendar**
- [ ] Click **Add to Google Calendar** → a new tab opens Google's event form with the right title, date, start and end in your time zone, and details with the not-synced notice
- [ ] Save it in Google, return, **Refresh availability** → the block now shows "Overlaps a busy time" (the saved event is busy)
- [ ] Title with `&`, `#`, `%`, emoji or non-Latin text shows correctly in Google's form

**5. Authorization**
- [ ] Not connected → Generate works and shows "isn't connected, so this schedule doesn't check your calendar"
- [ ] Revoke AI Planner at <https://myaccount.google.com/permissions> → Generate → amber "busy times are unknown … access expired or was revoked" warning, and the Calendar card switches to **Connect**
- [ ] Disconnect from the Calendar card → the schedule draft is cleared
- [ ] Sign out → the schedule section disappears; sign in as another user → no draft carried over

**6. Time zone / DST (optional)**
- [ ] Change the computer's time zone, reload → the window is 09:00–18:00 in the new zone and Google links show the same times
- [ ] Optional: with the system clock set to a DST-transition day, the window still starts at 09:00 local

**7. Regression**
- [ ] Today's Plan, Doing Now (Start from a block sets Doing Now), task CRUD, sync and the Calendar busy-times card work as before
- [ ] Network tab: only `/api/google-calendar/busy` is called by the schedule; no request writes to Google

## Implementation notes (why)
- **Reuse `buildDailyPlan`** instead of a second ranking, so the schedule and Today's Plan can't disagree
- **Earliest fit in priority order** rather than chronological-equals-priority: it keeps priority guarantees without leaving usable gaps empty
- **Pure engine + injectable fetch** keeps everything testable with Node's built-in runner, without new test dependencies
- **Link, not API write**: no new scope, no token use, and the user stays in control (P2B is deliberately separate)
- **Alternatives avoided**: persisting drafts (needs a schema and a privacy review), `calendar.events` scope (P2B), an LLM scheduler (non-deterministic)
- **Future (P2B and later)**: opt-in write-back with explicit consent, multi-calendar busy data, multi-day planning, saved working-hours preferences
