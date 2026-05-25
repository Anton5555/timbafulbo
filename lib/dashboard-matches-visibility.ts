import type { MatchStage } from "@/generated/prisma/client"

import { canEditPrediction } from "@/lib/prediction-window"

/** Placeholder sides created when the API has no team id yet (see football-data upsert). */
export function isPlaceholderTeamCode(code: string): boolean {
  return code.startsWith("TBD")
}

export function hasDefinedTeamsOnMatch(match: {
  homeTeam: { code: string }
  awayTeam: { code: string }
}): boolean {
  return (
    !isPlaceholderTeamCode(match.homeTeam.code) &&
    !isPlaceholderTeamCode(match.awayTeam.code)
  )
}

/**
 * Earliest stage (by fixture order) that still has an editable match with both teams known.
 */
export function selectCurrentPredictionStage<
  T extends {
    stage: MatchStage
    isFinal: boolean
    startTime: Date
    homeTeam: { code: string }
    awayTeam: { code: string }
  },
>(matches: T[], nowMs: number): MatchStage | null {
  for (const m of matches) {
    if (!hasDefinedTeamsOnMatch(m)) continue
    if (canEditPrediction({ isFinal: m.isFinal, startTime: m.startTime }, nowMs)) {
      return m.stage
    }
  }
  return null
}

/** FINAL and THIRD_PLACE are predicted together in the same phase window. */
export function stagesInPredictionBucket(stage: MatchStage): MatchStage[] {
  if (stage === "FINAL" || stage === "THIRD_PLACE") {
    return ["FINAL", "THIRD_PLACE"]
  }
  return [stage]
}

/**
 * For prediction-enabled dashboard: keep finalized matches available for the results view,
 * plus the current stage with real teams. When no prediction window is open anywhere,
 * return all defined-team matches so users can browse the fixture/results.
 */
export function filterMatchesForPredictionView<
  T extends {
    stage: MatchStage
    isFinal: boolean
    startTime: Date
    homeTeam: { code: string }
    awayTeam: { code: string }
  },
>(matches: T[], nowMs: number): T[] {
  const definedOnly = matches.filter(hasDefinedTeamsOnMatch)
  const stage = selectCurrentPredictionStage(matches, nowMs)
  if (stage === null) {
    return definedOnly
  }
  const bucket = stagesInPredictionBucket(stage)
  return definedOnly.filter((m) => m.isFinal || bucket.includes(m.stage))
}

/** Read-only fixture: hide unknown sides, keep all stages with real teams. */
export function filterReadOnlyDashboardMatches<
  T extends { homeTeam: { code: string }; awayTeam: { code: string } },
>(matches: T[]): T[] {
  return matches.filter(hasDefinedTeamsOnMatch)
}
