import type { Metadata } from "next"
import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import {
  isMatchFilter,
  loadUserTournaments,
  redirectToDefaultTournamentIfInvalid,
  requireAuthenticatedDashboardUser,
} from "@/app/[locale]/(authed)/dashboard/_lib/dashboard-page-context"
import { MatchesTab, type MatchesTabMatch } from "@/components/dashboard/matches-tab"
import { MatchesTabSkeleton } from "@/components/dashboard/skeletons"
import { env } from "@/env"
import {
  getDashboardMatchesReadOnly,
  getDashboardMatchesWithPredictions,
} from "@/lib/dashboard-data"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { localizedRedirectFromRequest } from "@/lib/localized-redirect"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav")
  return { title: t("matches") }
}

export const dynamic = "force-dynamic"

async function MatchesContent({
  tournament,
  matchFilter,
}: {
  tournament?: string
  matchFilter?: string
}) {
  const { userId, userEmail } = await requireAuthenticatedDashboardUser()
  const locale = await getLocale()
  const tournaments = await loadUserTournaments(userId)

  const tournamentId = await redirectToDefaultTournamentIfInvalid({
    tab: "matches",
    tournaments,
    requestedTournamentId: tournament,
    preserveMatchFilter: matchFilter,
  })

  let serializedMatches: MatchesTabMatch[] = []

  if (tournaments.length > 0) {
    const withPred = await getDashboardMatchesWithPredictions(
      userId,
      tournamentId!,
      locale
    )
    if (withPred === null) {
      const qs = new URLSearchParams()
      qs.set("tournament", tournaments[0]!.id)
      if (isMatchFilter(matchFilter)) {
        qs.set("matchFilter", matchFilter)
      }
      await localizedRedirectFromRequest(
        `${DASHBOARD_SECTION_PATH.matches}?${qs.toString()}`
      )
    } else {
      serializedMatches = withPred.map((m) => ({
        ...m,
        startTime: m.startTime.toISOString(),
      }))
    }
  } else {
    const browse = await getDashboardMatchesReadOnly(locale)
    serializedMatches = browse.map((m) => ({
      ...m,
      startTime: m.startTime.toISOString(),
    }))
  }

  return (
    <MatchesTab
      predictionsEnabled={tournaments.length > 0}
      tournaments={tournaments}
      matches={serializedMatches}
      currentUserEmail={userEmail}
      inviteFromEmail={env.INVITE_FROM_EMAIL}
    />
  )
}

export default async function DashboardMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; matchFilter?: string }>
}) {
  const sp = await searchParams

  return (
    <Suspense fallback={<MatchesTabSkeleton />}>
      <MatchesContent
        tournament={sp.tournament}
        matchFilter={sp.matchFilter}
      />
    </Suspense>
  )
}
