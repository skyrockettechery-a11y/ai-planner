# Mission 05 — Today's Plan Control Layer

## Goal

Make Today's Plan useful but not intrusive.

Users should be able to control recommendations quickly, while keeping the UX minimal.

---

# Product Principle

The app should assist the user, not control the user.

Recommendations should be easy to:
- follow
- dismiss
- reset
- hide

---

# Required Features

## 1. Recommendation Modes

Add a simple mode selector for Today's Plan:

- Auto
- Urgency
- Importance

### Auto
Use the current rule-based hybrid recommendation logic.

### Urgency
Prioritize:
1. urgent tasks
2. earlier due dates
3. important tasks
4. alphabetical title tie-breaker

### Importance
Prioritize:
1. important tasks
2. earlier due dates
3. urgent tasks
4. alphabetical title tie-breaker

---

## 2. Dismiss Recommendations

Users can:
- dismiss one recommended task
- dismiss all current recommendations
- reset dismissed recommendations

Dismissed tasks should not appear in Today's Plan until reset.

---

## 3. Hide / Show Today's Plan

Users can:
- hide Today's Plan
- show Today's Plan again

Keep the control lightweight.

---

## 4. Start From Today's Plan

Each recommended task should have a simple Start action.

Start should:
- set that task as Doing Now
- keep the user in the same screen
- feel instant

---

# Persistence

Persist in localStorage:

- selected recommendation mode
- dismissed recommendation task ids
- whether Today's Plan is hidden

---

# UX Requirements

Keep the interface minimal.

Avoid:
- modals
- complex settings pages
- too many buttons
- crowded mobile layout

Prefer:
- small segmented controls
- simple text buttons
- progressive disclosure

---

# Constraints

Do NOT:
- add real AI API
- add backend
- add auth
- add database
- redesign the whole app
- remove existing Today's Plan logic

Keep the current rule engine, but extend it with recommendation modes.

---

# Validation Requirements

Before stopping:
- lint passes
- build passes
- recommendation modes work
- dismiss one works
- dismiss all works
- reset works
- hide/show works
- Start from Today's Plan works
- mobile layout remains clean

---

# Deliverables

At completion provide:
1. UX changes summary
2. Files modified
3. How persistence works
4. How to test
5. Future AI integration ideas