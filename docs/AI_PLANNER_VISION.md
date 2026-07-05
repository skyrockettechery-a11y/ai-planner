# AI Planner Vision

---

## North Star

**AI Planner is not a task manager. AI Planner is an AI Executive Assistant.**

Its purpose is to **reduce cognitive load** by helping users:

| Phase | Role |
|-------|------|
| **Capture** | Record thoughts and commitments with minimal friction |
| **Plan** | Organize and prioritize what matters today and this week |
| **Decide** | Choose focus with assistive guidance, not automated control |
| **Execute** | Follow through on one clear priority at a time |
| **Reflect** | Review what happened and what was learned |
| **Improve** | Adjust habits and plans based on patterns over time |

**Every future feature should move the product closer to this vision.**

If a proposed change makes AI Planner feel more like a generic todo app — or increases cognitive load without clear assistant value — it does not belong.

For permanent UX constraints that enforce this vision, see [UX_PRINCIPLES.md](./UX_PRINCIPLES.md). For current shipped state, see [PROJECT_STATUS.md](./PROJECT_STATUS.md).

---

## What AI Planner Is

AI Planner is **not just a todo app**. It is intended to become an **AI-assisted planning and execution assistant** — a calm, fast tool that helps people capture work, decide what matters, and follow through.

The name reflects the destination: intelligent help with planning and doing, not merely listing tasks.

---

## Core Beliefs

### 1. Quick capture first
The fastest path from thought to recorded task wins. Opening the app should lead immediately to capture — minimal steps, minimal friction.

### 2. Assist, don't control
Recommendations (Today's Plan, Doing Now) should guide without overwhelming. Users dismiss, hide, or override easily. The app supports decisions; it does not make them.

### 3. One tap for common actions
Start a task, complete a task, mark Doing Now — these should feel instant. Advanced details stay hidden until requested.

### 4. Calm and minimal
No dashboard clutter, heavy animations, or visual noise. The UI should feel fast, clean, and practical on phone and desktop.

### 5. Simple today, intelligent tomorrow
MVP and early milestones use **rule-based** classification and planning. This is deliberate placeholder logic that will be replaced or augmented by real AI as the product matures.

---

## Product Journey

```
Capture → Organize → Plan → Execute → Review
   ↑                                      |
   └──────── continuous improvement ──────┘
```

| Stage | Today | Future |
|-------|-------|--------|
| Capture | Manual task form at top | Natural language, keyboard-first |
| Organize | Eisenhower quadrants, keyword rules | AI classification, context awareness |
| Plan | Rule-based Today's Plan (top 3) | AI planning assistant, calendar-aware |
| Execute | Doing Now, one-tap start/complete | Smarter focus, nudges, integrations |
| Review | Daily overview, completion count | Weekly review, execution quality insights |

---

## Target User Experience

A user opens AI Planner on their phone during a walk and captures a task in seconds. Later at their desk, the same tasks are there — synced, classified, with Today's Plan suggesting where to focus. They tap Start on one item, complete it, and move on without managing the tool.

The product should disappear into the workflow: **capture quickly, plan lightly, execute clearly**.

---

## Long-Term Direction

- **AI-assisted planning** — real LLM-backed recommendations, not just keyword rules
- **Natural language capture** — "Call dentist Thursday" becomes a structured task
- **Calendar integration** — plan around real availability
- **Weekly review** — reflect on what got done and what slipped
- **Keyboard-first power use** — for desktop users who live in the app
- **Realtime sync** — seamless multi-device without manual refresh

---

## What We Avoid

- Feature bloat and settings-heavy UX
- Replacing human judgment with automated control
- Complex architecture before the workflow is proven
- Paid external services or API keys without explicit approval

---

## Related Docs

- [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) — how the North Star is enforced in design
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — milestone timeline toward the vision
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — what ships today
- [DECISIONS.md](./DECISIONS.md) — why early choices support this direction
