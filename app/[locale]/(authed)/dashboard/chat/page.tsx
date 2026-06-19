import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import {
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/[locale]/(authed)/dashboard/_lib/dashboard-page-context"
import { ChatTabSkeleton } from "@/components/dashboard/skeletons"
import { TournamentChatView } from "@/components/dashboard/tournament-chat/tournament-chat-view"
import { getTournamentChatMessagesForUser } from "@/lib/tournament-chat-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav")
  return { title: t("chat") }
}

export const dynamic = "force-dynamic"

async function ChatContent({
  tournament,
  matchFilter,
}: {
  tournament?: string
  matchFilter?: string
}) {
  const { userId } = await requireAuthenticatedDashboardUser()
  const tournaments = await loadUserTournaments(userId)

  const tournamentId = await redirectToDefaultTournamentIfInvalid({
    tab: "chat",
    tournaments,
    requestedTournamentId: tournament,
    preserveMatchFilter: matchFilter,
  })

  const initialChatMessages =
    tournaments.length > 0 && tournamentId
      ? ((await getTournamentChatMessagesForUser(userId, tournamentId)) ?? [])
      : []

  return (
    <TournamentChatView
      tournaments={tournaments}
      initialMessages={initialChatMessages}
      panelClassName="min-h-[min(70vh,32rem)]"
    />
  )
}

export default async function DashboardChatPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const sp = await searchParams

  return (
    <Suspense fallback={<ChatTabSkeleton />}>
      <ChatContent
        tournament={sp.tournament}
        matchFilter={sp.matchFilter}
      />
    </Suspense>
  )
}
