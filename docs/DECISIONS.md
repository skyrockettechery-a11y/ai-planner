# Decisions

Important architectural and product decisions for AI Planner. This document records **why** choices were made, not merely what was built.

Decisions are stable by design — they should remain useful even as implementation details change.

---

## How to Read This Document

Each entry follows the same structure:

| Section | Purpose |
|---------|---------|
| **Decision** | What was chosen |
| **Context** | Situation that required a choice |
| **Reasoning** | Why this option won |
| **Trade-offs** | What we gave up |
| **Possible future evolution** | When or how this might change |

---

## Infrastructure

### GitHub as source of truth

**Decision:** Treat the GitHub repository as the canonical project source; deploy via GitHub → Vercel.

**Context:** Development happens on multiple machines (Desktop primary, Zenbook secondary). Production runs on Vercel with Supabase backend.

**Reasoning:**
- Single authoritative history for code, missions, and docs
- Vercel integrates with GitHub for automatic deploys on push
- Any machine can clone, branch, and contribute — no "master copy" on one laptop
- Documentation and mission specs live alongside code in the repo

**Trade-offs:**
- Requires git discipline (pull before work, push to share)
- Local uncommitted work is invisible to other machines and AI sessions

**Future evolution:** Branch protection, CI checks, or preview deployments — still GitHub-centered.

---

### Supabase for auth and database

**Decision:** Use Supabase Auth and Supabase PostgreSQL for cloud sync.

**Context:** Mission 07 required cross-device sync with user isolation. The app already ran on Next.js with no backend.

**Reasoning:**
- Managed Postgres with Row Level Security fits a small team — no custom API server to maintain
- Supabase Auth integrates with the Next.js SSR cookie pattern (`@supabase/ssr`)
- Free tier sufficient for current scale and personal/small-audience use
- SQL migrations and RLS policies are explicit and auditable

**Trade-offs:**
- Vendor coupling to Supabase
- Realtime, edge functions, and advanced features add complexity if adopted later
- Auth provider configuration (redirect URLs, OAuth) lives outside the codebase

**Possible future evolution:** Stay on Supabase and add realtime subscriptions; or migrate to self-hosted Postgres if scale or compliance demands it. Unlikely to replace with a custom auth server unless requirements change dramatically.

---

### Vercel for hosting

**Decision:** Deploy the Next.js app on Vercel.

**Context:** Mission 06 required a public URL accessible from phone and desktop browsers.

**Reasoning:**
- Native Next.js deployment with minimal configuration
- Automatic builds on git push
- HTTPS, CDN, and preview deployments included
- No server management for a frontend-heavy app

**Trade-offs:**
- Platform-specific conventions (e.g. middleware/proxy evolution in Next.js 16)
- Environment variables must be configured per deployment
- Not ideal if the product later needs long-running background workers on the same host

**Possible future evolution:** Vercel remains appropriate for the web app; heavy AI or batch jobs might move to separate services while the UI stays on Vercel.

---

## Authentication

### Email Magic Link for MVP auth

**Decision:** Ship email magic link as the primary working auth method.

**Context:** Mission 07 preferred Google login but accepted email magic link as fallback. Google provider setup proved more involved (Google Cloud Console + Supabase provider config).

**Reasoning:**
- No password storage or reset flows to build
- Works with any email address — no dependency on a specific OAuth provider
- Supabase handles OTP generation and verification
- Verified working in production across devices

**Trade-offs:**
- Rate limits on repeated OTP requests (see [KNOWN_ISSUES.md](./KNOWN_ISSUES.md))
- Mobile email clients may open links in embedded browsers — fragile UX
- Slower than one-tap OAuth when OAuth works well

**Possible future evolution:** Google OAuth as primary for users who prefer it; magic link remains as fallback. Passkeys or other providers only if explicitly mission-scoped.

---

### Google OAuth postponed

**Decision:** Expose a Google sign-in button in the UI but defer full provider configuration.

**Context:** Google OAuth requires coordinated setup in Google Cloud Console and Supabase. Magic link unblocked cloud sync testing and multi-device verification.

**Reasoning:**
- Cloud sync and task data model were higher priority than OAuth polish
- Partially configured OAuth creates more support burden than no button — hence button exists but magic link is documented as primary
- One auth method working end-to-end beats two half-working methods

**Trade-offs:**
- Users may tap Google and fail — documented in KNOWN_ISSUES
- Extra UI surface without full benefit yet

**Possible future evolution:** Dedicated mission to finish Google provider setup, update DEPLOYMENT_GUIDE, and test mobile OAuth flow.

---

## Sync and Data

### Refresh-based cloud sync (not realtime)

**Decision:** Sync on login and debounced push on local changes — no Supabase realtime subscriptions.

**Context:** Mission 07 needed reliable cross-device sync. Realtime adds subscription lifecycle, conflict handling, and connection edge cases.

**Reasoning:**
- Simpler mental model: local store remains source of truth while editing; cloud catches up on debounce
- Fewer moving parts for MVP — verified sync across Zenbook, desktop, and iPhone
- Matches "refresh to see other device" expectation for early users
- Avoids premature conflict-resolution architecture

**Trade-offs:**
- Changes on device A do not appear on device B until refresh or refocus
- Not suitable for collaborative editing (not a current goal)

**Possible future evolution:** Add Supabase realtime channels in a dedicated mission; may require merge strategy for concurrent edits.

---

### Local-first with optional cloud

