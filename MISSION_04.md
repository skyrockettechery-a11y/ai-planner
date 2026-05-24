# Mission 04 — Minimal Execution Flow

## Goal

Transform the app from a planning board into a lightweight execution assistant.

The UX should feel:
- extremely fast
- low-friction
- calm
- mobile-first

Users should be able to:
- decide what to do
- start doing it
- finish it
with almost no cognitive load.

---

# Core UX Principle

Common actions must require only one tap.

Advanced configuration should stay hidden unless explicitly requested.

---

# Required Features

## 1. Doing Now Section

Add a dedicated "Doing Now" section near the top of the app.

Users can:
- mark one active task as "Doing Now"
- switch the current Doing Now task
- clear the Doing Now state

The current Doing Now task should:
- remain in active tasks
- appear visually highlighted
- stay pinned near the top

---

## 2. One-Tap Start Flow

Each active task should have:
- Start button

Pressing Start:
- sets the task as Doing Now
- updates the UI immediately

Avoid confirmation dialogs.

---

## 3. One-Tap Complete Flow

Each active task should support:
- immediate completion

Completion should:
- feel instant
- move task cleanly into Completed section

---

## 4. Restore Completed Task

Completed tasks should support:
- Restore action

Restore should:
- move task back to active tasks
- preserve task data

---

## 5. Hide Advanced Task Details

The default task card UI should remain minimal.

Hide by default:
- exact due time
- detailed notes
- advanced edit controls

Expose advanced details only through:
- "More"
- "Details"
- expandable section
or similar lightweight interaction.

---

# Mobile UX Requirements

This mission heavily prioritizes mobile UX.

Requirements:
- tap targets should feel comfortable
- avoid crowded controls
- avoid large forms
- reduce visual clutter
- primary actions should stay obvious

---

# Constraints

Do NOT:
- add backend
- add database
- add auth
- add real AI API
- add complex animations
- redesign the whole app

Keep architecture simple.

---

# Technical Guidance

You may:
- add lightweight task state
- create reusable task action components
- refactor task card structure
- improve layout consistency

Avoid overengineering.

---

# Validation Requirements

Before stopping:
- lint passes
- build passes
- mobile layout works
- Doing Now flow works
- restore flow works

---

# Deliverables

At completion provide:
1. UX changes summary
2. Files modified
3. Mobile UX improvements
4. Future simplification opportunities