import { Suspense } from "react"

import {
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { MyLeaguesTab } from "@/components/dashboard/my-leagues-tab"
import { env } from "@/env"
import { getMyTournaments } from "@/lib/dashboard-data"
import { getTournamentChatMessagesForUser } from "@/lib/tournament-chat-data"

export const dynamic = "force-dynamic"

export default async function DashboardLeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const { userId, userEmail } = await requireAuthenticatedDashboardUser()
  const sp = await searchParams
  const tournaments = await loadUserTournaments(userId)

  const tournamentId = redirectToDefaultTournamentIfInvalid({
    tab: "leagues",
    tournaments,
    requestedTournamentId: sp.tournament,
    preserveMatchFilter: sp.matchFilter,
  })

  const myLeagues = await getMyTournaments(userId)

  const initialChatMessages =
    tournaments.length > 0 && tournamentId
      ? ((await getTournamentChatMessagesForUser(userId, tournamentId)) ?? [])
      : []

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
          <MyLeaguesTab
            leagues={myLeagues}
            tournaments={tournaments}
            initialChatMessages={initialChatMessages}
            currentUserEmail={userEmail}
            inviteFromEmail={env.INVITE_FROM_EMAIL}
          />
        </DashboardTabs>
      </Suspense>
    </div>
  )
}
