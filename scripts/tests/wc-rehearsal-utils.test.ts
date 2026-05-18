import assert from "node:assert/strict"

import {
  MANUAL_REHEARSAL_EXTERNAL_PREFIX,
  buildSimulatedRehearsalOutcome,
  manualAwareStageWhere,
} from "../manual-testing/wc-rehearsal-utils"

assert.deepEqual(
  manualAwareStageWhere("THIRD_PLACE", false, true),
  {
    stage: "THIRD_PLACE",
    isFinal: false,
    externalId: { startsWith: MANUAL_REHEARSAL_EXTERNAL_PREFIX },
  },
  "manual rehearsal stage commands should target manual rows once they exist",
)

assert.deepEqual(
  manualAwareStageWhere("THIRD_PLACE", false, false),
  {
    stage: "THIRD_PLACE",
    isFinal: false,
  },
  "stage commands without manual rows should keep targeting all rows",
)

assert.deepEqual(
  manualAwareStageWhere(null, false, true),
  {
    isFinal: false,
  },
  "unscoped commands should not switch into manual-only mode",
)

const sampleOutcomes = Array.from({ length: 200 }, (_, idx) =>
  buildSimulatedRehearsalOutcome(
    {
      id: `match-${idx}`,
      footballDataId: 10_000 + idx,
      stage: "GROUP",
    },
    2026,
  ),
)

const commonLowScoreOutcomes = sampleOutcomes.filter(
  (outcome) => outcome.homeScore + outcome.awayScore <= 3,
)
const highScoreOutcomes = sampleOutcomes.filter(
  (outcome) => outcome.homeScore + outcome.awayScore >= 5,
)

assert.ok(
  commonLowScoreOutcomes.length >= 140,
  "manual rehearsal scores should usually look like realistic low-scoring football results",
)
assert.ok(
  highScoreOutcomes.length <= 20,
  "manual rehearsal scores should keep high-scoring matches rare",
)
assert.ok(
  sampleOutcomes.some(
    (outcome) => outcome.homeScore === 0 && outcome.awayScore === 0,
  ),
  "manual rehearsal scores should include 0-0 draws",
)
assert.ok(
  sampleOutcomes.some(
    (outcome) =>
      (outcome.homeScore === 1 && outcome.awayScore === 0) ||
      (outcome.homeScore === 0 && outcome.awayScore === 1),
  ),
  "manual rehearsal scores should include 1-0 results",
)
assert.ok(
  sampleOutcomes.some(
    (outcome) =>
      (outcome.homeScore === 2 && outcome.awayScore === 1) ||
      (outcome.homeScore === 1 && outcome.awayScore === 2),
  ),
  "manual rehearsal scores should include 2-1 results",
)
assert.ok(
  Array.from({ length: 1_000 }, (_, idx) =>
    buildSimulatedRehearsalOutcome(
      {
        id: `rare-match-${idx}`,
        footballDataId: 20_000 + idx,
        stage: "GROUP",
      },
      2026,
    ),
  ).some((outcome) => outcome.homeScore + outcome.awayScore >= 6),
  "manual rehearsal scores should still allow occasional high-scoring matches",
)

const groupDraw = sampleOutcomes.find(
  (outcome) => outcome.homeScore === outcome.awayScore,
)
assert.ok(groupDraw, "test setup should include a group-stage draw")
assert.equal(
  groupDraw.penaltyWinner,
  null,
  "group-stage draws should not get penalty winners",
)

const knockoutDraw = Array.from({ length: 200 }, (_, idx) =>
  buildSimulatedRehearsalOutcome(
    {
      id: `knockout-match-${idx}`,
      footballDataId: 30_000 + idx,
      stage: "ROUND_OF_16",
    },
    2026,
  ),
).find((outcome) => outcome.homeScore === outcome.awayScore)

assert.ok(knockoutDraw, "test setup should include a knockout-stage draw")
assert.ok(
  knockoutDraw.penaltyWinner === "HOME" || knockoutDraw.penaltyWinner === "AWAY",
  "knockout-stage draws should get deterministic penalty winners",
)

console.log("wc-rehearsal-utils tests passed")
