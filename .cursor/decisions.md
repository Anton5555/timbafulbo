# Decision Guidelines

- If logic involves time → server-side

- If data is derived → do NOT store

- If feature affects scoring:
  - must remain deterministic

- If feature is tournament-specific:
  - scope it to tournament

- Prefer:
  - simple queries
  - explicit logic

- Avoid:
  - magic abstractions
  - premature optimization

---

# Tradeoffs

- Prefer correctness over performance
- Prefer clarity over cleverness

---

# When Unsure

- Choose simplest working solution
- Explain tradeoffs briefly

# Rendering Strategy (Next.js 16)

- Use Server Components for:
  - pages
  - data fetching
  - leaderboard rendering

- Use Client Components for:
  - prediction inputs
  - interactive UI

- Avoid:
  - lifting state unnecessarily
  - client-side data fetching if server can do it

- Prefer:
  - streaming UI when useful
  - partial rendering

- Do NOT generate traditional REST patterns unless explicitly requested
