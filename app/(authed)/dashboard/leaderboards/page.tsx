import { Suspense } from "react"

import {
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import { LeaderboardsTab } from "@/components/dashboard/leaderboards-tab"
import { LeaderboardsTabSkeleton } from "@/components/dashboard/skeletons"
import {
  getLeaderboardForTournament,
  getTournamentRulesByIds,
  getTournamentWinner,
} from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

async function LeaderboardsContent({
  tournament,
  matchFilter,
}: {
  tournament?: string
  matchFilter?: string
}) {
  const { userId } = await requireAuthenticatedDashboardUser()
  const tournaments = await loadUserTournaments(userId)

  redirectToDefaultTournamentIfInvalid({
    tab: "leaderboards",
    tournaments,
    requestedTournamentId: tournament,
    preserveMatchFilter: matchFilter,
  })

  const [rulesByTournamentId, tournamentDataEntries] = await Promise.all([
    getTournamentRulesByIds(tournaments.map((t) => t.id)),
    Promise.all(
      tournaments.map(async (t) => {
        const [rows, winner] = await Promise.all([
          getLeaderboardForTournament(t.id),
          getTournamentWinner(t.id),
        ])
        return [t.id, { rows, winner }] as const
      })
    ),
  ])

  const leaderboardsByTournamentId = Object.fromEntries(
    tournamentDataEntries.map(([id, data]) => [id, data.rows])
  )
  const winnerByTournamentId = Object.fromEntries(
    tournamentDataEntries.map(([id, data]) => [id, data.winner])
  )

  return (
    <LeaderboardsTab
      tournaments={tournaments}
      leaderboardsByTournamentId={leaderboardsByTournamentId}
      winnerByTournamentId={winnerByTournamentId}
      rulesByTournamentId={rulesByTournamentId}
      currentUserId={userId}
    />
  )
}

export default async function DashboardLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const sp = await searchParams

  return (
    <Suspense fallback={<LeaderboardsTabSkeleton />}>
      <LeaderboardsContent
        tournament={sp.tournament}
        matchFilter={sp.matchFilter}
      />
    </Suspense>
  )
}
