import { Suspense } from "react"

import {
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { TournamentChatView } from "@/components/dashboard/tournament-chat/tournament-chat-view"
import { getTournamentChatMessagesForUser } from "@/lib/tournament-chat-data"

export const dynamic = "force-dynamic"

export default async function DashboardChatPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const { userId } = await requireAuthenticatedDashboardUser()
  const sp = await searchParams
  const tournaments = await loadUserTournaments(userId)

  const tournamentId = redirectToDefaultTournamentIfInvalid({
    tab: "chat",
    tournaments,
    requestedTournamentId: sp.tournament,
    preserveMatchFilter: sp.matchFilter,
  })

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
          <TournamentChatView
            tournaments={tournaments}
            initialMessages={initialChatMessages}
            panelClassName="min-h-[min(70vh,32rem)]"
          />
        </DashboardTabs>
      </Suspense>
    </div>
  )
}
