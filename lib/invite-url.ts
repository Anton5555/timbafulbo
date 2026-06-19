import { getPathname, routing } from "@/i18n/routing"

type AppLocale = (typeof routing.locales)[number]

/** Public join path for a league (invite code, e.g. `TMB-XXXX`). */
export function buildTournamentInvitePath(
  inviteCode: string,
  locale: AppLocale = routing.defaultLocale
): string {
  const code = inviteCode.replace(/\s+/g, "").toUpperCase()
  return getPathname({
    locale,
    href: `/join/${encodeURIComponent(code)}`,
  })
}
