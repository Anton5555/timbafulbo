import type {
  MatchStage,
  PenaltyWinnerSide,
  PrismaClient,
} from "../../generated/prisma/client"

/** All WC stages in bracket order (manual rehearsal + finalize filters). */
export const REHEARSAL_STAGES = [
  "GROUP",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
] as const

export type RehearsalStage = (typeof REHEARSAL_STAGES)[number]

export const MANUAL_REHEARSAL_EXTERNAL_PREFIX = "manual-wc-2026"

const MINUTES_PER_DAY = 24 * 60

/**
 * Prediction window per phase: all matches in a stage share one kickoff time
 * (now + window). You finalize the phase manually when ready.
 */
export const REHEARSAL_PHASE_WINDOW_MINUTES: Record<RehearsalStage, number> = {
  GROUP: 3 * MINUTES_PER_DAY,
  ROUND_OF_32: 2 * MINUTES_PER_DAY,
  ROUND_OF_16: 2 * MINUTES_PER_DAY,
  QUARTER_FINALS: 2 * MINUTES_PER_DAY,
  SEMI_FINALS: 2 * MINUTES_PER_DAY,
  THIRD_PLACE: 2 * MINUTES_PER_DAY,
  FINAL: 2 * MINUTES_PER_DAY,
}

/** Shared kickoff for every match in a rehearsal stage. */
export function rehearsalPhaseKickoff(
  stage: MatchStage,
  nowMs = Date.now(),
): Date {
  const windowMinutes = REHEARSAL_PHASE_WINDOW_MINUTES[stage as RehearsalStage]
  if (windowMinutes == null) {
    throw new Error(`Unknown stage for rehearsal kickoff: ${stage}`)
  }
  return new Date(nowMs + windowMinutes * 60_000)
}

export function formatRehearsalPhaseWindows(): string {
  return REHEARSAL_STAGES.map((stage) => {
    const days = REHEARSAL_PHASE_WINDOW_MINUTES[stage] / MINUTES_PER_DAY
    return `${stage}=${days}d`
  }).join(", ")
}

export function isManualRehearsalExternalId(
  externalId: string | null | undefined,
): boolean {
  const e = externalId?.trim()
  if (!e) return false
  return e.startsWith(`${MANUAL_REHEARSAL_EXTERNAL_PREFIX}-`)
}

export function manualRehearsalExternalId(
  stage: MatchStage,
  slotIndex1Based: number,
): string {
  return `${MANUAL_REHEARSAL_EXTERNAL_PREFIX}-${stage}-${String(slotIndex1Based).padStart(2, "0")}`
}

export function looksLocalDatabaseUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  return (
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("[::1]") ||
    lowerUrl.includes("host.docker.internal") ||
    lowerUrl.includes("@db:")
  )
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

export function canWriteToDatabase(url: string): boolean {
  if (looksLocalDatabaseUrl(url)) return true
  return (
    hasFlag("allow-remote") && process.env.MANUAL_TEST_ALLOW_REMOTE === "true"
  )
}

export function manualAwareStageWhere(
  stage: MatchStage | null,
  isFinal: boolean,
  useManualOnly: boolean,
): {
  stage?: MatchStage
  isFinal: boolean
  externalId?: { startsWith: string }
} {
  return {
    ...(stage ? { stage } : {}),
    isFinal,
    ...(stage && useManualOnly
      ? { externalId: { startsWith: MANUAL_REHEARSAL_EXTERNAL_PREFIX } }
      : {}),
  }
}

export async function hasManualRehearsalRowsInStage(
  prisma: PrismaClient,
  stage: MatchStage,
): Promise<boolean> {
  const manualCount = await prisma.match.count({
    where: {
      stage,
      externalId: { startsWith: MANUAL_REHEARSAL_EXTERNAL_PREFIX },
    },
  })
  return manualCount > 0
}

export function getNumberArg(
  name: string,
  fallback: number,
  min: number,
): number {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return fallback

  const raw = process.argv[idx + 1]
  const value = Number(raw)
  if (!raw || Number.isNaN(value) || value < min) {
    throw new Error(
      `Invalid --${name} value "${raw ?? ""}". Expected a number >= ${min}.`,
    )
  }
  return value
}

