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
