import assert from "node:assert/strict"

import {
  pickWinnersFromLeaderboard,
  type LeaderboardStanding,
} from "../../lib/tournament-winner"

function row(
  userId: string,
  displayName: string,
  points: number
): LeaderboardStanding {
  return { userId, displayName, points }
}

assert.deepEqual(pickWinnersFromLeaderboard([]), [])

assert.deepEqual(
  pickWinnersFromLeaderboard([
    row("a", "Ana", 10),
    row("b", "Bruno", 8),
  ]),
  [row("a", "Ana", 10)]
)

assert.deepEqual(
  pickWinnersFromLeaderboard([
    row("a", "Ana", 10),
    row("b", "Bruno", 10),
    row("c", "Carlos", 7),
  ]),
  [row("a", "Ana", 10), row("b", "Bruno", 10)]
)

assert.deepEqual(
  pickWinnersFromLeaderboard([
    row("a", "Ana", 0),
    row("b", "Bruno", 0),
  ]),
  [row("a", "Ana", 0), row("b", "Bruno", 0)]
)

console.log("tournament-winner.test.ts: ok")
