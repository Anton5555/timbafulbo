import assert from "node:assert/strict"

import type { MatchesTabMatch } from "@/components/dashboard/matches-tab/types"
import { getTeamResultsHistory } from "@/lib/team-results-history"

function baseMatch(overrides: Partial<MatchesTabMatch> = {}): MatchesTabMatch {
  return {
    id: "m1",
    startTime: "2026-06-15T18:00:00.000Z",
    stage: "GROUP",
    group: "A",
    homeScore: null,
    awayScore: null,
    penaltyWinner: null,
    status: null,
    isFinal: false,
    homeTeam: { name: "Local", code: "LOC" },
    awayTeam: { name: "Visitante", code: "VIS" },
    userPrediction: null,
    userPredictionResult: null,
    predictionOpen: true,
    ...overrides,
  }
}

const argVsBra = baseMatch({
  id: "m-arg-bra",
  startTime: "2026-06-10T18:00:00.000Z",
  isFinal: true,
  homeScore: 2,
  awayScore: 1,
  homeTeam: { name: "Argentina", code: "ARG" },
  awayTeam: { name: "Brasil", code: "BRA" },
})

const argVsGer = baseMatch({
  id: "m-arg-ger",
  startTime: "2026-06-20T18:00:00.000Z",
  stage: "ROUND_OF_16",
  isFinal: true,
  homeScore: 1,
  awayScore: 1,
  penaltyWinner: "HOME",
  homeTeam: { name: "Argentina", code: "ARG" },
  awayTeam: { name: "Alemania", code: "GER" },
})

const futureArgMatch = baseMatch({
  id: "m-future",
  startTime: "2026-07-01T18:00:00.000Z",
  homeTeam: { name: "Argentina", code: "ARG" },
  awayTeam: { name: "Francia", code: "FRA" },
})

// Only finished matches before the current kickoff are included.
const history = getTeamResultsHistory(
  "ARG",
  [argVsBra, argVsGer, futureArgMatch],
  "2026-06-25T18:00:00.000Z",
)

assert.equal(history.length, 2)
assert.equal(history[0]!.opponent.code, "GER")
assert.equal(history[0]!.teamScore, 1)
assert.equal(history[0]!.opponentScore, 1)
assert.equal(history[0]!.outcome, "W")
assert.equal(history[1]!.opponent.code, "BRA")
assert.equal(history[1]!.outcome, "W")
assert.equal(history[1]!.teamScore, 2)
assert.equal(history[1]!.opponentScore, 1)

const awayLoss = getTeamResultsHistory(
  "GER",
  [argVsGer],
  "2026-06-25T18:00:00.000Z",
)
assert.equal(awayLoss.length, 1)
assert.equal(awayLoss[0]!.outcome, "L")
assert.equal(awayLoss[0]!.teamScore, 1)
assert.equal(awayLoss[0]!.opponentScore, 1)

const draw = getTeamResultsHistory(
  "ARG",
  [
    baseMatch({
      startTime: "2026-06-05T12:00:00.000Z",
      isFinal: true,
      homeScore: 0,
      awayScore: 0,
      homeTeam: { name: "Argentina", code: "ARG" },
      awayTeam: { name: "México", code: "MEX" },
    }),
  ],
  "2026-06-10T18:00:00.000Z",
)
assert.equal(draw[0]!.outcome, "D")

const empty = getTeamResultsHistory("ARG", [futureArgMatch], futureArgMatch.startTime)
assert.deepEqual(empty, [])

console.log("team-results-history.test.ts: ok")
