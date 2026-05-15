# Project Context

- This is a Next.js 15 application using the App Router
- The app is a multi-tenant sports prediction system ("prode")
- Users can belong to multiple tournaments
- Each tournament has isolated rules, predictions, and leaderboard

Stack:

- Better Auth (authentication)
- Prisma (database ORM)
- Supabase (storage only, not DB queries)
- shadcn/ui + Tailwind (UI)
- Server Actions (preferred over API routes)
- Zod (validation)

---

# Authentication & Authorization

- Authentication is handled by Better Auth

- DO NOT create or manage a User table

- Use:
  - userId from Better Auth session

- Never:
  - accept userId from client input
  - store passwords
  - replicate auth logic

- Authorization is handled by this app via Membership

---

# Core Domain Rules

- A Tournament is an isolated environment:
  - its own members
  - its own rules
  - its own leaderboard

- Matches are global entities shared across tournaments

- Predictions:
  - One prediction per user per match per tournament
  - Editable only before lock time
  - Immutable after lock

- Locking:
  - lockTime = match.startTime - rules.predictions.lockMinutesBeforeMatch
  - Must always be enforced on the server

- Scoring:
  - ALWAYS derived
  - NEVER stored as source of truth

- Leaderboard:
  - ALWAYS derived from predictions
  - NEVER persisted as final truth

---

# Coding Principles

- Prefer server components over client components

- Use client components only when necessary

- Server Actions are the default way to handle mutations
- API routes should only be used when:
  - external access is required
  - webhooks are needed
- Use Prisma for ALL database access

- Do NOT mix Supabase DB queries with Prisma

- Use Zod for validation on all inputs

- Keep logic:
  - simple
  - explicit
  - readable

---

# Architecture Patterns

- Organize by feature, not by type

- Co-locate related logic

- Avoid:
  - unnecessary abstractions
  - global state unless required

---

# UI Guidelines

- Always use shadcn components first

- Use Tailwind for styling

- Avoid inline styles

- UI must be:
  - fast
  - minimal
  - mobile-friendly

- **timbafulbo visual system (scoreboard aesthetic, home/dashboard layouts, OKLCH semantic tokens, Spanish copy):** see [`.cursor/rules/timba-ui-layout.mdc`](.cursor/rules/timba-ui-layout.mdc) — Cursor applies it when editing files under `app/` and `components/`.

---

# Data & Performance

- Avoid over-fetching

- Fetch only what is needed

- Prefer server-side data fetching

- Use optimistic updates carefully (only before lock)

---

# UX Principles

- Prioritize:
  - fast prediction input
  - easy comparison between users
  - clear leaderboard

- Social features:
  - show predictions after lock
  - highlight differences between users

---

# Anti-Patterns (STRICT)

- Do NOT create a User table
- Do NOT store computed scores as truth
- Do NOT trust client time
- Do NOT allow edits after lock
- Do NOT bypass membership checks
- Do NOT mix Prisma with Supabase DB queries

---

# When Generating Code

- Always:
  - use TypeScript
  - include types
  - validate with Zod
  - follow existing patterns

- When unsure:
  - choose simplest correct solution
  - briefly explain tradeoffs

---

# Mental Model

This is NOT a CRUD app.

It is:
→ a deterministic prediction engine
→ with strict time-based rules
→ and derived scoring

All logic must respect that.

# Next.js 16 Principles

- Default to Server Components
- Use Client Components only for:
  - interactivity (forms, buttons, UI state)
  - browser-only APIs

- Co-locate data fetching inside Server Components
- Avoid unnecessary client-side fetching

- Use Server Actions for:
  - mutations
  - form handling
