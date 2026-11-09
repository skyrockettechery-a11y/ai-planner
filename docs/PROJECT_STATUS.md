# Project Status

**Last updated:** November 2026  
**Production URL:** https://ai-planner-taupe.vercel.app  
**Current milestone:** Mission 12 (Smart Daily Scheduling, Calendar P2A) — Draft PR in review on `claude/p2a-smart-daily-scheduling-handoff`

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
| Google Calendar availability | ✅ Merged | Phase 1: connect + free/busy view of the primary calendar (Mission 11, PR #1); server env vars (incl. `SUPABASE_SECRET_KEY`) must be set per environment |
| Smart Daily Schedule | 🟡 In review | Calendar P2A (Mission 12): suggested time blocks for Today's Plan around busy times, manual adjustments, manual "Add to Google Calendar" links; drafts are in-memory only |

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

## Mission 12 — Smart Daily Scheduling, Calendar P2A (approved, in review)

Generates a suggested schedule for today from the Today's Plan top 3, placed around busy times on the primary Google Calendar. Users can change start times and lengths with immediate conflict warnings, start a block via Doing Now, and open a prefilled Google Calendar event form per block. Unknown availability (revoked grant, outage, network error) is shown as a warning, never as free time. See [MISSION_12.md](../MISSION_12.md).

- No calendar write-back (that is P2B, not approved), no OAuth scope change (`calendar.freebusy` only), no new routes, no database or schema change; drafts live in React state only
- Automated tests cover priority, busy-time conflicts, manual edits, time zones/DST, authorization errors, determinism and calendar links; lint, typecheck, tests and build pass
- GPT review round 1 addressed: malformed busy data is treated as unknown (never free); calendar links are disabled for conflicting or past blocks and re-checked at click time; links omit task notes unless the user opts in; the time check is taken after the calendar responds and re-run while the page is open
- Awaiting further GPT review and Sam's real-Google manual acceptance checklist (in MISSION_12.md) before merge

---

## Mission 11 — Google Calendar Phase 1 (merged)

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
- Not managing Google Calendar — AI Planner only reads free/busy availability. The Smart Daily Schedule (P2A) suggests time blocks and offers a link to Google's own event form; it never creates, edits or syncs events itself
- Not a native mobile app

See [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) for planned next steps.