**Decision:** App works fully without sign-in via localStorage; cloud sync activates only when authenticated.

**Context:** Original MVP (Mission 01) was local-only. Cloud sync (Mission 07) added backend without breaking anonymous use.

**Reasoning:**
- Zero friction to try the app — no account wall
- Aligns with "capture first" UX — user can add a task immediately
- Import banner offers migration path for existing local data after login

**Trade-offs:**
- Two persistence paths to maintain (local store + cloud sync hook)
- Risk of user confusion about which data is "canonical" before login

**Possible future evolution:** Optional prompt to sign in for sync; unlikely to require auth for basic capture unless product direction changes.

---

## Product and UX

### Add Task at the top of the home screen

**Decision:** Place Add Task directly under the auth bar, above Daily Overview, Today's Plan, and Active Tasks (Mission 08).

**Context:** Execution and planning features grew above capture. Opening the app showed overview and recommendations before the user could record a thought.

**Reasoning:**
- "Capture first" is core product philosophy — the first meaningful action should be task entry
- Matches executive-assistant mental model: record now, organize and plan second
- Same order on desktop and mobile — no platform-specific hierarchy

**Trade-offs:**
- Today's Plan and Doing Now are visually lower — intentional deprioritization of consumption over capture
- Returning users who only execute may scroll slightly more (acceptable vs. capture friction)

**Possible future evolution:** Keyboard-first capture or natural-language input may replace or augment the form while keeping top-of-screen placement.

---

### One Doing Now task at a time

**Decision:** Only one task may be marked "Doing Now" simultaneously.

**Context:** Mission 04 introduced execution focus. Multi-task "doing now" lists resemble generic active task views.

**Reasoning:**
- Single focus reduces decision paralysis — aligns with execution assistant, not task hoarding
- Clear state: user knows exactly what they committed to
- One-tap Start instantly switches focus without confirmation dialogs
- Doing Now clears automatically when task completes or is deleted

**Trade-offs:**
- Cannot represent true parallel work (e.g. waiting on two blocking items)
- Users who prefer multi-focus workflows must use Active Tasks instead

**Possible future evolution:** Optional "also waiting on" or context tags — only if user research shows single-focus is too restrictive. Default should remain one.

---

### Today's Plan is assistive, not controlling

**Decision:** Today's Plan recommends up to three tasks; users can dismiss, hide, change mode, or ignore entirely.

**Context:** Mission 03 added recommendations; Mission 05 added user control after risk of the plan feeling prescriptive.

**Reasoning:**
- AI (and rule-based stand-ins) should **assist** decisions, not replace them
- Dismiss and hide preserve agency — critical for long-term trust when real AI arrives
- Multiple modes (Auto, Urgency, Importance) let users steer without settings pages
- "Start" from a recommendation sets Doing Now — suggestion becomes action in one tap, not a mandate

**Trade-offs:**
- Recommendations may be ignored — success metric is helpfulness, not compliance
- Rule-based logic is imperfect; dismiss exists partly to compensate

**Possible future evolution:** LLM-backed plan with same control surface (dismiss, hide, modes). Never auto-start or auto-complete without explicit user action.

---

### Progressive disclosure for task details

**Decision:** Default task cards show minimal information; notes, due dates, and advanced edit controls are hidden until expanded.

**Context:** Mission 04 prioritized mobile execution — crowded cards slow scanning and tapping.

**Reasoning:**
- Most daily interactions are start, complete, and skim — not edit notes
- Reduces cognitive load on small screens
- Power users still reach full edit via expand/details interaction

**Trade-offs:**
- Due dates and notes less visible at a glance in default view
- Extra tap to edit rich details

**Possible future evolution:** Context-aware expansion (e.g. show due date when overdue) — must not clutter default card.

---

### Rule-based "AI" before real LLM integration

**Decision:** Classification and Today's Plan use keyword and rule logic in `lib/classify.ts` and `lib/dailyPlan.ts` — no external AI API.

**Context:** MVP scope excluded paid APIs and keys. Product name implies AI destination.

**Reasoning:**
- Ship useful behavior without API cost, latency, or key management
- Rules are debuggable and predictable for early users
- Clear seam for future LLM replacement — same UX, smarter engine
- Aligns with PROJECT_CONSTITUTION stop conditions around API keys

**Trade-offs:**
- Classification quality is limited to keyword heuristics
- "AI Planner" name ahead of capability — documented honestly in vision docs

**Possible future evolution:** Dedicated mission for LLM integration; likely hybrid (rules for fast path, LLM for ambiguous cases).

---

## Process

### Mission-based development with stop-before-commit

**Decision:** Work proceeds in numbered missions; agents stop before git commit unless human approves.

**Context:** Project doubles as training ground for highly automated programming (PROJECT_CONSTITUTION).

**Reasoning:**
- Human retains control over repo history and release timing
- Each mission has explicit scope, constraints, and validation
- Prevents scope creep and unauthorized secret commits

**Trade-offs:**
- Extra handoff step after each mission
- Documentation can lag if missions skip doc updates

**Possible future evolution:** Missions continue; doc updates may become explicit checklist items per mission (as in Mission 09–10).

---

## Related Docs

- [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) — principles behind many of these decisions
- [ARCHITECTURE.md](./ARCHITECTURE.md) — current implementation shape
- [AI_CONTEXT_FOR_NEW_CHAT.md](./AI_CONTEXT_FOR_NEW_CHAT.md) — quick orientation for new AI sessions
