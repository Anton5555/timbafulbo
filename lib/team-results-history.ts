import type { MatchStage, PenaltyWinnerSide } from "@/generated/prisma/client"

import type {
  MatchesTabMatch,
  MatchesTabTeam,
} from "@/components/dashboard/matches-tab/types"

export type TeamResultOutcome = "W" | "D" | "L"

export type TeamResultHistoryItem = {
  opponent: MatchesTabTeam
  teamScore: number
  opponentScore: number
  outcome: TeamResultOutcome
  stage: MatchStage
  startTime: string
}

function normalizeTeamCode(code: string): string {
  return code.trim().toUpperCase()
}

function deriveOutcome(
  isHome: boolean,
  homeScore: number,
  awayScore: number,
  penaltyWinner: PenaltyWinnerSide | null,
): TeamResultOutcome {
  if (homeScore !== awayScore) {
    const teamScore = isHome ? homeScore : awayScore
    const opponentScore = isHome ? awayScore : homeScore
    return teamScore > opponentScore ? "W" : "L"
  }

  if (penaltyWinner) {
    const teamWonPenalties =
      (isHome && penaltyWinner === "HOME") ||
      (!isHome && penaltyWinner === "AWAY")
    return teamWonPenalties ? "W" : "L"
  }

  return "D"
}

export function getTeamResultsHistory(
  teamCode: string,
  allMatches: MatchesTabMatch[],
  beforeStartTime: string,
): TeamResultHistoryItem[] {
  const normalizedCode = normalizeTeamCode(teamCode)
  const beforeMs = new Date(beforeStartTime).getTime()

  const items: TeamResultHistoryItem[] = []

  for (const match of allMatches) {
    if (!match.isFinal) continue
    if (match.homeScore == null || match.awayScore == null) continue
    if (new Date(match.startTime).getTime() >= beforeMs) continue

    const isHome = normalizeTeamCode(match.homeTeam.code) === normalizedCode
    const isAway = normalizeTeamCode(match.awayTeam.code) === normalizedCode
    if (!isHome && !isAway) continue

    const opponent = isHome ? match.awayTeam : match.homeTeam
    const teamScore = isHome ? match.homeScore : match.awayScore
    const opponentScore = isHome ? match.awayScore : match.homeScore

    items.push({
      opponent,
      teamScore,
      opponentScore,
      outcome: deriveOutcome(
        isHome,
        match.homeScore,
        match.awayScore,
        match.penaltyWinner,
      ),
      stage: match.stage,
      startTime: match.startTime,
    })
  }

  items.sort(
    (a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  )

  return items
}
