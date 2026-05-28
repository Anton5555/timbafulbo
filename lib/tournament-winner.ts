export type LeaderboardStanding = {
  userId: string
  displayName: string
  points: number
}

/** All leaderboard rows tied for first place (empty if no rows). */
export function pickWinnersFromLeaderboard(
  rows: LeaderboardStanding[]
): LeaderboardStanding[] {
  if (rows.length === 0) return []

  const topPoints = rows[0].points
  return rows.filter((row) => row.points === topPoints)
}
