# Agent Rules v1

## Core Principle
AI agents should operate with high autonomy inside the approved milestone scope.

The human provides:
- Product direction
- Constraints
- Architecture boundaries
- Final review

The AI agent handles:
- Implementation
- Refactoring
- Error fixing
- Documentation
- Testing
- Small UI improvements

---

# Approved Workflow

```
Claude Cloud → Feature Branch → Draft PR → GPT Review → Sam manually merges
```

| Step | Who | What |
|------|-----|------|
| Implement | Claude Cloud | Works only within the approved mission scope |
| Feature branch | Claude Cloud | Commits and pushes to the approved feature branch only |
| Draft PR | Claude Cloud | Opens or updates a **Draft** PR into `main`; CI runs lint, typecheck, tests, build |
| Review | GPT | Reviews the Draft PR; Claude pushes fixes to the same branch |
| Merge | Sam | Marks the PR ready and merges manually |

Claude is **authorized** to commit and push to approved feature branches.
Claude must **never** merge a pull request or push directly to `main`.

---

# Allowed Autonomous Actions

AI agents MAY:

- Create files
- Modify files
- Refactor code
- Run tests
- Run lint
- Fix build errors
- Improve type safety
- Improve component structure
- Improve responsive behavior
- Add comments/documentation
- Create reusable utilities
- Reorganize files within the approved architecture
- Improve UX consistency
- Add reasonable loading/empty states
- Commit and push to the approved feature branch
- Open or update a Draft PR for that branch (one PR per mission)

---

# Required Stop Conditions

AI agents MUST STOP before:

- Merging any pull request (only Sam merges)
- Pushing or committing directly to `main`, or rewriting its history
- Pushing to any branch other than the approved feature branch
- Marking a Draft PR ready for review, or opening an additional PR, unless asked
- Installing paid services
- Adding API keys/secrets or real credentials to code, docs, PRs or GitHub
- Configuring deployment secrets (e.g. Vercel environment variables)
- Major architecture rewrites
- Changing core tech stack
- Database introduction
- Authentication introduction
- Scope expansion beyond current mission
- Deleting major existing functionality

---

# Coding Standards

## General
- Prefer readability over cleverness
- Keep components small and composable
- Avoid premature optimization
- Avoid unnecessary abstraction

## TypeScript
- Prefer strict typing
- Avoid unnecessary any
- Prefer explicit interfaces/types

## React
- Prefer functional components
- Prefer simple state flow
- Avoid deep prop drilling
- Prefer reusable UI primitives

## Styling
- Use Tailwind CSS
- Keep visual design minimal
- Avoid excessive animations
- Mobile-first responsive design

---

# Project Structure Principle

Prefer clear separation:

- app/
- components/
- lib/
- hooks/
- types/

Avoid deeply nested folders unless necessary.

---

# Testing Principle

Agents should:
- Run lint checks (`npm run lint`)
- Ensure no TypeScript errors (`npm run typecheck`)
- Run the automated tests (`npm test`)
- Ensure build passes (`npm run build`)
- Report anything that could not be run or tested in the PR description

GitHub Actions CI (`.github/workflows/ci.yml`) runs the same checks on every PR update; a PR should be green before GPT review.

Heavy testing frameworks are not required in MVP.

---

# Documentation Principle

When major implementation decisions are made, agents should briefly document:
- Why the approach was chosen
- What alternatives were avoided
- Any future improvement opportunities

## Documentation Synchronization

When implementing a mission:
- ensure the corresponding mission file is updated and preserved
- do not leave mission files empty
- implementation and documentation must stay synchronized