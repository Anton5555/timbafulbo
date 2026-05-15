import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const actionSource = readFileSync(
  new URL("../../app/(authed)/dashboard/prediction-actions.ts", import.meta.url),
  "utf8",
)
const shellSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/matches-tab-shell.tsx",
    import.meta.url,
  ),
  "utf8",
)

assert.match(
  actionSource,
  /applyToAllTournaments:\s*z\.boolean\(\)\.optional\(\)/,
  "upsertPrediction input should accept applyToAllTournaments",
)

assert.match(
  actionSource,
  /prisma\.\$transaction\(/,
  "multi-tournament saves should run in a transaction",
)

assert.match(
  shellSource,
  /Activado: tus predicciones se guardarán en todas tus ligas,\s*\n\s*sobrescribiendo las anteriores\./,
  "matches toolbar should warn that other leagues get overwritten",
)

assert.match(
  shellSource,
  /\[\s*applyToAllTournaments,\s*setApplyToAllTournaments\s*\]\s*=\s*useState\(true\)/,
  "bulk save toggle should default to on",
)

assert.match(
  shellSource,
  /const canBulkSave =\s*predictionsEnabled &&\s*activeFilter === "pending" &&\s*tournaments\.length > 1/,
  "bulk save should only be available on pending matches for users with multiple leagues",
)

assert.match(
  shellSource,
  /const effectiveApplyToAllTournaments =\s*canBulkSave && applyToAllTournaments/,
  "save calls should only apply to all tournaments while bulk mode is available",
)

assert.match(
  shellSource,
  /\{!effectiveApplyToAllTournaments \? \([\s\S]*?<Select[\s\S]*?\) : null\}/,
  "league selector should be hidden while bulk save is active",
)

console.log("prediction-bulk-all-tournaments tests passed")
