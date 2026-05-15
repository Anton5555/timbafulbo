import { redirect } from "next/navigation"
import { Suspense } from "react"

import {
  isMatchFilter,
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { MatchesTab, type MatchesTabMatch } from "@/components/dashboard/matches-tab"
import { env } from "@/env"
import {
  getDashboardMatchesReadOnly,
  getDashboardMatchesWithPredictions,
} from "@/lib/dashboard-data"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"

export const dynamic = "force-dynamic"

export default async function DashboardMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const { userId, userEmail } = await requireAuthenticatedDashboardUser()
  const sp = await searchParams
  const tournaments = await loadUserTournaments(userId)

  const tournamentId = redirectToDefaultTournamentIfInvalid({
    tab: "matches",
    tournaments,
    requestedTournamentId: sp.tournament,
    preserveMatchFilter: sp.matchFilter,
  })

  let serializedMatches: MatchesTabMatch[] = []

  if (tournaments.length > 0) {
    const withPred = await getDashboardMatchesWithPredictions(
      userId,
      tournamentId!
    )
    if (withPred === null) {
      const qs = new URLSearchParams()
      qs.set("tournament", tournaments[0]!.id)
      if (isMatchFilter(sp.matchFilter)) {
        qs.set("matchFilter", sp.matchFilter)
      }
      redirect(`${DASHBOARD_SECTION_PATH.matches}?${qs.toString()}`)
    }
    serializedMatches = withPred.map((m) => ({
      ...m,
      startTime: m.startTime.toISOString(),
    }))
  } else {
    const browse = await getDashboardMatchesReadOnly()
    serializedMatches = browse.map((m) => ({
      ...m,
      startTime: m.startTime.toISOString(),
    }))
  }

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
          <MatchesTab
            predictionsEnabled={tournaments.length > 0}
            tournaments={tournaments}
            matches={serializedMatches}
            currentUserEmail={userEmail}
            inviteFromEmail={env.INVITE_FROM_EMAIL}
          />
        </DashboardTabs>
      </Suspense>
    </div>
  )
}
