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

---

# Required Stop Conditions

AI agents MUST STOP before:

- Git commit
- Pushing to GitHub
- Installing paid services
- Adding API keys/secrets
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
- Run lint checks
- Ensure build passes
- Ensure no TypeScript errors

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