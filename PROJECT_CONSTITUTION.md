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

## Stop Conditions
AI agents must stop before:
- Git commit
- Adding paid external services
- Adding API keys
- Changing the core tech stack
- Deleting major existing code
- Expanding scope beyond the current mission