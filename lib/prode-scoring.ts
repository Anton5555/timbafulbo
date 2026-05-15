import type { MatchStage, PenaltyWinnerSide } from "@/generated/prisma/client"

import type { TournamentRules } from "@/lib/tournament-rules"
import { isKnockoutStage } from "@/lib/knockout-stage"

/** Stages where knockout multiplier applies (semis, third place, final). */
const KNOCKOUT_MULTIPLIER_STAGES = new Set<MatchStage>([
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
])

/** Match result from the scoreboard perspective: draw or who won (goals only). */
function matchResult(home: number, away: number): "draw" | "home" | "away" {
  if (home === away) return "draw"
  return home > away ? "home" : "away"
}

export type PredictionEvaluationKind = "exact" | "result" | "miss"

export type PredictionEvaluation = {
  kind: PredictionEvaluationKind
  points: number
}

/**
 * Classifies a prediction vs the final result and returns awarded points.
 * Same rules as {@link predictionPoints}; use this when the UI needs the kind.
 */
export function predictionEvaluation(
  predictedHome: number,
  predictedAway: number,
  predictedPenaltyWinner: PenaltyWinnerSide | null,
  actualHome: number,
  actualAway: number,
  actualPenaltyWinner: PenaltyWinnerSide | null,
  rules: TournamentRules,
  stage: MatchStage,
): PredictionEvaluation {
  const mult =
    KNOCKOUT_MULTIPLIER_STAGES.has(stage) ? rules.knockoutMultiplier : 1

  if (!isKnockoutStage(stage)) {
    if (predictedHome === actualHome && predictedAway === actualAway) {
      return {
        kind: "exact",
        points: rules.exactScorePoints * mult,
      }
    }
    const pred = matchResult(predictedHome, predictedAway)
    const act = matchResult(actualHome, actualAway)
    if (pred === act) {
      return {
        kind: "result",
        points: rules.resultPoints * mult,
      }
    }
    return { kind: "miss", points: 0 }
  }

  // Knockout: decision without a draw in the stored score (90' / aggregated result from API).
  if (actualHome !== actualAway) {
    if (predictedHome === actualHome && predictedAway === actualAway) {
      return {
        kind: "exact",
        points: rules.exactScorePoints * mult,
      }
    }
    const pred = matchResult(predictedHome, predictedAway)
    const act = matchResult(actualHome, actualAway)
    if (pred === act) {
      return {
        kind: "result",
        points: rules.resultPoints * mult,
      }
    }
    return { kind: "miss", points: 0 }
  }

  // Knockout + draw in regular time → penalties decide (missing real data → 0 pts).
  if (actualPenaltyWinner === null) {
    return { kind: "miss", points: 0 }
  }

  const ftExact =
    predictedHome === actualHome &&
    predictedAway === actualAway &&
    predictedPenaltyWinner === actualPenaltyWinner

  if (ftExact) {
    return {
      kind: "exact",
      points: rules.exactScorePoints * mult,
    }
  }

  const predictedDraw = predictedHome === predictedAway
  if (
    predictedDraw &&
    predictedPenaltyWinner !== null &&
    predictedPenaltyWinner === actualPenaltyWinner
  ) {
    return {
      kind: "result",
      points: rules.resultPoints * mult,
    }
  }

  return { kind: "miss", points: 0 }
}

/**
 * Points for a prediction once the match is final.
 * Respects tournament rules and stage multipliers where applicable.
 *
 * Knockout matches with a draw in regular time require the correct penalty winner
 * to award points (either exact score or partial result).
 */
export function predictionPoints(
  predictedHome: number,
  predictedAway: number,
  predictedPenaltyWinner: PenaltyWinnerSide | null,
  actualHome: number,
  actualAway: number,
  actualPenaltyWinner: PenaltyWinnerSide | null,
  rules: TournamentRules,
  stage: MatchStage,
): number {
  return predictionEvaluation(
    predictedHome,
    predictedAway,
    predictedPenaltyWinner,
    actualHome,
    actualAway,
    actualPenaltyWinner,
    rules,
    stage,
  ).points
}
