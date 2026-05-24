# Mission 02 — Active Task View Toggle

## Goal
Improve the Active Tasks section by allowing users to switch between two views:

1. Quadrant View
2. List View

## Product Requirement

Users should be able to view all active tasks either:
- grouped by Eisenhower four-quadrant method, or
- shown as one unified list sorted by time, importance, or urgency.

## Required Features

Add a simple view toggle near the Active Tasks title:

- Quadrant
- List

When List is selected, show all active tasks in one list.

Add sorting options:

- Due date / time
- Importance
- Urgency

## Sorting Rules

### Due date / time
Tasks with earlier due dates should appear first.
Tasks without due dates should appear last.

### Importance
Important tasks should appear before not important tasks.

### Urgency
Urgent tasks should appear before not urgent tasks.

## Constraints

- Do not remove the existing quadrant view.
- Keep UI minimal.
- Keep mobile experience clean.
- Do not add database/auth/API.
- Do not change core tech stack.
- Run lint/build.
- Stop before git commit.

## Deliverables

At the end, report:
1. What changed
2. Files modified
3. How to test the new toggle

---

## Implementation Status

**Status: Complete**

### Delivered features

- **View toggle** — `Quadrant` / `List` tab control in `ActiveTasksSection` (default: Quadrant).
- **Quadrant view** — unchanged `QuadrantBoard` four-column grid.
- **List view** — `TaskListView` shows all active tasks in one list.
- **Sort control** — visible only in List view; options: Due date, Importance, Urgency.

### Sorting behavior (as implemented in `lib/sortTasks.ts`)

| Sort | Rule |
|------|------|
| Due date | Earlier `dueDate` first; tasks without a due date last; title tie-breaker |
| Importance | Important quadrants first (`important-urgent`, `important-not-urgent`); title tie-breaker |
| Urgency | Urgent quadrants first (`important-urgent`, `not-important-urgent`); title tie-breaker |

### Key files

- `components/ActiveTasksSection.tsx` — toggle, sort select, conditional views
- `components/TaskListView.tsx` — unified list
- `lib/sortTasks.ts`, `lib/quadrantFlags.ts`
- `types/view.ts` — `ActiveTaskViewMode`, `TaskSortOption`
- `components/PlannerApp.tsx` — renders `ActiveTasksSection` instead of `QuadrantBoard` directly

### How to test

1. Add several active tasks across quadrants and due dates.
2. Toggle **Quadrant** ↔ **List** under Active tasks.
3. In List view, change **Sort by** and confirm order updates.
4. Confirm sort UI is hidden in Quadrant view.