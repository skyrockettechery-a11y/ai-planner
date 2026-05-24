# Mission 01 — Build MVP Foundation

## Mission Goal

Build the first fully working MVP of the AI Planner application.

The result should be:
- Functional
- Clean
- Responsive
- Minimal
- Extendable

The app must work smoothly on both desktop and mobile.

---

# Scope

Implement the following:

## Core Features
- Add task
- Edit task
- Delete task
- Mark complete
- Four quadrant classification
- Rule-based automatic classification
- Daily overview
- Completed task section
- localStorage persistence

---

# UI Requirements

Create a calm minimal UI.

Design principles:
- Minimal
- Fast
- Clean spacing
- Mobile-first
- Soft borders
- Avoid visual clutter

No heavy animations.

---

# Technical Requirements

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS

Suggested structure:
- app/
- components/
- hooks/
- lib/
- types/

---

# Classification Logic

Implement simple rule-based classification.

Urgent keywords:
- urgent
- asap
- deadline
- immediately

Important keywords:
- health
- study
- career
- family
- finance

Agents may improve the logic reasonably.

---

# Autonomy Rules

The AI agent may:
- Create files
- Refactor
- Improve structure
- Fix errors
- Run lint
- Run build
- Improve responsiveness
- Create reusable components

The AI agent should make reasonable implementation decisions autonomously.

---

# Stop Conditions

STOP before:
- git commit
- adding external paid services
- adding authentication
- adding backend/database
- adding API keys
- changing core tech stack

---

# Required Validation

Before stopping:
- Ensure app builds successfully
- Ensure no TypeScript errors
- Ensure responsive behavior works
- Ensure localStorage persistence works
- Ensure lint passes

---

# Deliverables

At completion provide:
1. Summary of implemented features
2. File structure overview
3. Important architecture decisions
4. Remaining future improvements

---

## Implementation Status

**Status: Complete**

### Delivered features

| Feature | Implementation |
|---------|----------------|
| Add / edit / delete tasks | `TaskForm`, `TaskEditForm`, `TaskItem`, `useTasks` |
| Mark complete / uncomplete | `toggleComplete` in `hooks/useTasks.ts` |
| Four-quadrant UI | `QuadrantBoard` grouped by Eisenhower quadrants |
| Rule-based classification | `lib/classify.ts` (title + notes keyword scan) |
| Daily overview | `DailyOverview` — active count, completion progress bar |
| Completed section | `CompletedSection` — collapsible list |
| localStorage persistence | `lib/storage.ts`, `lib/taskStore.ts`, key `ai-planner-tasks` |
| Responsive layout | Mobile-first Tailwind in `PlannerApp` and components |

### Key files

- `components/PlannerApp.tsx` — main shell
- `components/TaskForm.tsx`, `TaskItem.tsx`, `TaskEditForm.tsx`
- `components/QuadrantBoard.tsx`, `DailyOverview.tsx`, `CompletedSection.tsx`
- `hooks/useTasks.ts` — task mutations via `useSyncExternalStore`
- `lib/tasks.ts`, `lib/classify.ts`, `lib/quadrants.ts`, `lib/storage.ts`, `lib/taskStore.ts`
- `types/task.ts`

### Notes

- Classification re-runs when title or notes change unless quadrant is set manually.
- `useSyncExternalStore` avoids hydration issues and unstable server snapshots (`EMPTY_TASKS` in `taskStore.ts`).