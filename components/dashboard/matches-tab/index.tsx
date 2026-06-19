"use client"

import { useTranslations } from "next-intl"

import { MatchesTabShell } from "./matches-tab-shell"
import type { MatchesTabMatch } from "./types"

export type { MatchesTabMatch, MatchesTabTeam } from "./types"

export function MatchesTab({
  predictionsEnabled,
  tournaments,
  matches,
  currentUserEmail,
  inviteFromEmail,
}: {
  predictionsEnabled: boolean
  tournaments: { id: string; name: string }[]
  matches: MatchesTabMatch[]
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
  const t = useTranslations("matches")

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          {t("noMatchesLoaded")}
        </p>
      </div>
    )
  }

  return (
    <MatchesTabShell
      predictionsEnabled={predictionsEnabled}
      tournaments={tournaments}
      matches={matches}
      currentUserEmail={currentUserEmail}
      inviteFromEmail={inviteFromEmail}
    />
  )
}
