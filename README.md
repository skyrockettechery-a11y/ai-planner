# AI Planner

A minimal, local-first task planner with Eisenhower quadrant classification, rule-based auto-sorting, and a daily focus assistant. Built with Next.js App Router, TypeScript, and Tailwind CSS.

## Features

- **Tasks** — Add, edit, delete, complete; optional notes and due dates
- **Quadrants** — Important/Urgent matrix with keyword-based auto-classification
- **Views** — Active tasks in quadrant grid or sortable list (due date, importance, urgency)
- **Today's Plan** — Top 3 recommended tasks, focus summary, overload/urgency warnings
- **Persistence** — `localStorage` (no backend, auth, or API keys)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Project structure

```
app/           Next.js routes and global styles
components/    UI (PlannerApp, forms, quadrant board, today's plan, …)
hooks/         useTasks (localStorage-backed task state)
lib/           classify, sort, daily plan, storage, task store
types/         Task, view mode, daily plan types
```

## Documentation

| File | Purpose |
|------|---------|
| `PROJECT_CONSTITUTION.md` | Product goals, MVP scope, tech stack |
| `AGENT_RULES.md` | Agent autonomy and coding standards |
| `MVP_SPEC.md` | Full MVP specification (updated through Mission 03) |
| `MISSION_01.md` … `MISSION_04.md` | Milestone specs and implementation status |

## Missions

- **Mission 01** — MVP foundation (complete)
- **Mission 02** — Quadrant / List toggle and sorting (complete)
- **Mission 03** — Daily Plan Assistant (complete)
- **Mission 04** — Reserved; not yet defined (see `MISSION_04.md`)
