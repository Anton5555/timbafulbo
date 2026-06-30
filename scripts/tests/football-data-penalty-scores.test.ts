import assert from "node:assert/strict"

import { mapFootballDataStageToMatchStage, resolveMatchScoresFromApi } from "@/lib/football-data"
import { resolveMatchPenaltyWinnerFromApi } from "@/lib/football-data-wc-upsert"

const germanyParaguayScore = {
  winner: "AWAY_TEAM",
  duration: "PENALTY_SHOOTOUT",
  fullTime: { home: 4, away: 5 },
  halfTime: { home: 0, away: 1 },
  regularTime: { home: 1, away: 1 },
  extraTime: { home: 0, away: 0 },
  penalties: { home: 3, away: 4 },
}

const netherlandsMoroccoScore = {
  winner: "AWAY_TEAM",
  duration: "PENALTY_SHOOTOUT",
  fullTime: { home: 3, away: 4 },
  halfTime: { home: 0, away: 0 },
  regularTime: { home: 1, away: 1 },
  extraTime: { home: 0, away: 0 },
  penalties: { home: 2, away: 3 },
}

assert.deepEqual(resolveMatchScoresFromApi(germanyParaguayScore), {
  home: 1,
  away: 1,
})
assert.deepEqual(resolveMatchScoresFromApi(netherlandsMoroccoScore), {
  home: 1,
  away: 1,
})

const stage = mapFootballDataStageToMatchStage("LAST_32")
const germanyPenalty = resolveMatchPenaltyWinnerFromApi(
  stage,
  1,
  1,
  true,
  germanyParaguayScore.winner,
)
const netherlandsPenalty = resolveMatchPenaltyWinnerFromApi(
  stage,
  1,
  1,
  true,
  netherlandsMoroccoScore.winner,
)

assert.equal(germanyPenalty, "AWAY")
assert.equal(netherlandsPenalty, "AWAY")

assert.deepEqual(
  resolveMatchScoresFromApi({
    fullTime: { home: 2, away: 1 },
    regularTime: { home: 1, away: 1 },
    extraTime: { home: 1, away: 0 },
    duration: "REGULAR",
  }),
  { home: 2, away: 1 },
)

console.log("football-data-penalty-scores tests passed")
