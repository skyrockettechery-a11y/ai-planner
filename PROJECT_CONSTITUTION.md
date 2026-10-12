# Project Constitution v1

## Project Name
AI Planner

## Main Purpose
Build a small AI-supported planning app while using the project as a training ground for highly automated programming.

## Product Goal
Help users quickly capture tasks, automatically organize them, and review execution quality with AI assistance.

## Automation Goal
Maximize AI agent autonomy. The human controls direction, reviews results, and makes final product decisions. AI agents handle implementation, refactoring, testing, and documentation within approved boundaries.

## MVP Scope (historical)
The first version should be local-first and simple.

> The MVP scope below describes the original Mission 01 baseline. Later
> owner-approved missions extended it — see **Current Architecture** below.

Included:
- Add tasks
- Edit tasks
- Delete tasks
- Mark tasks complete
- Four-quadrant task classification
- Simple rule-based AI-like classification
- Daily task overview
- Responsive layout for phone and desktop
- Local storage persistence

Excluded for MVP:
- Login
- Database
- Real OpenAI API
- Google Calendar integration
- Notifications
- Native mobile app

## Tech Stack
- Next.js
- TypeScript
- Tailwind CSS
- App Router
- localStorage first (anonymous use), Supabase when signed in

## Current Architecture (amended October 2026)
The MVP exclusions above have been lifted by explicit owner approval, one bounded mission at a time:
- **Login** — Supabase Auth (email magic link; Supabase Google sign-in button) since Mission 07
- **Database** — Supabase PostgreSQL (`tasks`, `user_preferences`) with Row Level Security since Mission 07
- **Google Calendar integration** — Phase 1 (read-only free/busy availability) approved in Mission 11

The app still works without sign-in via localStorage. AI Planner remains the source of truth for tasks; Google Calendar is an external availability source only. Still excluded unless a mission scopes them: real OpenAI/LLM API, notifications, native mobile app, writing to Google Calendar.

## UI Principle
Minimal, calm, fast, and practical. Avoid visual complexity.

## Development Principle
Prefer simple working software over complex architecture. Build in small complete milestones, but allow AI agents to complete each milestone autonomously.

## Approved Workflow (amended October 2026)

```
Claude Cloud → Feature Branch → Draft PR → GPT Review → Sam manually merges
```

1. **Claude Cloud** implements the approved mission.
2. **Feature branch** — work happens only on the feature branch approved for that mission (e.g. `feature/google-calendar-phase1`). Claude is authorized to commit and push to that branch.
3. **Draft PR** — Claude opens (or updates) a Draft pull request into `main`. GitHub Actions CI runs lint, typecheck and build on every update.
4. **GPT Review** — GPT reviews the Draft PR; Claude addresses findings by pushing further commits to the same branch.
5. **Sam manually merges** — only Sam (the project owner) marks the PR ready and merges it into `main`.

Claude must **never** merge a pull request, push directly to `main`, or rewrite `main`'s history.

## Stop Conditions
AI agents must stop before:
- Merging any pull request, or pushing/committing directly to `main`
- Committing or pushing to any branch other than the approved feature branch
- Marking a Draft PR ready for review, or opening an additional PR, unless asked
- Adding paid external services
- Adding API keys or real credentials to code, docs, PRs or GitHub
- Configuring deployment secrets (e.g. Vercel environment variables)
- Changing the core tech stack
- Deleting major existing code
- Expanding scope beyond the current mission