import type { MatchStage, PenaltyWinnerSide } from "@/generated/prisma/client"

import type { PredictionEvaluation } from "@/lib/prode-scoring"

export type MatchesTabTeam = {
  name: string
  code: string
}

export type MatchesTabMatch = {
  id: string
  startTime: string
  stage: MatchStage
  group: string | null
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: PenaltyWinnerSide | null
  isFinal: boolean
  homeTeam: MatchesTabTeam
  awayTeam: MatchesTabTeam
  userPrediction: {
    homeScore: number
    awayScore: number
    penaltyWinner: PenaltyWinnerSide | null
  } | null
  /** Present when the match is final with scores and the user had a prediction. */
  userPredictionResult: PredictionEvaluation | null
  predictionOpen: boolean
}
