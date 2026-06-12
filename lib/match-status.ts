import type {
  FootballDataMatchStatus,
  MatchStage,
  PenaltyWinnerSide,
} from "@/generated/prisma/client"

import type { MatchesTabMatch } from "@/components/dashboard/matches-tab/types"
import { canEditPrediction, PREDICTION_LOCK_MINUTES_BEFORE } from "@/lib/prediction-window"
import {
  predictionEvaluation,
  type PredictionEvaluation,
} from "@/lib/prode-scoring"
import type { TournamentRules } from "@/lib/tournament-rules"

const MS = 60_000
/** Poll more often when a match is within this window of the prediction lock. */
const NEAR_LOCK_MS = 5 * MS

export type MatchStatusDto = {
  id: string
  startTime: string
  status: FootballDataMatchStatus | null
  isFinal: boolean
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: PenaltyWinnerSide | null
  predictionOpen: boolean
  userPredictionResult: PredictionEvaluation | null
}

type MatchStatusInput = {
  id: string
  startTime: Date
  stage: MatchStage
  status: FootballDataMatchStatus | null
  isFinal: boolean
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: PenaltyWinnerSide | null
}

export function isMatchLiveStatus(
  status: FootballDataMatchStatus | null | undefined,
): boolean {
  return (
    status === "IN_PLAY" ||
    status === "LIVE" ||
    status === "PAUSED" ||
    status === "EXTRA_TIME" ||
    status === "PENALTY_SHOOTOUT"
  )
}

type UserPredictionInput = {
  homeScore: number
  awayScore: number
  penaltyWinner: PenaltyWinnerSide | null
} | null

export function buildMatchStatusDto(
  match: MatchStatusInput,
  nowMs: number,
  userPrediction: UserPredictionInput,
  rules: TournamentRules,
): MatchStatusDto {
  let userPredictionResult: PredictionEvaluation | null = null
  if (
    match.isFinal &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    userPrediction !== null
  ) {
    userPredictionResult = predictionEvaluation(
      userPrediction.homeScore,
      userPrediction.awayScore,
      userPrediction.penaltyWinner,
      match.homeScore,
      match.awayScore,
      match.penaltyWinner,
      rules,
      match.stage,
    )
  }

  return {
    id: match.id,
    startTime: match.startTime.toISOString(),
    status: match.status,
    isFinal: match.isFinal,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    penaltyWinner: match.penaltyWinner,
    predictionOpen: canEditPrediction(
      { isFinal: match.isFinal, startTime: match.startTime },
      nowMs,
    ),
    userPredictionResult,
  }
}

export function mergeMatchStatusIntoTabMatch(
  local: MatchesTabMatch,
  status: MatchStatusDto,
): MatchesTabMatch {
  if (status.id !== local.id) return local
  return {
    ...local,
    startTime: status.startTime,
    status: status.status,
    isFinal: status.isFinal,
    homeScore: status.homeScore,
    awayScore: status.awayScore,
    penaltyWinner: status.penaltyWinner,
    predictionOpen: status.predictionOpen,
    userPredictionResult: status.userPredictionResult,
  }
}

/** Whether the client should keep polling match status for the given list. */
export function shouldPollMatchStatuses(
  matches: MatchesTabMatch[],
  nowMs: number,
): boolean {
  for (const m of matches) {
    if (!m.isFinal) return true
    if (m.predictionOpen) {
      const closeAt =
        new Date(m.startTime).getTime() -
        PREDICTION_LOCK_MINUTES_BEFORE * MS
      if (nowMs >= closeAt - NEAR_LOCK_MS) return true
    }
  }
  return false
}
