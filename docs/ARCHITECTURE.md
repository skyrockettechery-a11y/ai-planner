# Architecture

High-level technical overview of AI Planner as of Mission 08.

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

---

## Repository Structure

```
app/                    Next.js routes, layout, global styles
  auth/callback/        OAuth / magic-link callback handler
components/             UI components (PlannerApp, forms, sections)
hooks/                  useAuth, useTasks, useCloudSync, useDoingNow, …
lib/                    Business logic, stores, Supabase clients
  auth/                 Auth helpers, URL cleanup, error mapping
  supabase/             Client, server, middleware, tasks, preferences
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
- **Middleware:** `middleware.ts` → `lib/supabase/middleware.ts` refreshes Supabase session cookies
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

Schema and RLS policies: `supabase/migrations/001_cloud_sync.sql`

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

**Never commit secrets.** Anon key is public by design; service role keys must not appear in the repo.

---

## Security

- **Row Level Security** on `tasks` and `user_preferences` — users access only their own rows
- **No admin API** — no cross-user data access in the app
- **Session cookies** managed by `@supabase/ssr` middleware pattern

---

## Related Docs

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — Vercel and Supabase setup
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — auth and sync caveats
- [MVP_SPEC.md](../MVP_SPEC.md) — original feature specification
