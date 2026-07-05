# Mission 08 — Add Task First

## Goal
Move the Add Task module to the very top of the app on both desktop and mobile, directly under the app title/auth bar.

## UX Principle
The first action after opening AI Planner should be quick task capture.

## Required Changes

### 1. Layout Order
Place Add Task above:
- Daily Overview
- Today's Plan
- Doing Now
- Active Tasks

Keep the auth bar (title + sign-in) above Add Task.

### 2. Preserve Behavior
Do not change:
- task creation logic
- cloud sync logic
- authentication

### 3. Mobile
Ensure the Add Task form remains minimal and the mobile layout stays clean.

## Constraints
Do not:
- redesign Add Task beyond layout placement
- add new features
- change sync or auth flows

## Validation
Before stopping:
- lint passes
- build passes
- Add Task appears directly under auth bar on desktop and mobile
- task capture still works
- overview, plan, doing now, and active tasks render below Add Task

## Deliverables
Report:
1. Files changed
2. UX change summary
3. How to test
