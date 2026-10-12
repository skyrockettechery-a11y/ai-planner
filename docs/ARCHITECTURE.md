# Architecture

High-level technical overview of AI Planner as of Mission 11 (Google Calendar Phase 1).

---

## Stack Overview

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript |
| Hosting | Vercel |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| Client persistence | localStorage (anonymous / fallback) |
| External availability | Google Calendar FreeBusy API (Mission 11, read-only) |

---

## Repository Structure

```
app/                    Next.js routes, layout, global styles
  auth/callback/        OAuth / magic-link callback handler
  api/google-calendar/  Calendar OAuth + free/busy route handlers (server-only)
components/             UI components (PlannerApp, forms, sections)
hooks/                  useAuth, useTasks, useCloudSync, useDoingNow, …
lib/                    Business logic, stores, Supabase clients
  auth/                 Auth helpers, URL cleanup, error mapping
  supabase/             Client, server, middleware, tasks, preferences, admin (secret key, server-only)
  googleCalendar/       Server-only Google OAuth, token crypto, FreeBusy, connection store
types/                  Task, view mode, plan preference types
supabase/migrations/    SQL schema (run manually in Supabase Dashboard)
docs/                   Documentation archive (Mission 09)
```

---

## Application Layout (UI Order)

After Mission 08, the home screen renders top to bottom:

1. **Header** — title, auth bar, auth feedback
2. **Add Task** — quick capture form
3. **Import local banner** — when signed in with local-only tasks
4. **Daily Overview** — active/completed counts
5. **Doing Now** — current execution focus
6. **Today's Plan** — top 3 recommendations
6a. **Calendar availability** — signed-in users only (Mission 11)
7. **Active Tasks** — quadrant or list view
8. **Completed Tasks** — collapsible completed section

---

## State Management

### External stores (local-first)

Client state uses small external stores subscribed via `useSyncExternalStore`:

| Store | File | Data |
|-------|------|------|
| Tasks | `lib/taskStore.ts` | All tasks; persists to localStorage |
| Doing Now | `lib/doingNowStore.ts` | Current focus task id |
| Plan preferences | `lib/planPreferencesStore.ts` | Mode, dismissed ids, hidden flag |

Hooks (`useTasks`, `useDoingNow`, `usePlanPreferences`) wrap these stores for components.

### Cloud sync

`hooks/useCloudSync.ts` orchestrates bidirectional sync when a user is signed in:

1. **On login** — fetch cloud tasks and preferences, apply to local stores
2. **On local change** — debounced push to Supabase (`syncCloudTasks`, `syncCloudPreferences`)
3. **Model** — refresh-based; no realtime subscriptions yet

Sync is gated on auth hydration completing (`ready && Boolean(user)`).

---

## Authentication Flow

```
User → AuthBar (email or Google button)
         ↓
Supabase Auth (magic link email OTP)
         ↓
/auth/callback route → session cookies set
         ↓
middleware (updateSession) → refresh session on each request
         ↓
useAuth → user state in PlannerApp
```

- **Email magic link:** Primary working method in production
- **Google OAuth:** Button wired in UI; provider configuration incomplete
- **Middleware:** `middleware.ts` → `lib/supabase/middleware.ts` refreshes Supabase session cookies — except on `/auth/callback`, and only *after* forwarding any sign-in params (`?code=`, `token_hash`) on other pages to `/auth/callback`, because refreshing a stale session would delete the PKCE code verifier before the exchange
- **PKCE:** the browser stores a code verifier cookie at sign-in; `/auth/callback` exchanges `?code=` server-side using it. Redirect URLs are exactly `<origin>/auth/callback` so they match the Supabase allow-list. `AuthSessionHandler` is the only client-side handler of auth params in the URL (`detectSessionInUrl: false`), once per page load
- **URL cleanup:** Auth error/success params cleaned from URL (`lib/auth/cleanAuthUrl.ts`, `AuthSessionHandler`)

---

## Data Model

### Task (client + `public.tasks`)

| Field | Type | Notes |
|-------|------|-------|
| id | text | Client-generated id |
| title | text | Required |
| notes | text | Default empty |
| due_date | date | Optional |
| quadrant | text | Eisenhower quadrant key |
| completed | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| user_id | uuid | Supabase only; RLS enforced |

### User preferences (`public.user_preferences`)

| Field | Type | Notes |
|-------|------|-------|
| user_id | uuid | Primary key |
| doing_now_id | text | Nullable |
| plan_mode | text | `auto` \| `urgency` \| `importance` |
| dismissed_ids | jsonb | Array of task ids |
| plan_hidden | boolean | |
| updated_at | timestamptz | |

### Google Calendar connection (`public.google_calendar_connections`, Mission 11)

