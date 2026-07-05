# UX Principles

Permanent UX philosophy for AI Planner. These principles outlive any single feature or milestone.

When design choices conflict, resolve them in favor of these principles — not the other way around.

---

## Capture First

**Purpose:** The fastest path from thought to recorded task is the product's primary job.

**Current examples:**
- Add Task sits at the top of the home screen, directly under the auth bar (Mission 08)
- No sign-in required to capture — localStorage works immediately
- Task form stays minimal: title first; notes and due date optional

**Future implications:** Natural-language capture and keyboard-first entry must remain top-of-screen and low-friction. Never gate capture behind login, onboarding, or settings.

---

## One Tap for Common Actions

**Purpose:** Frequent actions should feel instant — no confirmations, no nested menus.

**Current examples:**
- **Start** on any active task sets Doing Now immediately
- **Complete** moves a task to Completed without dialog
- **Restore** brings completed tasks back in one action
- **Start** from Today's Plan sets Doing Now without navigation

**Future implications:** New features (snooze, delegate, schedule) should default to one-tap for the happy path. Multi-step flows reserved for rare or destructive operations.

---

## Progressive Disclosure

**Purpose:** Show the minimum needed for the current moment; reveal depth only on request.

**Current examples:**
- Task cards hide notes and due-date detail by default (Mission 04)
- Expand or "More" reveals edit controls and metadata
- Today's Plan modes and dismiss controls are compact — not a settings page

**Future implications:** AI suggestions, calendar context, and weekly review summaries should summarize first and expand on tap. Avoid dashboard-style information density on the home screen.

---

## AI Assists, User Decides

**Purpose:** The product supports judgment; it does not override it. Trust requires agency.

**Current examples:**
- Today's Plan **recommends** — it does not auto-start tasks
- Users dismiss individual recommendations or hide Today's Plan entirely
- Recommendation modes (Auto, Urgency, Importance) steer logic, not user freedom
- Classification is editable — auto-quadrant is a suggestion

**Future implications:** Real LLM features must include dismiss, override, and explainability. Never auto-complete, auto-delete, or auto-reschedule without explicit confirmation.

---

## Minimal Cognitive Load

**Purpose:** Using the app should require less thinking than the work itself.

**Current examples:**
- Calm visual design — no charts, gradients, or animation noise
- Daily Overview is counts only, not analytics
- Doing Now section answers one question: "What am I doing right now?"
- Empty states guide with short text, not tutorials

**Future implications:** Resist feature creep that adds modes, tabs, or configuration panels. Every new surface must justify its attention cost.

---

## One Doing Now Task

**Purpose:** Execution focus works best with a single committed priority.

**Current examples:**
- Only one Doing Now at a time; Start on another switches focus instantly
- Doing Now clears when the task completes or is deleted
- Doing Now appears in its own section — visually distinct from the full active list

**Future implications:** Parallel work contexts (if ever added) must not blur the primary Doing Now. Default remains single-focus.

---

## Mobile First

**Purpose:** Phone is a first-class capture and execution device — not a shrunken desktop app.

**Current examples:**
- Layout and tap targets designed for touch
- Mission 04 explicitly prioritized mobile execution flows
- Add Task form stays compact on narrow viewports
- Verified on iPhone alongside desktop and Zenbook

**Future implications:** Test every UX change on mobile viewport. Desktop-only power features (keyboard shortcuts) extend mobile — they do not replace it.

---

## Consistency Across Desktop and Mobile

**Purpose:** Same mental model everywhere — sync should feel like one app, not two products.

**Current examples:**
- Identical section order on all screen sizes
- Cloud sync delivers the same task list on phone and desktop (refresh-based today)
- Auth and task actions behave the same regardless of device

**Future implications:** Avoid desktop-only or mobile-only feature splits unless the form factor genuinely demands it (e.g. keyboard shortcuts on desktop only).

---

## Fast Daily Use

**Purpose:** The app is opened many times per day for seconds, not minutes. Performance and clarity matter.

**Current examples:**
- Local-first stores — UI updates immediately without waiting for network
- Debounced cloud push — network does not block typing or tapping
- Loading state is brief copy, not spinners everywhere
- Rule-based classification runs client-side — no API round-trip

**Future implications:** LLM calls must not block capture or complete. Async enrichment with optimistic UI if AI features add latency.

---

## Avoid Feature Creep

**Purpose:** Scope discipline preserves the product's identity as a calm assistant, not a bloated productivity suite.

**Current examples:**
- Missions explicitly forbid redesigning the whole app or adding unrelated integrations
- No notifications, calendar, or native app in MVP milestones
- Completed tasks in a separate section — not archived to a separate "project management" layer

**Future implications:** New capabilities (calendar, weekly review, AI chat) arrive as focused missions with clear UX boundaries — not as open-ended expansion.

---

## The Executive Assistant Loop

These principles support a long-term product loop:

```
Capture → Organize → Prioritize → Execute → Review → Improve
```

| Stage | Principle most involved |
|-------|-------------------------|
| Capture | Capture First, Fast Daily Use |
| Organize | Progressive Disclosure, AI Assists |
| Prioritize | AI Assists, Minimal Cognitive Load |
| Execute | One Tap, One Doing Now |
| Review | Progressive Disclosure (future weekly review) |
| Improve | AI Assists (future insights, not control) |

---

## Related Docs

- [AI_PLANNER_VISION.md](./AI_PLANNER_VISION.md) — long-term product direction
- [DECISIONS.md](./DECISIONS.md) — why specific choices were made
- [AI_CONTEXT_FOR_NEW_CHAT.md](./AI_CONTEXT_FOR_NEW_CHAT.md) — quick summary for AI assistants
