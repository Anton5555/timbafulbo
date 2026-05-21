/** URL paths for each dashboard section (tabs as routes). */
export const DASHBOARD_SECTION_PATH = {
  matches: "/dashboard/matches",
  leaderboards: "/dashboard/leaderboards",
  leagues: "/dashboard/leagues",
  chat: "/dashboard/chat",
} as const

export type DashboardTab = keyof typeof DASHBOARD_SECTION_PATH

export const DASHBOARD_TAB_VALUES = [
  "matches",
  "leaderboards",
  "leagues",
  "chat",
] as const satisfies readonly DashboardTab[]

/** Maps legacy `?tab=` from `/dashboard` to the new segment path. */
export function parseLegacyDashboardTabQuery(
  tab: string | undefined
): DashboardTab {
  if (
    tab === "leaderboards" ||
    tab === "leagues" ||
    tab === "matches" ||
    tab === "chat"
  ) {
    return tab
  }
  return "matches"
}
