/** Public join path for a league (invite code, e.g. `TMB-XXXX`). */
export function buildTournamentInvitePath(inviteCode: string): string {
  const code = inviteCode.replace(/\s+/g, "").toUpperCase()
  return `/join/${encodeURIComponent(code)}`
}
