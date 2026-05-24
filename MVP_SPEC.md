# MVP Specification v1

## Goal

Build a minimal AI-supported planning app that works smoothly on desktop and mobile.

The MVP should feel:
- Fast
- Clean
- Calm
- Extremely simple

The focus is workflow quality, not visual complexity.

---

# Core Features

## 1. Task Creation

Users can:
- Add a task
- Add optional notes
- Add optional due date

Minimal friction is critical.

The task input should feel fast and lightweight.

---

## 2. Task Editing

Users can:
- Edit task title
- Edit notes
- Edit due date
- Change classification manually

---

## 3. Task Completion

Users can:
- Mark tasks complete
- Unmark completed tasks

Completed tasks should remain visible in a separate section.

---

## 4. Four Quadrant Classification

Tasks should be classified into:

1. Important + Urgent
2. Important + Not Urgent
3. Not Important + Urgent
4. Not Important + Not Urgent

The UI should make quadrant distinctions visually clear but minimal.

---

## 5. Simple AI-like Classification

For MVP, classification is rule-based only.

Example logic:
- Tasks containing words like:
  - urgent
  - asap
  - deadline
  -> Urgent

- Tasks containing:
  - health
  - career
  - study
  - family
  - finance
  -> Important

This is placeholder logic for future real AI integration.

Implemented in `lib/classify.ts` using title and notes text (case-insensitive substring match).

---

## 6. Daily Overview

The home screen should show:
- Active tasks
- Completed tasks
- Simple completion progress

No charts required for MVP.

---

## 7. Local Persistence

Use:
- localStorage

Data must persist after browser refresh.

No backend/database yet.

Implemented with key `ai-planner-tasks` via `lib/storage.ts` and `lib/taskStore.ts` (`useSyncExternalStore` in `hooks/useTasks.ts`).

---

## 8. Active Task Views (Mission 02)

Users can switch active tasks between:

- **Quadrant view** — four Eisenhower quadrants (`QuadrantBoard`)
- **List view** — single unified list (`TaskListView`)

List view supports sorting by due date, importance, or urgency (`lib/sortTasks.ts`). Default active view is Quadrant.

---

## 9. Daily Plan Assistant (Mission 03)

Near the top of the home screen, **Today's Plan** (`TodaysPlan`) provides:

- Top 3 recommended active tasks with short reasons
- A focus summary (balance, high-impact focus, or empty-state guidance)
- Warnings when the active list is overloaded (10+ tasks) or urgent-heavy (3+ urgent and ≥50% of active tasks)

All logic is rule-based in `lib/dailyPlan.ts` (no external AI API).

---

# UI Requirements

## Design Style

Minimalist.

Avoid:
- Dashboard clutter
- Heavy gradients
- Complex animations
- Excessive colors

Prefer:
- Clean spacing
- Soft borders
- Calm layout
- Fast interactions

---

# Responsive Requirements

Must work smoothly on:
- Desktop
- Tablet
- Mobile

Mobile experience is a first-class requirement.

---

# Technical Requirements

## Framework
- Next.js App Router
- TypeScript
- Tailwind CSS

## State
Client-side task state syncs to localStorage through a small external store (`lib/taskStore.ts`) consumed via `useSyncExternalStore` in `hooks/useTasks.ts`. View mode and list sort preferences are local React state in `ActiveTasksSection` (not persisted).

Avoid overengineering.

---

# Architecture Guidelines

Suggested structure:

- app/
- components/
- hooks/
- lib/
- types/

Keep logic modular but simple.

---

# Success Criteria

MVP is successful if:

- Users can fully manage tasks
- Quadrant system works
- Data persists locally
- UI feels smooth on mobile and desktop
- Codebase stays clean and understandable
- AI agents can continue extending the project easily

### Shipped milestones

| Mission | Feature area | Status |
|---------|----------------|--------|
| 01 | MVP foundation (tasks, quadrants, persistence) | Complete |
| 02 | Quadrant / List views and list sorting | Complete |
| 03 | Today's Plan assistant | Complete |
| 04 | Reserved (see `MISSION_04.md`) | Not started |