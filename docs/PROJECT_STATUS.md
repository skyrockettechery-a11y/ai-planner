# Project Status

**Last updated:** October 2026  
**Production URL:** https://ai-planner-taupe.vercel.app  
**Current milestone:** Mission 11 (Google Calendar Phase 1) — in review on `feature/google-calendar-phase1`

---

## Summary

AI Planner is a deployed, cross-device task planning app built with Next.js and Supabase. It supports quick task capture, Eisenhower quadrant classification, rule-based daily recommendations, and cloud sync for signed-in users. The app works on desktop and mobile browsers and has been verified on Zenbook, desktop, and iPhone.

---

## Completed Capabilities

| Area | Status | Notes |
|------|--------|-------|
| Task CRUD | ✅ Complete | Add, edit, delete, complete, restore |
| Quadrant classification | ✅ Complete | Rule-based auto-classify + manual override |
| Active task views | ✅ Complete | Quadrant grid and sortable list |
| Today's Plan | ✅ Complete | Top 3 recommendations, modes, dismiss/hide |
| Doing Now | ✅ Complete | One-tap start, pinned execution focus |
| Local persistence | ✅ Complete | Works without sign-in via localStorage |
| Vercel deployment | ✅ Complete | Public URL live |
| Supabase cloud sync | ✅ Complete | Tasks and preferences sync across devices |
| Email magic link auth | ✅ Complete | Primary auth method in production |
| Quick capture layout | ✅ Complete | Add Task at top (Mission 08) |
| Google Calendar availability | 🟡 In review | Phase 1: connect + free/busy view of the primary calendar (Mission 11); Google Cloud OAuth and the Supabase migration are done; server env vars (incl. `SUPABASE_SECRET_KEY`) still need to be set per environment |

---

## Authentication

| Method | Status |
|--------|--------|
| Email magic link | ✅ Working in production |
| Google OAuth | ⚠️ UI present; provider not fully configured |

Users can use the app without signing in (local-only mode). Signing in enables cloud sync and cross-device access.

---

## Cloud Sync

- **Backend:** Supabase Postgres with Row Level Security
- **Tables:** `tasks`, `user_preferences` (+ `google_calendar_connections`, server-only, Mission 11)
- **Sync model:** Refresh-based (load on login, debounced push on local changes)
- **Verified devices:** Zenbook, desktop, iPhone — same account syncs tasks across phone and desktop
- **Not yet:** Realtime subscriptions (future mission)

---

## Source of Truth

| Layer | Authority |
|-------|-----------|
| Code & docs | **GitHub repository** (canonical) |
| Development | Desktop (primary), Zenbook (secondary) |
| Hosting | Vercel (deploys from GitHub) |
| Backend | Supabase Auth + PostgreSQL |

Local machines are development environments only — not the project source of truth.

---

## Mission 11 — Google Calendar Phase 1 (approved, in review)

Owner-approved milestone: connect Google Calendar with the `calendar.freebusy` scope and show busy periods (today / tomorrow / next 7 days). Read-only; AI Planner stays the source of truth for tasks. See [MISSION_11.md](../MISSION_11.md).

Owner setup done: Google Cloud OAuth client and `002_google_calendar_connections.sql` migration. Review follow-ups on PR #1: the server admin client now uses a Supabase Secret API key (`SUPABASE_SECRET_KEY`, replacing `SUPABASE_SERVICE_ROLE_KEY`), Google errors are classified (authorization vs configuration vs quota vs outage), the UI no longer implies "free" from the primary calendar alone, server modules use `server-only`, and GitHub Actions CI runs lint/typecheck/build on PRs.

---

## Mission 10 Complete

Mission 10 strengthened the documentation into a long-term knowledge system: decision log, UX principles, AI onboarding guide, North Star vision, and documentation maintenance rules.

---

## Documentation Archive Complete

The `docs/` folder is the project knowledge base. Start points:

- **AI assistants:** [AI_CONTEXT_FOR_NEW_CHAT.md](./AI_CONTEXT_FOR_NEW_CHAT.md)
- **Humans:** this file → [AI_PLANNER_VISION.md](./AI_PLANNER_VISION.md)

---

## Recent Product Milestones

**Mission 08** — Add Task at top of home screen (capture first).

**Mission 09** — Initial documentation archive and README index.

---

## Documentation Index

| Doc | Purpose |
|-----|---------|
| [AI_CONTEXT_FOR_NEW_CHAT.md](./AI_CONTEXT_FOR_NEW_CHAT.md) | Start here for new AI sessions |
| [DECISIONS.md](./DECISIONS.md) | Why key choices were made |
| [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) | Permanent UX philosophy |

Full index: [README.md](../README.md#documentation)

---

## Tech Stack (Current)

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Hosting:** Vercel
- **Backend:** Supabase Auth + Supabase Postgres
- **Client state:** External stores + `useSyncExternalStore`, cloud sync via `useCloudSync`

---

## What This Is Not (Yet)

- Not a realtime-synced app (refresh-based only)
- Not using a real AI/LLM API (classification and planning are rule-based)
- Not managing Google Calendar — Phase 1 only reads free/busy availability (no event creation, sync, or time blocking)
- Not a native mobile app

See [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) for planned next steps.
