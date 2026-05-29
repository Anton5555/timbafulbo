import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const actionSource = readFileSync(
  new URL("../../app/(authed)/dashboard/prediction-actions.ts", import.meta.url),
  "utf8",
)
const leaguesSource = readFileSync(
  new URL("../../components/dashboard/my-leagues-tab.tsx", import.meta.url),
  "utf8",
)

assert.match(
  actionSource,
  /export async function copyPredictionsFromLeague/,
  "prediction-actions should export copyPredictionsFromLeague",
)

assert.match(
  actionSource,
  /sourceTournamentId:\s*z\.string\(\)\.min\(1\)/,
  "copy schema should include sourceTournamentId",
)

assert.match(
  actionSource,
  /targetTournamentId:\s*z\.string\(\)\.min\(1\)/,
  "copy schema should include targetTournamentId",
)

assert.match(
  actionSource,
  /\.refine\(\(d\) => d\.sourceTournamentId !== d\.targetTournamentId/,
  "copy schema should reject same source and target",
)

assert.match(
  actionSource,
  /userHasTournamentAccess\(userId, sourceTournamentId\)/,
  "copy action should verify source membership",
)

assert.match(
  actionSource,
  /userHasTournamentAccess\(userId, targetTournamentId\)/,
  "copy action should verify target membership",
)

assert.match(
  actionSource,
  /prisma\.\$transaction\(/,
  "copy action should run upserts in a transaction",
)

assert.match(
  actionSource,
  /canEditPrediction\(/,
  "copy action should filter to open matches via canEditPrediction",
)

assert.match(
  actionSource,
  /revalidatePath\(DASHBOARD_SECTION_PATH\.matches\)/,
  "copy action should revalidate matches path",
)

assert.match(
  leaguesSource,
  /const canCopyPredictions = optimisticLeagues\.length > 1/,
  "copy button should only show when user has 2+ leagues",
)

assert.match(
  leaguesSource,
  /Solo se copian partidos\s*\n\s*aún abiertos\. Sobrescribe pronósticos ya cargados en esta liga\./,
  "copy dialog should warn about open matches only and overwrite",
)

assert.match(
  leaguesSource,
  /Copiar pronósticos desde…/,
  "league card should expose copy predictions trigger",
)

console.log("copy-predictions-from-league tests passed")
