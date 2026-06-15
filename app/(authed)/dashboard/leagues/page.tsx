import { Suspense } from "react"

import {
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import { MyLeaguesTab } from "@/components/dashboard/my-leagues-tab"
import { LeaguesTabSkeleton } from "@/components/dashboard/skeletons"
import { env } from "@/env"
import { getMyTournaments, getTournamentWinner } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

async function LeaguesContent({
  tournament,
  matchFilter,
}: {
  tournament?: string
  matchFilter?: string
}) {
  const { userId, userEmail } = await requireAuthenticatedDashboardUser()
  const tournaments = await loadUserTournaments(userId)

  redirectToDefaultTournamentIfInvalid({
    tab: "leagues",
    tournaments,
    requestedTournamentId: tournament,
    preserveMatchFilter: matchFilter,
  })

  const myLeagues = await getMyTournaments(userId)

  const winnerEntries = await Promise.all(
    myLeagues.map(async (league) => {
      const winner = await getTournamentWinner(league.id)
      return [league.id, winner] as const
    })
  )
  const winnerByTournamentId = Object.fromEntries(winnerEntries)

  return (
    <MyLeaguesTab
      leagues={myLeagues}
      winnerByTournamentId={winnerByTournamentId}
      currentUserEmail={userEmail}
      inviteFromEmail={env.INVITE_FROM_EMAIL}
    />
  )
}

export default async function DashboardLeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const sp = await searchParams

  return (
    <Suspense fallback={<LeaguesTabSkeleton />}>
      <LeaguesContent
        tournament={sp.tournament}
        matchFilter={sp.matchFilter}
      />
    </Suspense>
  )
}
