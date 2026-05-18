import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import type { MatchesTabMatch } from "@/components/dashboard/matches-tab/types"
import {
  buildMatchStatusDto,
  mergeMatchStatusIntoTabMatch,
  shouldPollMatchStatuses,
} from "@/lib/match-status"
import { PREDICTION_LOCK_MINUTES_BEFORE } from "@/lib/prediction-window"

const MS = 60_000

function baseMatch(overrides: Partial<MatchesTabMatch> = {}): MatchesTabMatch {
  return {
    id: "m1",
    startTime: new Date("2026-06-15T18:00:00.000Z").toISOString(),
    stage: "GROUP",
    group: "A",
    homeScore: null,
    awayScore: null,
    penaltyWinner: null,
    isFinal: false,
    homeTeam: { name: "Local", code: "LOC" },
    awayTeam: { name: "Visitante", code: "VIS" },
    userPrediction: null,
    userPredictionResult: null,
    predictionOpen: true,
    ...overrides,
  }
}

const kickoff = new Date("2026-06-15T18:00:00.000Z")
const closeAt =
  kickoff.getTime() - PREDICTION_LOCK_MINUTES_BEFORE * MS

assert.equal(
  buildMatchStatusDto(
    {
      id: "m1",
      startTime: kickoff,
      stage: "GROUP",
      isFinal: false,
      homeScore: null,
      awayScore: null,
      penaltyWinner: null,
    },
    closeAt - 1,
    null,
    { exactScorePoints: 3, resultPoints: 1, knockoutMultiplier: 2 },
  ).predictionOpen,
  true,
  "status DTO should be open before lock window",
)

assert.equal(
  buildMatchStatusDto(
    {
      id: "m1",
      startTime: kickoff,
      stage: "GROUP",
      isFinal: false,
      homeScore: null,
      awayScore: null,
      penaltyWinner: null,
    },
    closeAt,
    null,
    { exactScorePoints: 3, resultPoints: 1, knockoutMultiplier: 2 },
  ).predictionOpen,
  false,
  "status DTO should close exactly at lock time",
)

assert.equal(
  shouldPollMatchStatuses([baseMatch({ isFinal: false })], Date.now()),
  true,
  "unfinished matches should keep polling active",
)

assert.equal(
  shouldPollMatchStatuses(
    [
      baseMatch({
        isFinal: true,
        predictionOpen: true,
        startTime: new Date(Date.now() + 10 * MS).toISOString(),
      }),
    ],
    Date.now(),
  ),
  true,
  "stale open predictions near kickoff should keep polling active",
)

assert.equal(
  shouldPollMatchStatuses(
    [
      baseMatch({
        isFinal: true,
        predictionOpen: false,
        startTime: new Date("2020-01-01T12:00:00.000Z").toISOString(),
      }),
    ],
    Date.now(),
  ),
  false,
  "finished closed matches should not poll",
)

const merged = mergeMatchStatusIntoTabMatch(
  baseMatch({
    userPrediction: { homeScore: 2, awayScore: 1, penaltyWinner: null },
    homeScore: null,
    awayScore: null,
    predictionOpen: true,
  }),
  {
    id: "m1",
    startTime: kickoff.toISOString(),
    isFinal: true,
    homeScore: 3,
    awayScore: 1,
    penaltyWinner: null,
    predictionOpen: false,
    userPredictionResult: { kind: "result", points: 1 },
  },
)

assert.deepEqual(merged.userPrediction, {
  homeScore: 2,
  awayScore: 1,
  penaltyWinner: null,
})
assert.equal(merged.homeScore, 3)
assert.equal(merged.predictionOpen, false)
assert.equal(merged.userPredictionResult?.kind, "result")

const shellSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/matches-tab-shell.tsx",
    import.meta.url,
  ),
  "utf8",
)
const hookSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/use-match-status-polling.ts",
    import.meta.url,
  ),
  "utf8",
)

assert.match(
  shellSource,
  /useMatchStatusPolling/,
  "matches tab shell should wire match status polling",
)
assert.match(
  shellSource,
  /matchStatusPollingResetKey/,
  "matches tab shell should reset polling when server match rows change",
)
assert.match(
  hookSource,
  /visibilitychange/,
  "polling hook should refresh when the tab becomes visible again",
)
assert.match(
  hookSource,
  /30_000/,
  "polling hook should use a 30 second interval",
)
assert.doesNotMatch(
  hookSource,
  /userPrediction:/,
  "polling merge must not overwrite user predictions",
)

console.log("match-status tests passed")
