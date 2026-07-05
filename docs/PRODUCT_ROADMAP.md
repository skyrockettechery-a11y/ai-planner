# Product Roadmap

Missions are small, complete milestones. Each mission ships working software and stops before git commit unless the human approves.

---

## Completed Missions

| Mission | Name | Summary |
|---------|------|---------|
| 01 | MVP Foundation | Tasks, quadrants, localStorage persistence |
| 02 | Views & Sorting | Quadrant grid / list toggle, sort by due date, importance, urgency |
| 03 | Daily Plan Assistant | Top 3 recommendations, focus summary, overload warnings |
| 04 | Minimal Execution Flow | Doing Now, one-tap start/complete, restore, progressive disclosure |
| 05 | Today's Plan Control | Recommendation modes (Auto/Urgency/Importance), dismiss, hide/show |
| 06 | Deploy to Vercel | Public URL, mobile + desktop browser access |
| 07 | Cloud Sync Foundation | Supabase Auth + Postgres, tasks & preferences sync, local import |
| 08 | Add Task First | Quick capture at top of app, under auth bar |
| 09 | Documentation Archive | `docs/` archive, README links |
| 10 | Documentation Knowledge Base | DECISIONS, UX_PRINCIPLES, AI onboarding guide |

---

## Future Missions (Planned, Not Started)

Priority order is indicative — the human sets direction before each mission.

| Theme | Description |
|-------|-------------|
| **Keyboard-first capture** | Fast task entry from desktop without mouse |
| **Today Workspace simplification** | Streamline the home screen for daily focus |
| **Natural language task capture** | Parse free-text into structured tasks |
| **Google OAuth** | Finish Google provider setup; enable one-tap Google sign-in |
| **Realtime sync** | Supabase realtime subscriptions instead of refresh-only |
| **Real AI planning assistant** | LLM-backed classification, recommendations, and planning |
| **Calendar integration** | Google Calendar (or similar) for time-aware planning |
| **Weekly review** | Reflect on completion patterns and plan the week ahead |

---

## Mission Dependency Notes

```
01 MVP ──► 02 Views ──► 03 Daily Plan ──► 04 Execution ──► 05 Plan Control
                                                              │
06 Deploy ◄───────────────────────────────────────────────────┘
  │
  └──► 07 Cloud Sync ──► 08 Quick Capture ──► 09–10 Docs
                                                  │
                                                  └──► Future: OAuth, Realtime, AI, Calendar…
```

- **Cloud sync (07)** depends on deployment (06) for cross-device testing
- **Google OAuth** builds on auth infrastructure from Mission 07
- **Realtime sync** extends the sync layer in `useCloudSync`
- **Real AI** replaces or augments `lib/classify.ts` and `lib/dailyPlan.ts`

---

## Out of Scope (Unless Explicitly Mission-Scoped)

- Native iOS/Android apps
- Notifications / push
- Admin dashboard or multi-user collaboration
- Paid third-party APIs without approval

---

## How to Propose a New Mission

1. Write `MISSION_XX.md` with goal, required changes, constraints, and validation
2. Align with [AI_PLANNER_VISION.md](./AI_PLANNER_VISION.md) and [PROJECT_CONSTITUTION.md](../PROJECT_CONSTITUTION.md)
3. Keep scope small enough for one autonomous agent run
4. Stop before git commit; human reviews and commits

---

## Related Docs

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — current shipped state
- [MISSION_*.md](../) — individual mission specs in repo root
