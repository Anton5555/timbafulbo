import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  hasDefinedMatchTeams,
  type ApiMatch,
} from "../../lib/football-data-wc-upsert"

function mkMatch(
  homeId: number | null,
  awayId: number | null,
  stage = "GROUP_STAGE",
): ApiMatch {
  return {
    id: 1,
    utcDate: "2026-06-11T19:00:00Z",
    status: "TIMED",
    matchday: 1,
    stage,
    group: "GROUP_A",
    lastUpdated: "2026-01-01T00:00:00Z",
    homeTeam: {
      id: homeId,
      name: homeId != null ? "Home" : null,
    },
    awayTeam: {
      id: awayId,
      name: awayId != null ? "Away" : null,
    },
  }
}

assert.equal(
  hasDefinedMatchTeams(mkMatch(769, 774)),
  true,
  "both positive team ids should import",
)

assert.equal(
  hasDefinedMatchTeams(mkMatch(null, null, "LAST_16")),
  false,
  "playoff match with null team ids should be skipped",
)

assert.equal(
  hasDefinedMatchTeams(mkMatch(769, null)),
  false,
  "partially defined teams should be skipped",
)

assert.equal(
  hasDefinedMatchTeams(mkMatch(0, 774)),
  false,
  "non-positive team id should be skipped",
)

const seedSource = readFileSync(
  new URL("../../prisma/seed.ts", import.meta.url),
  "utf8",
)
const syncSource = readFileSync(
  new URL(
    "../../scripts/football-data/sync-wc-live-scores.ts",
    import.meta.url,
  ),
  "utf8",
)

assert.match(
  seedSource,
  /apiMatches\.filter\(hasDefinedMatchTeams\)/,
  "seed should filter undefined-team matches before upsert",
)

assert.match(
  syncSource,
  /apiMatches\.filter\(hasDefinedMatchTeams\)/,
  "full WC sync should filter undefined-team matches before upsert",
)

console.log("football-data-defined-teams tests passed")
