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
- Accessed only by server route handlers through a Supabase admin client authenticated with a **Supabase Secret API key** (`sb_secret_...`), always filtered by the user id from the verified Supabase session (`auth.getUser()`)
- Refresh token encrypted at rest with AES-256-GCM (`GOOGLE_TOKEN_ENCRYPTION_KEY`), with the user id as authenticated data
- Access tokens are never stored; one is minted per free/busy request

### 3. Availability query
- Client computes the window in its local time zone: **Today**, **Tomorrow**, **Next 7 days**
- Server validates the window (≤ ~8 days) and calls Google FreeBusy for the `primary` calendar
- Only start/end times are returned — no event titles, attendees or descriptions

### 4. Minimal UI
- "Google Calendar · Busy times" card below Today's Plan, shown only to signed-in users
- States: checking · not configured on server · disconnected (Connect) · connected (range buttons, per-day bar + busy list, Disconnect) · callback success/error banner
- Wording never says "free": only the **primary** calendar is checked, so an empty day reads "No busy times on primary calendar" and the card states that other calendars aren't included
- Revoked/expired grants return the card to the disconnected state with a reconnect message

### 5. Error handling
Google failures are classified (`lib/googleCalendar/errors.ts`) so the user only sees "connect again" when reconnecting would actually help:

| Kind | Examples | Code / HTTP | Connection |
|------|----------|-------------|------------|
| Authorization | `invalid_grant`, 401 `authError`, 403 `insufficientPermissions` | `reauth_required` / 401 | Deleted → reconnect |
| Configuration | `invalid_client`, `unauthorized_client`, 403 `accessNotConfigured` / `SERVICE_DISABLED` | `google_config_error` / 503 | Kept |
| Rate limit / quota | 429, 403 `rateLimitExceeded` / `userRateLimitExceeded` / `quotaExceeded` | `google_rate_limited` / 429 | Kept |
| Unavailable | 5xx, network failure, `backendError` | `google_unavailable` / 503 | Kept |
| Other | anything else (e.g. unknown 403) | `google_error` / 502 | Kept |

Server logs record only the HTTP status and Google reason codes — never tokens.

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
| `SUPABASE_SECRET_KEY` | Supabase Secret API key (`sb_secret_...`) for server-only access to the connections table. Replaces the legacy `SUPABASE_SERVICE_ROLE_KEY`, which is no longer read |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Optional override; default `<origin>/api/google-calendar/callback` |

If any required variable is missing or malformed (e.g. a publishable key or legacy JWT in `SUPABASE_SECRET_KEY`), the card shows "not configured", the server log names the variable (never its value), and the rest of the app is unaffected.

## Server-only boundaries
Every module in `lib/googleCalendar/`, plus `lib/supabase/admin.ts` and `lib/supabase/server.ts`, starts with `import "server-only"`, so importing one from a Client Component fails the build (verified). Client code may only use `types/calendar.ts`, `lib/calendarWindow.ts` and the `/api/google-calendar/*` routes.

## Out of Scope (later milestones)
Creating/editing/deleting events · two-way sync · automatic time blocking · task ↔ event sync · recurring-event logic · webhooks · automatic replanning · Muse integration · LLM scheduling · major UI redesign · auth replacement. Calendar events are never converted into tasks.

## Validation
- `npm run lint` and `npm run build` pass
- Existing magic-link login and task sync unchanged
- Calendar data scoped to the signed-in user; no token reaches the browser
- Callback failure, denied consent, missing scope and disconnected states show clear messages
- No credentials in client bundles or repository files

## Implementation Notes (why)
- **Secret-key admin client + deny-all RLS** instead of user-readable rows: even encrypted ciphertext never reaches the browser, and no SECURITY DEFINER RPC surface is exposed.
- **Encryption on top of RLS**: a leaked DB dump or misconfigured policy alone does not reveal usable Google tokens.
- **Client-computed window**: the user's time zone defines "today" without storing a profile setting.
- **Alternatives avoided**: storing tokens in browser storage (exposed to JS); a per-browser encrypted cookie (no cross-device connection); requesting `calendar.readonly` (broader than needed).
- **Future**: multiple calendars, cached availability, feeding busy time into Today's Plan.

## Deliverables
Feature branch `feature/google-calendar-phase1` and Draft PR #1 for GPT review; Sam merges manually. CI (`.github/workflows/ci.yml`) runs lint, typecheck and build on every PR update.
