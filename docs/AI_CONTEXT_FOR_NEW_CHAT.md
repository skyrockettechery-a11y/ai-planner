# AI Context for New Chat

> **Audience:** ChatGPT, Cursor, Claude, Gemini, other coding assistants.  
> **Read time:** ~3 min. **Depth:** pointers only — details live in linked docs.

---

## Identity

| Key | Value |
|-----|-------|
| Product | AI Planner — AI Executive Assistant (not a todo app) |
| URL | https://ai-planner-taupe.vercel.app |
| Source of truth | **GitHub repo** (not local machines) |
| Pipeline | GitHub → Vercel · Supabase (Auth + Postgres) |
| Milestone | Mission 10 complete — first production milestone shipped |
| Stack | Next.js 16 · React 19 · TS · Tailwind 4 · Supabase |

---

## North Star (product)

Reduce cognitive load. Help users: **Capture → Organize → Prioritize → Execute → Review → Improve**

Every feature must move toward AI Executive Assistant — not generic task management.

→ Full vision: [AI_PLANNER_VISION.md](./AI_PLANNER_VISION.md)

---

## Shipped (production)

- Quick task capture (Add Task at top)
- Active Tasks · Completed Tasks · Doing Now (one task) · Today's Plan
- Email magic link auth ✅ · Google OAuth ⚠️ (UI only, not configured)
- Cloud sync ✅ refresh-based · multi-device verified (Zenbook, desktop, iPhone)

→ Status detail: [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## Architecture (minimal)

```
PlannerApp.tsx
  ├─ useTasks / taskStore (localStorage)
  ├─ useAuth → Supabase Auth
  └─ useCloudSync → debounced push, load on login
Tables: tasks, user_preferences (RLS)
"AI" today: lib/classify.ts, lib/dailyPlan.ts (rules, no LLM)
```

UI order: Auth → **Add Task** → Overview → Doing Now → Today's Plan → Active → Completed

→ Full detail: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Missions (01–10 complete)

01 MVP · 02 Views/sort · 03 Daily Plan · 04 Doing Now · 05 Plan controls · 06 Vercel · 07 Cloud sync · 08 Capture first · 09 Docs archive · 10 Knowledge system

→ Next work: [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — keyboard capture, NL input, Google OAuth, realtime sync, real AI, calendar, weekly review

---

## UX Rules (non-negotiable)

| Rule | Constraint |
|------|------------|
| Capture first | Add Task top; no login gate |
| One tap | Start · Complete · Restore — no dialogs |
| Progressive disclosure | Minimal cards; details on expand |
| AI assists | Recommend only; user dismisses/overrides |
| One Doing Now | Single focus task |
| Mobile first | Same model on all devices |
| No feature creep | Calm UI; mission-scoped additions |

→ Full principles: [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) · Why: [DECISIONS.md](./DECISIONS.md)

---

## Coding Rules

- Mission scope only — read active `MISSION_XX.md`
- Minimal diffs · match existing patterns · no secrets in repo
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Next.js 16 APIs may differ — check `node_modules/next/dist/docs/`
- **Before stop:** `npm run lint` + `npm run build`
- **Stop before git commit** unless user asks
- **Do not** change auth/sync/UI unless mission requires it

→ Standards: [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) · [AGENT_RULES.md](../AGENT_RULES.md)

---

## Doc Map (read order)

1. [PROJECT_STATUS.md](./PROJECT_STATUS.md) — what works now
2. [AI_PLANNER_VISION.md](./AI_PLANNER_VISION.md) — why it exists
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — how it's built
4. [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — what's next
5. [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) — how to work

| Need | Doc |
|------|-----|
| Deploy / env vars | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| Bugs / workarounds | [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) |
| Decision history | [DECISIONS.md](./DECISIONS.md) |

---

## Commands

```bash
npm install && npm run dev    # localhost:3000
npm run lint && npm run build # required before mission complete
```

---

## One-Line Brief

Live Next.js app on Vercel + Supabase sync; capture-first UX; rule-based planning; evolving to AI Executive Assistant — work in mission scope, update docs with changes, lint/build, stop before commit.