| Field | Type | Notes |
|-------|------|-------|
| user_id | uuid | Primary key → `auth.users`, cascade delete |
| refresh_token_ciphertext | text | AES-256-GCM, user id as AAD |
| scope | text | Granted scope (expected `calendar.freebusy`) |
| connected_at | timestamptz | |
| updated_at | timestamptz | |

RLS enabled with **no policies**; privileges revoked from `anon` and `authenticated`. Only server routes read/write it via the Supabase admin client (Secret API key `sb_secret_...`).

Schema and RLS policies: `supabase/migrations/001_cloud_sync.sql`, `supabase/migrations/002_google_calendar_connections.sql`

---

## Google Calendar Availability (Mission 11)

Google Calendar is an **external availability source**. It never creates, edits or replaces AI Planner tasks.

```
CalendarAvailability (client)
   │  fetch /api/google-calendar/*   (Supabase session cookie only)
   ▼
Route handlers (server)
   ├─ auth.getUser()  → verified user id
   ├─ lib/googleCalendar/store  → secret-key (admin) read of encrypted refresh token
   ├─ lib/googleCalendar/oauth  → refresh → short-lived access token (not stored)
   └─ lib/googleCalendar/freebusy → Google FreeBusy (primary calendar)
   ▼
{ busy: [{start, end}] }  → per-day bar + list in the UI
```

- **OAuth flow:** `/api/google-calendar/connect` → Google consent (scope `calendar.freebusy`, PKCE, sealed single-use state cookie bound to the user) → `/api/google-calendar/callback` → `/?calendar=connected` or `/?calendar_error=<code>`
- **Separate from sign-in:** Supabase Auth is untouched; the middleware skips its `?code=` sign-in redirect for `/api/google-calendar/*`
- **Window:** computed in the browser's time zone (Today / Tomorrow / Next 7 days); server caps it at ~8 days
- **Error classes** (`lib/googleCalendar/errors.ts`): authorization (`invalid_grant`, 401, missing scope) deletes the connection and the UI returns to "Connect"; configuration (`invalid_client`, Calendar API disabled), rate limit/quota, and Google outages keep the connection and show a specific message
- **Primary calendar only:** the UI says "No busy times on primary calendar" rather than "free", and notes that other calendars aren't checked
- **Server-only boundary:** every `lib/googleCalendar/*` module, `lib/supabase/admin.ts` and `lib/supabase/server.ts` import `server-only`, so a Client Component import fails the build. The client uses only `types/calendar.ts`, `lib/calendarWindow.ts` and the API routes

---

## Rule-Based "AI" Logic

No external LLM is used. Placeholder intelligence lives in:

| Module | Purpose |
|--------|---------|
| `lib/classify.ts` | Keyword-based Important/Urgent classification |
| `lib/dailyPlan.ts` | Today's Plan top-3 selection and warnings |
| `lib/sortTasks.ts` | List view sort orders |
| `lib/quadrants.ts` | Quadrant labels and grouping |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | For cloud sync | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For cloud sync | Supabase anon/public key |

Without these, the app runs in local-only mode. Config is read via `lib/supabase/config.ts` and passed to the client through `SupabaseConfigProvider`.

**Google Calendar (server-only, Mission 11)** — none use `NEXT_PUBLIC_`, so they are never inlined into client bundles:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_CALENDAR_CLIENT_ID` | For Calendar | Google OAuth client id |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | For Calendar | Google OAuth client secret |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | For Calendar | 32-byte base64 key for refresh-token encryption |
| `SUPABASE_SECRET_KEY` | For Calendar | Supabase Secret API key (`sb_secret_...`) for server-only access to `google_calendar_connections` (replaces legacy `SUPABASE_SERVICE_ROLE_KEY`) |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Optional | Override callback URL (default `<origin>/api/google-calendar/callback`) |

If any required Calendar variable is missing or malformed, the Calendar card reports "not configured", the server log names the variable (not its value), and the rest of the app is unaffected.

**Never commit secrets.** Anon key is public by design; Supabase secret keys, Google client secrets and the encryption key must not appear in the repo, docs or PRs.

---

## Security

- **Row Level Security** on `tasks` and `user_preferences` — users access only their own rows
- **Deny-all table** for Google Calendar tokens — browser roles have no access; server routes scope every query to the session user id
- **Google tokens** — refresh tokens encrypted at rest; access tokens never persisted; nothing token-related is returned to the client
- **No admin API** — no cross-user data access in the app (the secret-key admin client is used only for the current user's Calendar row)
- **Session cookies** managed by `@supabase/ssr` middleware pattern

---

## Related Docs

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — Vercel and Supabase setup
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — auth and sync caveats
- [MVP_SPEC.md](../MVP_SPEC.md) — original feature specification
