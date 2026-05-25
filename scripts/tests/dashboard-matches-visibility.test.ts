import assert from "node:assert/strict"

import type { MatchStage } from "@/generated/prisma/client"
import {
  filterMatchesForPredictionView,
  hasDefinedTeamsOnMatch,
  isPlaceholderTeamCode,
  selectCurrentPredictionStage,
} from "../../lib/dashboard-matches-visibility"

const MS = 60_000
/** Must match `lib/prediction-window.ts` */
const LOCK_BEFORE = 15 * MS

function atOffsetMs(base: number, offsetMinutes: number): Date {
  return new Date(base + offsetMinutes * MS)
}

type TestMatch = {
  id: string
  stage: MatchStage
  startTime: Date
  isFinal: boolean
  homeTeam: { code: string }
  awayTeam: { code: string }
}

function mk(
  id: string,
  stage: MatchStage,
  startTime: Date,
  opts?: {
    isFinal?: boolean
    homeCode?: string
    awayCode?: string
  },
): TestMatch {
  return {
    id,
    stage,
    startTime,
    isFinal: opts?.isFinal ?? false,
    homeTeam: { code: opts?.homeCode ?? "ARG" },
    awayTeam: { code: opts?.awayCode ?? "BRA" },
  }
}

// --- isPlaceholderTeamCode / hasDefinedTeamsOnMatch ---

assert.equal(isPlaceholderTeamCode("TBDxyz"), true)
assert.equal(isPlaceholderTeamCode("ARG"), false)

assert.equal(
  hasDefinedTeamsOnMatch(
    mk("1", "GROUP", new Date(), { homeCode: "TBD1", awayCode: "URY" }),
  ),
  false,
)
assert.equal(
  hasDefinedTeamsOnMatch(
    mk("2", "GROUP", new Date(), { homeCode: "ARG", awayCode: "URY" }),
  ),
  true,
)

// --- Current stage: earliest open + defined in fixture order ---

const base = Date.UTC(2026, 5, 1, 12, 0, 0)
const nowDuringGroup = base + 1 * MS

const groupOpen = mk("g1", "GROUP", atOffsetMs(nowDuringGroup, 120), {
  homeCode: "ARG",
  awayCode: "URY",
})
const r32PlaceholderLater = mk(
  "k1",
  "ROUND_OF_32",
  atOffsetMs(nowDuringGroup, 24 * 60),
  { homeCode: "TBDk1H", awayCode: "TBDk1V" },
)

assert.equal(
  selectCurrentPredictionStage([groupOpen, r32PlaceholderLater], nowDuringGroup),
  "GROUP",
)

const filteredEarly = filterMatchesForPredictionView(
  [groupOpen, r32PlaceholderLater],
  nowDuringGroup,
)
assert.deepEqual(
  filteredEarly.map((m) => m.id),
  ["g1"],
  "later knockout placeholders must not appear while group predictions are open",
)

// --- Advance: no earlier open defined match → next stage ---

const groupLocked = mk("g2", "GROUP", atOffsetMs(nowDuringGroup, -120), {
  isFinal: true,
  homeCode: "ARG",
  awayCode: "URY",
})
const r16Open = mk("k2", "ROUND_OF_16", atOffsetMs(nowDuringGroup, 180), {
  homeCode: "ARG",
  awayCode: "BRA",
})

assert.equal(
  selectCurrentPredictionStage([groupLocked, r16Open], nowDuringGroup),
  "ROUND_OF_16",
)

const filteredAdvance = filterMatchesForPredictionView(
  [groupLocked, r16Open],
  nowDuringGroup,
)
assert.deepEqual(
  filteredAdvance.map((m) => m.id),
  ["g2", "k2"],
  "current phase should move on while keeping finalized matches available",
)

// --- No open windows: browse all defined-team matches (fallback) ---

const past = base
const nowAfterAll = past + 365 * 24 * 60 * MS
const mA = mk("a", "GROUP", atOffsetMs(past, 0), {
  isFinal: true,
  homeCode: "ARG",
  awayCode: "URY",
})
const mB = mk("b", "FINAL", atOffsetMs(past, 60), {
  isFinal: true,
  homeCode: "ARG",
  awayCode: "BRA",
})

const filteredBrowse = filterMatchesForPredictionView([mA, mB], nowAfterAll)
assert.equal(filteredBrowse.length, 2)
assert.ok(filteredBrowse.some((m) => m.stage === "GROUP"))
assert.ok(filteredBrowse.some((m) => m.stage === "FINAL"))

// --- First chronologically open+defined wins over later same stage ---

const laterSameStage = mk("g-late", "GROUP", atOffsetMs(nowDuringGroup, 300), {
  homeCode: "BRA",
  awayCode: "COL",
})
assert.equal(
  selectCurrentPredictionStage([laterSameStage, groupOpen], nowDuringGroup),
  "GROUP",
)
assert.equal(
  selectCurrentPredictionStage([groupOpen, laterSameStage], nowDuringGroup),
  "GROUP",
)

// --- Open but inside lock window counts as closed for current stage ---

const soonKickoff = mk(
  "g-lock",
  "GROUP",
  new Date(nowDuringGroup + LOCK_BEFORE - 60_000),
  { homeCode: "ARG", awayCode: "URY" },
)
const nextStageOnly = mk(
  "k3",
  "QUARTER_FINALS",
  atOffsetMs(nowDuringGroup, 400),
  { homeCode: "ARG", awayCode: "BRA" },
)

assert.equal(
  selectCurrentPredictionStage([soonKickoff, nextStageOnly], nowDuringGroup),
  "QUARTER_FINALS",
)

// --- FINAL + THIRD_PLACE: both visible when either window is open ---

const semiFinalized = mk("sf1", "SEMI_FINALS", atOffsetMs(nowDuringGroup, -60), {
  isFinal: true,
  homeCode: "MEX",
  awayCode: "BEL",
})
const finalOpen = mk("fin", "FINAL", atOffsetMs(nowDuringGroup, 180), {
  homeCode: "ARG",
  awayCode: "BRA",
})
const thirdPlaceOpen = mk("tp", "THIRD_PLACE", atOffsetMs(nowDuringGroup, 181), {
  homeCode: "MEX",
  awayCode: "BEL",
})

const finaleFixture = [semiFinalized, finalOpen, thirdPlaceOpen]

assert.equal(
  selectCurrentPredictionStage(finaleFixture, nowDuringGroup),
  "FINAL",
  "earliest editable match in fixture order is FINAL",
)

const filteredFinale = filterMatchesForPredictionView(
  finaleFixture,
  nowDuringGroup,
)
assert.deepEqual(
  filteredFinale.map((m) => m.id).sort(),
  ["fin", "sf1", "tp"].sort(),
  "FINAL and THIRD_PLACE must both appear while predictions are open",
)

console.log("dashboard-matches-visibility tests passed")
