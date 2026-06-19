import { headers } from "next/headers"

import { getTournamentsForUser } from "@/lib/dashboard-data"
import { DASHBOARD_SECTION_PATH, type DashboardTab } from "@/lib/dashboard-routes"
import { auth } from "@/lib/auth"
import { localizedRedirectFromRequest } from "@/lib/localized-redirect"

export function isMatchFilter(
  v: string | undefined
): v is "pending" | "finished" {
  return v === "pending" || v === "finished"
}

export async function requireAuthenticatedDashboardUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    await localizedRedirectFromRequest("/")
  }

  const user = session!.user

  return {
    userId: user.id,
    userEmail: user.email ?? null,
  }
}

export async function loadUserTournaments(userId: string) {
  return getTournamentsForUser(userId)
}

/**
 * When the user belongs to at least one tournament, `tournament` query must
 * point at a valid id; otherwise redirect to the default (first) tournament.
 */
export async function redirectToDefaultTournamentIfInvalid(options: {
  tab: DashboardTab
  tournaments: { id: string; name: string }[]
  requestedTournamentId: string | undefined
  preserveMatchFilter?: string
}): Promise<string | undefined> {
  const { tab, tournaments, requestedTournamentId, preserveMatchFilter } =
    options
  const base = DASHBOARD_SECTION_PATH[tab]
  if (tournaments.length === 0) {
    return requestedTournamentId
  }
  const valid =
    requestedTournamentId !== undefined &&
    tournaments.some((t) => t.id === requestedTournamentId)
  if (valid) {
    return requestedTournamentId
  }
  const qs = new URLSearchParams()
  qs.set("tournament", tournaments[0]!.id)
  if (isMatchFilter(preserveMatchFilter)) {
    qs.set("matchFilter", preserveMatchFilter)
  }
  await localizedRedirectFromRequest(`${base}?${qs.toString()}`)
}
