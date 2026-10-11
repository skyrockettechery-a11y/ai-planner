# Development Guidelines

How to work on AI Planner — for humans and AI agents.

---

## Principles

1. **Simple working software** over complex architecture
2. **Small complete milestones** — one mission at a time
3. **Minimal diffs** — change only what the mission requires
4. **Local-first UX** — app must stay fast without sign-in
5. **Feature branch → Draft PR** — agents push to the approved feature branch; only Sam merges

---

## Tech Conventions

| Area | Standard |
|------|----------|
| Framework | Next.js App Router (see `node_modules/next/dist/docs/` — APIs may differ from older Next.js) |
| Language | TypeScript, strict typing, avoid `any` |
| Styling | Tailwind CSS, minimal/calm UI |
| Components | Functional React, small composable pieces |
| State | External stores + hooks; avoid over-engineering global state |

---

## Project Structure

```
app/           Routes and layout
components/    UI only; minimal logic
hooks/         React hooks bridging stores and Supabase
lib/           Pure logic, stores, Supabase clients
types/         Shared TypeScript types
docs/          Documentation archive
```

Avoid deep nesting. Prefer extending existing modules over new abstractions.

---

## Mission Workflow

```
Claude Cloud → Feature Branch → Draft PR → GPT Review → Sam manually merges
```

1. Read the mission file (`MISSION_XX.md`) and [PROJECT_CONSTITUTION.md](../PROJECT_CONSTITUTION.md)
2. Work on the **approved feature branch** for the mission (never on `main`)
3. Implement only what the mission specifies
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`
5. Update mission file and docs as the mission requires
6. Commit and push to the feature branch; open or update the mission's **Draft PR** into `main`
7. CI (GitHub Actions) runs lint, typecheck, tests and build on every PR update
8. **GPT reviews** the Draft PR; address findings with new commits on the same branch
9. **Sam manually merges** — agents stop once the Draft PR is updated for review

### Agent autonomy ([AGENT_RULES.md](../AGENT_RULES.md))

Agents **may:** create/modify files, refactor, fix errors, run lint/typecheck/build, improve types and UX consistency, commit and push to the approved feature branch, and open/update its Draft PR.

Agents **must stop before:** merging any PR, pushing to `main`, pushing to unapproved branches, marking a Draft PR ready, paid services, adding API keys or real credentials, configuring Vercel secrets, scope beyond current mission, major rewrites, deleting major features.

---

## Coding Standards

### TypeScript
- Explicit interfaces for props and domain types (`types/`)
- Prefer `interface` / `type` over inline object types in public APIs

### React
- `"use client"` only where needed (hooks, browser APIs, interactivity)
- Keep `PlannerApp` as orchestrator; sections stay focused (`TaskForm`, `TodaysPlan`, etc.)

### Styling
- Mobile-first responsive classes (`sm:`, etc.)
- Comfortable tap targets on mobile
- No heavy animations or dashboard clutter

### Comments
- Code should be self-explanatory
- Comment non-obvious business rules (e.g. sync debounce, auth URL cleanup)

---

## Testing Expectations

For each mission:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` runs `tests/**/*.test.ts` with Node's built-in test runner (via `tsx`, which understands the `@/` path alias). Keep tests small and dependency-free; stub `fetch` instead of calling real services. The same checks run automatically in GitHub Actions (`.github/workflows/ci.yml`) on every PR update; they need no secrets. Anything that could not be run or tested must be stated in the PR description.

Manual testing on desktop and mobile viewport as relevant. Heavy test frameworks are not required for MVP.

---

## Documentation

Documentation is **part of the product**. A mission is not complete until relevant docs are updated.

### Maintenance rule

Whenever a mission changes **architecture**, **UX philosophy**, **deployment**, **roadmap**, or **product direction**, update the corresponding doc **before** marking the mission complete. Documentation must not lag significantly behind implementation.

### Doc ownership (avoid duplication)

| Document | Owns | Do not duplicate here |
|----------|------|------------------------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Current status, shipped capabilities | Vision, roadmap detail |
| [AI_PLANNER_VISION.md](./AI_PLANNER_VISION.md) | North Star, long-term direction | Implementation, status tables |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | Missions, future work | Architecture detail |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical structure | Decision reasoning |
| [DECISIONS.md](./DECISIONS.md) | Why choices were made | Step-by-step setup |
| [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) | Permanent UX philosophy | One-off mission notes |
| [AI_CONTEXT_FOR_NEW_CHAT.md](./AI_CONTEXT_FOR_NEW_CHAT.md) | Fast AI onboarding | Full prose from other docs |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Vercel, Supabase, env vars | Architecture overview |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Bugs, workarounds | General guidelines |

Prefer **principles over implementation details** in stable docs. Put volatile details in PROJECT_STATUS or mission files.

### Update triggers

| When | Update |
|------|--------|
| New mission | Create/update `MISSION_XX.md` |
| Architecture change | `ARCHITECTURE.md`; add entry to `DECISIONS.md` if rationale is new |
| UX philosophy change | `UX_PRINCIPLES.md`; align `AI_PLANNER_VISION.md` |
| Deployment change | `DEPLOYMENT_GUIDE.md` |
| New known issue | `KNOWN_ISSUES.md` |
| Shipped milestone | `PROJECT_STATUS.md`, `PRODUCT_ROADMAP.md` |
| New AI onboarding need | `AI_CONTEXT_FOR_NEW_CHAT.md` (keep concise) |

### Source of truth

**GitHub** is the canonical project source. Docs assume code and documentation live in the repo — not on any single development machine (Desktop, Zenbook, etc.).

---

## Common Tasks

### Add a UI section
1. Create component in `components/`
2. Wire into `PlannerApp.tsx` in the correct layout order
3. Use existing hooks for data — don't duplicate store logic

### Change sync behavior
1. Start in `hooks/useCloudSync.ts` and `lib/supabase/tasks.ts` / `preferences.ts`
2. Respect RLS — all rows need `user_id`
3. Test signed-in on two browsers

### Change auth
1. `hooks/useAuth.ts`, `components/AuthBar.tsx`, `app/auth/callback/route.ts`
2. Update Supabase redirect URLs if callback paths change
3. Test magic link on mobile email app flow

---

## What Not to Do

- Hardcode Supabase URL or keys
- Commit `.env.local` or secrets (real values live in Bitwarden; docs use placeholders only)
- Merge PRs or push to `main` (Sam merges manually)
- Import `lib/googleCalendar/*`, `lib/supabase/admin.ts` or `lib/supabase/server.ts` from client code (they use `server-only`; the build fails)
- Add real OpenAI/LLM API without mission approval
- Redesign the whole app in a layout mission
- Auto-delete localStorage on login

---

## Related Docs

- [AGENT_RULES.md](../AGENT_RULES.md) — full agent autonomy rules
- [AGENTS.md](../AGENTS.md) — Next.js version notes for agents
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — what's next
