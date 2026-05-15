import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const dashboardDataSource = readFileSync(
  new URL("../../lib/dashboard-data.ts", import.meta.url),
  "utf8"
)
const matchFilterSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/match-filter-search-params.ts",
    import.meta.url
  ),
  "utf8"
)
const matchesTabShellSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/matches-tab-shell.tsx",
    import.meta.url
  ),
  "utf8"
)

assert.match(
  matchFilterSource,
  /\.withDefault\("pending"\)/,
  "matches page should default to pending matches"
)

assert.doesNotMatch(
  matchFilterSource,
  /"all"/,
  "matches page should not expose an all filter while predictions can be scoped to all leagues"
)

assert.match(
  matchesTabShellSource,
  /filter === "pending"[\s\S]*?m\.isFinal === false/,
  "pending matches should include every match that has not finished yet",
)

assert.doesNotMatch(
  matchesTabShellSource,
  /filter === "pending"[\s\S]*?userPrediction === null/,
  "pending matches should not disappear after a user adds a prediction",
)

assert.doesNotMatch(
  matchesTabShellSource,
  /\["all", "Todos"\]/,
  "matches page filter buttons should not include Todos"
)

assert.doesNotMatch(
  matchesTabShellSource,
  /Próximos partidos/,
  "matches toolbar title should not imply the finished tab is still upcoming"
)

assert.match(
  matchesTabShellSource,
  /Tus pronósticos/,
  "matches toolbar should use a title that covers pending and finished predictions"
)

assert.match(
  matchesTabShellSource,
  /Tus pronósticos[\s\S]*?\["pending", "Pendientes"\][\s\S]*?\["finished", "Finalizados"\][\s\S]*?Cambiá el resultado/,
  "filter buttons should live in the top toolbar before the autosave hint"
)

assert.doesNotMatch(
  dashboardDataSource,
  /take:\s*MATCHES_TAKE/,
  "dashboard matches should load the full tournament fixture"
)

assert.doesNotMatch(
  dashboardDataSource,
  /isFinal:\s*"asc"/,
  "query ordering should not push finalized matches out of a capped result set"
)

assert.match(
  dashboardDataSource,
  /filterMatchesForPredictionView/,
  "prediction dashboard should filter by current phase and defined teams",
)

assert.match(
  dashboardDataSource,
  /filterReadOnlyDashboardMatches/,
  "read-only dashboard should strip placeholder teams from the fixture",
)
