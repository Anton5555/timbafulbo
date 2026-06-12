import {
  FootballDataMatchStatus,
  MatchStage,
  PenaltyWinnerSide,
} from "@/generated/prisma/client"

/** football-data.org v4 `Match.stage` → Prisma `MatchStage` */
export function mapFootballDataStageToMatchStage(
  apiStage: string,
): MatchStage {
  switch (apiStage) {
    case "GROUP_STAGE":
      return MatchStage.GROUP
    case "LAST_16":
    case "ROUND_OF_16":
      return MatchStage.ROUND_OF_16
    case "LAST_32":
      return MatchStage.ROUND_OF_32
    case "QUARTER_FINALS":
      return MatchStage.QUARTER_FINALS
    case "SEMI_FINALS":
      return MatchStage.SEMI_FINALS
    case "THIRD_PLACE":
      return MatchStage.THIRD_PLACE
    case "FINAL":
      return MatchStage.FINAL
    default:
      console.warn(
        `[football-data] Unknown match stage "${apiStage}", mapping to GROUP`,
      )
      return MatchStage.GROUP
  }
}

/** e.g. `GROUP_A` → `A` */
export function parseGroupLetterFromApiGroup(
  group: string | null | undefined,
): string | null {
  if (!group) return null
  const m = /^GROUP_([A-L])$/i.exec(group.trim())
  return m ? m[1].toUpperCase() : null
}

/**
 * Map football-data v4 `match.status` string to our Prisma enum, or null if unknown/empty.
 * See API enum table: SCHEDULED | TIMED | IN_PLAY | PAUSED | EXTRA_TIME | PENALTY_SHOOTOUT |
 * FINISHED | SUSPENDED | POSTPONED | CANCELLED | AWARDED (+ legacy LIVE).
 */
export function parseFootballDataMatchStatus(
  raw: string | null | undefined,
): FootballDataMatchStatus | null {
  if (raw == null) return null
  const s = raw.trim()
  if (!s) return null
  switch (s) {
    case "SCHEDULED":
      return FootballDataMatchStatus.SCHEDULED
    case "TIMED":
      return FootballDataMatchStatus.TIMED
    case "LIVE":
      return FootballDataMatchStatus.LIVE
    case "IN_PLAY":
      return FootballDataMatchStatus.IN_PLAY
    case "PAUSED":
      return FootballDataMatchStatus.PAUSED
    case "EXTRA_TIME":
      return FootballDataMatchStatus.EXTRA_TIME
    case "PENALTY_SHOOTOUT":
      return FootballDataMatchStatus.PENALTY_SHOOTOUT
    case "FINISHED":
      return FootballDataMatchStatus.FINISHED
    case "AWARDED":
      return FootballDataMatchStatus.AWARDED
    case "POSTPONED":
      return FootballDataMatchStatus.POSTPONED
    case "SUSPENDED":
      return FootballDataMatchStatus.SUSPENDED
    case "CANCELLED":
      return FootballDataMatchStatus.CANCELLED
    default:
      console.warn(
        `[football-data] Unknown match status "${raw}", storing null (isFinal unchanged unless FINISHED elsewhere)`,
      )
      return null
  }
}

/**
 * True when a match should be treated as final in our DB: football-data reports
 * FINISHED and both full-time scores are present (free tier may lag on scores).
 */
export function resolveMatchIsFinalFromApi(
  status:
    | FootballDataMatchStatus
    | string
    | null
    | undefined,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
): boolean {
  return (
    isMatchFinishedStatus(status) &&
    homeScore != null &&
    awayScore != null
  )
}

function parsedMatchStatus(
  status:
    | FootballDataMatchStatus
    | string
    | null
    | undefined,
): FootballDataMatchStatus | null {
  if (status == null) return null
  if (typeof status === "string") {
    return parseFootballDataMatchStatus(status)
  }
  return status
}

/** True when football-data reports a terminal result state (finished or awarded). */
export function isMatchFinishedStatus(
  status:
    | FootballDataMatchStatus
    | string
    | null
    | undefined,
): boolean {
  const parsed = parsedMatchStatus(status)
  return (
    parsed === FootballDataMatchStatus.FINISHED ||
    parsed === FootballDataMatchStatus.AWARDED
  )
}

/**
 * football-data.org `score.winner` → side that advances (HOME/AWAY only).
 * Typical values: HOME_TEAM, AWAY_TEAM, DRAW.
 */
export function mapFootballDataWinnerToPenaltySide(
  winner: string | null | undefined,
): PenaltyWinnerSide | null {
  if (!winner) return null
  const w = winner.trim().toUpperCase()
  if (w === "HOME_TEAM" || w === "HOME") return PenaltyWinnerSide.HOME
  if (w === "AWAY_TEAM" || w === "AWAY") return PenaltyWinnerSide.AWAY
  return null
}