export function parseMatchStageFromArg(
  flagName: string,
): MatchStage | null {
  const idx = process.argv.indexOf(`--${flagName}`)
  if (idx === -1) return null
  const raw = process.argv[idx + 1]?.trim()
  if (!raw || raw.startsWith("--")) {
    throw new Error(`Missing value for --${flagName}.`)
  }
  const normalized = raw.toUpperCase()
  if (!REHEARSAL_STAGES.includes(normalized as RehearsalStage)) {
    throw new Error(
      `Invalid --${flagName} "${raw}". Allowed: ${REHEARSAL_STAGES.join(", ")}.`,
    )
  }
  return normalized as MatchStage
}

export function parseRequiredFromStageArg(): MatchStage {
  const stage = parseMatchStageFromArg("from-stage")
  if (!stage) {
    throw new Error(
      'Missing --from-stage. Example: --from-stage GROUP (see README "Playoff rehearsal").',
    )
  }
  return stage
}

/** Same xorshift helper as finalize-wc-batch for deterministic rehearsal. */
export function seededNumber(seed: number): number {
  let x = seed | 0
  x ^= x << 13
  x ^= x >> 17
  x ^= x << 5
  return Math.abs(x)
}

function seededTextNumber(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return seededNumber(hash)
}

type WeightedScoreline = {
  homeScore: number
  awayScore: number
  weight: number
}

const REALISTIC_REHEARSAL_SCORELINES: WeightedScoreline[] = [
  { homeScore: 0, awayScore: 0, weight: 10 },
  { homeScore: 1, awayScore: 0, weight: 14 },
  { homeScore: 0, awayScore: 1, weight: 11 },
  { homeScore: 1, awayScore: 1, weight: 13 },
  { homeScore: 2, awayScore: 0, weight: 8 },
  { homeScore: 0, awayScore: 2, weight: 6 },
  { homeScore: 2, awayScore: 1, weight: 12 },
  { homeScore: 1, awayScore: 2, weight: 10 },
  { homeScore: 2, awayScore: 2, weight: 5 },
  { homeScore: 3, awayScore: 0, weight: 3 },
  { homeScore: 0, awayScore: 3, weight: 2 },
  { homeScore: 3, awayScore: 1, weight: 4 },
  { homeScore: 1, awayScore: 3, weight: 3 },
  { homeScore: 3, awayScore: 2, weight: 1 },
  { homeScore: 2, awayScore: 3, weight: 1 },
  { homeScore: 4, awayScore: 0, weight: 1 },
  { homeScore: 0, awayScore: 4, weight: 1 },
  { homeScore: 4, awayScore: 1, weight: 1 },
  { homeScore: 1, awayScore: 4, weight: 1 },
  { homeScore: 4, awayScore: 2, weight: 1 },
  { homeScore: 2, awayScore: 4, weight: 1 },
  { homeScore: 4, awayScore: 3, weight: 1 },
  { homeScore: 3, awayScore: 4, weight: 1 },
]

const REALISTIC_REHEARSAL_SCORELINE_WEIGHT_TOTAL =
  REALISTIC_REHEARSAL_SCORELINES.reduce(
    (total, scoreline) => total + scoreline.weight,
    0,
  )

export function buildSimulatedRehearsalOutcome(
  match: {
    id: string
    footballDataId: number | null
    stage: MatchStage
  },
  globalSeed: number,
): {
  homeScore: number
  awayScore: number
  penaltyWinner: PenaltyWinnerSide | null
} {
  const matchSeed =
    match.footballDataId ??
    seededTextNumber(`${match.stage}:${match.id}`)
  const baseSeed = matchSeed + globalSeed
  let roll =
    seededNumber(baseSeed + 37) % REALISTIC_REHEARSAL_SCORELINE_WEIGHT_TOTAL
  let selected = REALISTIC_REHEARSAL_SCORELINES[0]

  for (const scoreline of REALISTIC_REHEARSAL_SCORELINES) {
    if (roll < scoreline.weight) {
      selected = scoreline
      break
    }
    roll -= scoreline.weight
  }

  const isDraw = selected.homeScore === selected.awayScore
  const penaltyWinner =
    match.stage !== "GROUP" && isDraw
      ? seededNumber(baseSeed + 101) % 2 === 0
        ? "HOME"
        : "AWAY"
      : null

  return {
    homeScore: selected.homeScore,
    awayScore: selected.awayScore,
    penaltyWinner,
  }
}

