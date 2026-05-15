import { redirect } from "next/navigation"

import { isMatchFilter } from "@/app/(authed)/dashboard/_lib/dashboard-page-context"
import {
  DASHBOARD_SECTION_PATH,
  parseLegacyDashboardTabQuery,
} from "@/lib/dashboard-routes"

export const dynamic = "force-dynamic"

/** Legacy `/dashboard` + optional `?tab=`; canonical URLs live under `/dashboard/{section}`. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    tournament?: string
    matchFilter?: string
  }>
}) {
  const sp = await searchParams
  const section = parseLegacyDashboardTabQuery(sp.tab)
  const base = DASHBOARD_SECTION_PATH[section]

  const qs = new URLSearchParams()
  if (sp.tournament) {
    qs.set("tournament", sp.tournament)
  }
  if (isMatchFilter(sp.matchFilter)) {
    qs.set("matchFilter", sp.matchFilter)
  }

  const tail = qs.toString()
  redirect(tail ? `${base}?${tail}` : base)
}
