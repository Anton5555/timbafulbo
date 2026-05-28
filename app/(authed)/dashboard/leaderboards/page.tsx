import { Suspense } from "react"

import {
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { LeaderboardsTab } from "@/components/dashboard/leaderboards-tab"
import {
  getLeaderboardForTournament,
  getTournamentWinner,
} from "@/lib/dashboard-data"
export const dynamic = "force-dynamic"

export default async function DashboardLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const { userId } = await requireAuthenticatedDashboardUser()
  const sp = await searchParams
  const tournaments = await loadUserTournaments(userId)

  redirectToDefaultTournamentIfInvalid({
    tab: "leaderboards",
    tournaments,
    requestedTournamentId: sp.tournament,
    preserveMatchFilter: sp.matchFilter,
  })

  const tournamentDataEntries = await Promise.all(
    tournaments.map(async (t) => {
      const [rows, winner] = await Promise.all([
        getLeaderboardForTournament(t.id),
        getTournamentWinner(t.id),
      ])
      return [t.id, { rows, winner }] as const
    })
  )

  const leaderboardsByTournamentId = Object.fromEntries(
    tournamentDataEntries.map(([id, data]) => [id, data.rows])
  )
  const winnerByTournamentId = Object.fromEntries(
    tournamentDataEntries.map(([id, data]) => [id, data.winner])
  )

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHero />

      <Suspense
        fallback={
          <div className="flex flex-col gap-6" aria-hidden>
            <div className="mb-1 h-10 w-full animate-pulse rounded-none border-b border-border bg-muted/20" />
          </div>
        }
      >
        <DashboardTabs>
          <LeaderboardsTab
            tournaments={tournaments}
            leaderboardsByTournamentId={leaderboardsByTournamentId}
            winnerByTournamentId={winnerByTournamentId}
          />
        </DashboardTabs>
      </Suspense>
    </div>
  )
}
