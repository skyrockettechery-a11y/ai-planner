# Project Status

**Last updated:** July 2026  
**Production URL:** https://ai-planner-taupe.vercel.app  
**Current milestone:** Mission 10 complete

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
- **Tables:** `tasks`, `user_preferences`
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
- Not integrated with Google Calendar
- Not a native mobile app

See [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) for planned next steps.
