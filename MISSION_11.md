# Mission 11 — Google Calendar Integration Phase 1 (Availability)

## Goal
Connect a user's Google Calendar and let AI Planner understand calendar availability (busy periods).

This is **not** a calendar-management feature. AI Planner (Supabase) remains the source of truth for goals, tasks, priorities and deadlines. Google Calendar is an **external, read-only availability source**.

```
Google Calendar ──(free/busy only)──► AI Planner planning layer
```

## Authorization
Explicitly approved by the project owner as a new milestone (Task Card: "AI Planner — Google Calendar Integration Phase 1"). This supersedes the MVP exclusion of Google Calendar in `PROJECT_CONSTITUTION.md` for this bounded scope only.

## Required Features

### 1. Separate Google Calendar authorization
- Server-side OAuth 2.0 flow, independent of Supabase sign-in (magic link and Supabase Google sign-in are unchanged)
- Minimum scope: `https://www.googleapis.com/auth/calendar.freebusy`
- Authorization code + PKCE (S256) + sealed, single-use `state` cookie bound to the Supabase user id
- `access_type=offline`, `prompt=consent` so a refresh token is issued

### 2. Secure token storage
- Table `public.google_calendar_connections` (one row per user, `user_id → auth.users`)
- RLS enabled with **no policies**; all privileges revoked from `anon` and `authenticated` — the browser cannot read or write it
- Accessed only by server route handlers through a service-role client, always filtered by the user id from the verified Supabase session (`auth.getUser()`)
- Refresh token encrypted at rest with AES-256-GCM (`GOOGLE_TOKEN_ENCRYPTION_KEY`), with the user id as authenticated data
- Access tokens are never stored; one is minted per free/busy request

### 3. Availability query
- Client computes the window in its local time zone: **Today**, **Tomorrow**, **Next 7 days**
- Server validates the window (≤ ~8 days) and calls Google FreeBusy for the `primary` calendar
- Only start/end times are returned — no event titles, attendees or descriptions

### 4. Minimal UI
- "Calendar · Availability" card below Today's Plan, shown only to signed-in users
- States: checking · not configured on server · disconnected (Connect) · connected (range buttons, per-day bar + busy list, Disconnect) · callback success/error banner
- Revoked/expired grants return the card to the disconnected state with a reconnect message

## Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/google-calendar/connect` | GET | Start OAuth (requires Supabase session) |
| `/api/google-calendar/callback` | GET | Verify state + user, exchange code, store encrypted refresh token |
| `/api/google-calendar/status` | GET | `{ configured, connected, connectedAt }` |
| `/api/google-calendar/busy` | GET | `?timeMin&timeMax` → busy periods |
| `/api/google-calendar/disconnect` | POST | Revoke grant (best effort) and delete row |

`lib/supabase/middleware.ts` skips its sign-in `?code=` redirect for `/api/google-calendar/*` so Google's callback is not mistaken for a Supabase sign-in.

## Environment variables (server-only, never `NEXT_PUBLIC_`)
| Variable | Purpose |
|----------|---------|
| `GOOGLE_CALENDAR_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | 32 random bytes, base64 (`openssl rand -base64 32`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only access to the connections table |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Optional override; default `<origin>/api/google-calendar/callback` |

If any required variable is missing, the card shows "not configured" and the rest of the app is unaffected.

## Out of Scope (later milestones)
Creating/editing/deleting events · two-way sync · automatic time blocking · task ↔ event sync · recurring-event logic · webhooks · automatic replanning · Muse integration · LLM scheduling · major UI redesign · auth replacement. Calendar events are never converted into tasks.

## Validation
- `npm run lint` and `npm run build` pass
- Existing magic-link login and task sync unchanged
- Calendar data scoped to the signed-in user; no token reaches the browser
- Callback failure, denied consent, missing scope and disconnected states show clear messages
- No credentials in client bundles or repository files

## Implementation Notes (why)
- **Service role + deny-all RLS** instead of user-readable rows: even encrypted ciphertext never reaches the browser, and no SECURITY DEFINER RPC surface is exposed.
- **Encryption on top of RLS**: a leaked DB dump or misconfigured policy alone does not reveal usable Google tokens.
- **Client-computed window**: the user's time zone defines "today" without storing a profile setting.
- **Alternatives avoided**: storing tokens in browser storage (exposed to JS); a per-browser encrypted cookie (no cross-device connection); requesting `calendar.readonly` (broader than needed).
- **Future**: multiple calendars, cached availability, feeding busy time into Today's Plan.

## Deliverables
Feature branch `feature/google-calendar-phase1` and a Draft PR for human review (not merged).
