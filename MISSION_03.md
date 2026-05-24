# Mission 03 — Daily Plan Assistant

## Goal
Add a simple rule-based Daily Plan Assistant that helps users decide what to focus on today.

## Required Features

Add a new section near the top of the app:

# Today's Plan

It should show:
- Top 3 recommended active tasks
- A short reason for each recommendation
- A simple focus summary
- A warning if the task list is overloaded or too urgent-heavy

## Recommendation Logic

Prioritize tasks using:
1. Important + urgent tasks
2. Tasks with earlier due dates
3. Important + not urgent tasks
4. Urgent + not important tasks
5. Alphabetical title as tie-breaker

## Summary Logic

Show simple messages such as:
- "Focus on high-impact tasks first."
- "You have many urgent tasks today. Consider reducing low-value urgent work."
- "Good balance: your tasks are not overloaded."

## Constraints

- Rule-based only
- No OpenAI API yet
- No backend
- No database
- No authentication
- Keep UI minimal
- Keep mobile layout clean
- Do not remove existing views
- Run lint/build
- Stop before git commit

## Deliverables

At completion report:
1. What changed
2. Files modified
3. How to test
4. Any future improvement ideas

---

## Implementation Status

**Status: Complete**

### Delivered features

- **Today's Plan** section below Daily Overview (`TodaysPlan` in `PlannerApp`).
- **Top 3 recommendations** from active tasks with per-task reason text.
- **Focus summary** — context-aware message from `lib/dailyPlan.ts`.
- **Warnings** — amber alert when overloaded or urgent-heavy (see thresholds below).

### Recommendation algorithm (as implemented)

Tasks are ranked by:

1. Quadrant priority: Important+Urgent → Important+Not Urgent → Not Important+Urgent → Not Important+Not Urgent
2. Earlier `dueDate` (tasks without a due date sort after dated tasks in the same quadrant tier)
3. Alphabetical title

Top 3 after sorting are shown. Reasons reference quadrant short label and due date when present.

### Summary and warning messages

| Condition | Message |
|-----------|---------|
| No active tasks | "Add tasks to build a focused plan for today." |
| Fewer than 10 active and under 50% urgent | "Good balance: your tasks are not overloaded." |
| Otherwise (default) | "Focus on high-impact tasks first." |
| 10 or more active tasks | Overload warning |
| 3+ urgent tasks and 50%+ of active tasks urgent | Urgent-heavy warning (exact text from spec) |

### Key files

- `components/TodaysPlan.tsx`
- `lib/dailyPlan.ts`
- `types/dailyPlan.ts`

### How to test

1. Add mixed-quadrant tasks; confirm top 3 order and reasons.
2. Use 10+ active tasks to trigger overload warning.
3. Use 3+ urgent tasks (majority urgent) to trigger urgent-heavy warning.
4. Complete tasks and confirm recommendations update.