/** Deterministic shuffle (Fisher–Yates with seededNumber). */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = seededNumber(seed + i * 10007) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function isPlaceholderTeamCode(code: string): boolean {
  return code.trim().toUpperCase().startsWith("TBD")
}

/** Next single-target KO stage after a completed stage (not for SEMI_FINALS). */
export function nextStageAfterCompleted(from: MatchStage): MatchStage | null {
  switch (from) {
    case "GROUP":
      return "ROUND_OF_32"
    case "ROUND_OF_32":
      return "ROUND_OF_16"
    case "ROUND_OF_16":
      return "QUARTER_FINALS"
    case "QUARTER_FINALS":
      return "SEMI_FINALS"
    case "SEMI_FINALS":
      return null
    case "THIRD_PLACE":
    case "FINAL":
      return null
    default:
      return null
  }
}

export function expectedSlotCountForStage(stage: MatchStage): number {
  switch (stage) {
    case "ROUND_OF_32":
      return 16
    case "ROUND_OF_16":
      return 8
    case "QUARTER_FINALS":
      return 4
    case "SEMI_FINALS":
      return 2
    case "THIRD_PLACE":
    case "FINAL":
      return 1
    default:
      return 0
  }
}

export function resolveFinishedMatchWinner(match: {
  isFinal: boolean
  stage: MatchStage
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: PenaltyWinnerSide | null
  homeTeamId: string
  awayTeamId: string
}): { winnerId: string; loserId: string } | null {
  if (!match.isFinal || match.homeScore === null || match.awayScore === null) {
    return null
  }
  const h = match.homeScore
  const a = match.awayScore
  if (h > a) {
    return { winnerId: match.homeTeamId, loserId: match.awayTeamId }
  }
  if (a > h) {
    return { winnerId: match.awayTeamId, loserId: match.homeTeamId }
  }
  if (match.penaltyWinner === "HOME") {
    return { winnerId: match.homeTeamId, loserId: match.awayTeamId }
  }
  if (match.penaltyWinner === "AWAY") {
    return { winnerId: match.awayTeamId, loserId: match.homeTeamId }
  }
  return null
}

export async function assertStageFullyFinal(
  prisma: PrismaClient,
  stage: MatchStage,
): Promise<void> {
  const useManualOnly = await hasManualRehearsalRowsInStage(prisma, stage)
  const pending = await prisma.match.count({
    where: manualAwareStageWhere(stage, false, useManualOnly),
  })
  if (pending > 0) {
    throw new Error(
      `[wc-rehearsal] Cannot generate next stage: ${stage} still has ${pending} non-final ${useManualOnly ? "manual rehearsal " : ""}match(es). Finalize them first.`,
    )
  }
}

export type FinalBracketMatchRow = {
  id: string
  isFinal: boolean
  stage: MatchStage
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: PenaltyWinnerSide | null
  homeTeamId: string
  awayTeamId: string
  externalId: string | null
}

/**
 * Final matches in a stage, ordered like the bracket.
 * If any final match uses `manual-wc-2026-*` ids, only those rows are used (rehearsal path).
 */
export async function listFinalMatchesInStageOrdered(
  prisma: PrismaClient,
  stage: MatchStage,
): Promise<FinalBracketMatchRow[]> {
  const manualFinalCount = await prisma.match.count({
    where: {
      stage,
      isFinal: true,
      externalId: { startsWith: MANUAL_REHEARSAL_EXTERNAL_PREFIX },
    },
  })
  const useManualOnly = manualFinalCount > 0
  return prisma.match.findMany({
    where: {
      stage,
      isFinal: true,
      ...(useManualOnly
        ? {
            externalId: { startsWith: MANUAL_REHEARSAL_EXTERNAL_PREFIX },
          }
        : {}),
    },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    select: {
      id: true,
      isFinal: true,
      stage: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
      homeTeamId: true,
      awayTeamId: true,
      externalId: true,
    },
  })
}

export async function warnIfApiPendingKnockoutInStage(
  prisma: PrismaClient,
  stage: MatchStage,
): Promise<void> {
  const n = await prisma.match.count({
    where: {
      stage,
      isFinal: false,
      footballDataId: { not: null },
    },
  })
  if (n > 0) {
    console.warn(
      `[wc-rehearsal] Stage ${stage} has ${n} pending match(es) with footballDataId set (API fixtures). Manual rehearsal upserts may duplicate the bracket; use a clean DB or remove API rows for that stage if needed.`,
    )
  }
}
