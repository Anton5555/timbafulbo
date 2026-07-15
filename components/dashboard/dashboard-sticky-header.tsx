"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  BookBookmarkIcon,
  SignOut,
  TrophyIcon,
} from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"

import { LanguageSwitcher } from "@/components/language-switcher"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link, usePathname } from "@/i18n/routing"
import { authClient } from "@/lib/auth-client"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { cn } from "@/lib/utils"

export type DashboardStickyHeaderUser = {
  name: string | null
  email: string | null
  image: string | null
}

function initialsFromUser(user: DashboardStickyHeaderUser): string {
  const raw = (user.name ?? user.email ?? "?").trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
  }
  return raw.slice(0, 2).toUpperCase()
}

function DashboardPrimaryNav({
  leaderboardsActive,
  reglasActive,
  tournamentId,
}: {
  leaderboardsActive: boolean
  reglasActive: boolean
  tournamentId: string | null
}) {
  const t = useTranslations("nav")

  const leaderboardsHref =
    tournamentId && tournamentId.length > 0
      ? `${DASHBOARD_SECTION_PATH.leaderboards}?tournament=${encodeURIComponent(tournamentId)}`
      : DASHBOARD_SECTION_PATH.leaderboards

  return (
    <nav
      className="flex min-w-0 shrink items-center gap-0 border-r border-border pr-2 sm:gap-1 sm:pr-4"
      aria-label={t("dashboardSectionsAria")}
    >
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 justify-start px-2 font-bold tracking-[0.15em] uppercase sm:px-2.5"
        asChild
      >
        <Link
          href={leaderboardsHref}
          aria-current={leaderboardsActive ? "page" : undefined}
          className={cn(
            "inline-flex h-7 items-center justify-start gap-1.5 py-0 text-[10px] leading-none sm:text-xs [&>svg]:block",
            leaderboardsActive
              ? "text-foreground"
              : "text-foreground/90 hover:text-foreground"
          )}
        >
          <TrophyIcon
            className="size-4 shrink-0 self-center text-primary"
            weight="duotone"
            aria-hidden
          />
          <span className="hidden leading-none sm:inline">{t("leaderboards")}</span>
          <span className="sr-only leading-none sm:hidden">{t("leaderboards")}</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 justify-start px-2 font-bold tracking-[0.15em] uppercase sm:px-2.5"
        asChild
      >
        <Link
          href="/reglas"
          aria-current={reglasActive ? "page" : undefined}
          className={cn(
            "inline-flex h-7 items-center justify-start gap-1.5 py-0 text-[10px] leading-none sm:text-xs [&>svg]:block",
            reglasActive
              ? "text-foreground"
              : "text-foreground/90 hover:text-foreground"
          )}
        >
          <BookBookmarkIcon
            className="size-4 shrink-0 self-center"
            aria-hidden
          />
          <span className="hidden leading-none sm:inline">{t("rules")}</span>
          <span className="sr-only leading-none sm:hidden">{t("rules")}</span>
        </Link>
      </Button>
    </nav>
  )
}

function DashboardPrimaryNavWithSearchParams() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const leaderboardsActive = pathname === DASHBOARD_SECTION_PATH.leaderboards
  const reglasActive = pathname === "/reglas"
  const tournamentId = searchParams.get("tournament")
  return (
    <DashboardPrimaryNav
      leaderboardsActive={leaderboardsActive}
      reglasActive={reglasActive}
      tournamentId={tournamentId}
    />
  )
}

export function DashboardStickyHeader({
  user,
}: {
  user: DashboardStickyHeaderUser
}) {
  const t = useTranslations("account")
  const locale = useLocale()
  const [signingOut, setSigningOut] = useState(false)

  const accountTitle = user.name?.trim() || user.email?.trim() || t("myAccount")
  const accountSubtitle = user.email ?? undefined

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await authClient.signOut()
    } finally {
      window.location.href = `/${locale}`
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="flex min-w-0 shrink-0 flex-col leading-none"
        >
          <span className="text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase sm:text-[10px]">
            timba
          </span>
          <span className="text-base font-black tracking-tighter uppercase italic text-primary sm:text-lg">
            fulbo
          </span>
        </Link>

        <div className="flex min-w-0 shrink flex-row-reverse items-center gap-2 sm:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0 rounded-full border-2 border-primary/20 bg-muted p-0"
                aria-label={t("accountMenuAria")}
              >
                <Avatar size="default" className="size-full border-0 ring-0 after:border-0">
                  {user.image ? (
                    <AvatarImage
                      src={user.image}
                      alt={user.name ?? user.email ?? t("userFallback")}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px] font-bold uppercase">
                    {initialsFromUser(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-mono">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-foreground">
                  {accountTitle}
                </span>
                {accountSubtitle ? (
                  <span className="block truncate text-[10px] font-normal tracking-wide text-muted-foreground normal-case">
                    {accountSubtitle}
                  </span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <LanguageSwitcher />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                disabled={signingOut}
                onSelect={() => {
                  void handleSignOut()
                }}
              >
                <SignOut aria-hidden />
                {signingOut ? t("signingOut") : t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Suspense
            fallback={
              <DashboardPrimaryNav
                leaderboardsActive={false}
                reglasActive={false}
                tournamentId={null}
              />
            }
          >
            <DashboardPrimaryNavWithSearchParams />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
