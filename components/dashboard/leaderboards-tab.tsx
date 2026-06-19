"use client"

import { TrophyIcon } from "@phosphor-icons/react"
import { useQueryState } from "nuqs"
import { useTranslations } from "next-intl"

import { TournamentRulesSummary } from "@/components/dashboard/tournament-rules-summary"
import { dashboardTournamentParser } from "@/components/dashboard/tournament-search-params"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  LeaderboardRow,
  TournamentWinner,
} from "@/lib/dashboard-data"
import type { TournamentRules } from "@/lib/tournament-rules"

export function LeaderboardsTab({
  tournaments,
  leaderboardsByTournamentId,
  winnerByTournamentId,
  rulesByTournamentId,
  currentUserId,
}: {
  tournaments: { id: string; name: string }[]
  leaderboardsByTournamentId: Record<string, LeaderboardRow[]>
  winnerByTournamentId: Record<string, TournamentWinner>
  rulesByTournamentId: Record<string, TournamentRules>
  currentUserId: string
}) {
  const t = useTranslations("leaderboards")
  const tCommon = useTranslations("common")

  const [tournamentId, setTournamentId] = useQueryState(
    "tournament",
    dashboardTournamentParser.withOptions({
      shallow: false,
      history: "replace",
    })
  )

  const rows = tournamentId
    ? (leaderboardsByTournamentId[tournamentId] ?? [])
    : []

  const winnerData = tournamentId
    ? (winnerByTournamentId[tournamentId] ?? { isComplete: false, winners: [] })
    : { isComplete: false, winners: [] }

  const winnerBannerText =
    winnerData.isComplete && winnerData.winners.length > 0
      ? winnerData.winners.length === 1
        ? t("winnerSingle", {
            names: winnerData.winners[0]!.displayName,
            points: winnerData.winners[0]!.points,
          })
        : t("winnerTie", {
            names: winnerData.winners.map((w) => w.displayName).join(", "),
            points: winnerData.winners[0]!.points,
          })
      : null

  const winnerUserIds = new Set(
    winnerData.winners.map((w) => w.userId)
  )

  const selectedRules = tournamentId
    ? rulesByTournamentId[tournamentId]
    : undefined

  if (tournaments.length === 0) {
    return (
      <div className="border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {t("emptyNoTournaments")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("filterByTournament")}
        </span>
        <Select
          value={tournamentId ?? ""}
          onValueChange={(v) => {
            void setTournamentId(v)
          }}
        >
          <SelectTrigger size="sm" className="w-full min-w-0 sm:w-72">
            <SelectValue placeholder={tCommon("selectTournament")} />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((tournament) => (
              <SelectItem key={tournament.id} value={tournament.id}>
                {tournament.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRules ? (
        <TournamentRulesSummary rules={selectedRules} variant="banner" />
      ) : null}

      {winnerBannerText ? (
        <div
          className="flex items-start gap-3 border border-primary/40 bg-primary/10 px-4 py-3"
          role="status"
        >
          <TrophyIcon
            className="mt-0.5 size-5 shrink-0 text-primary"
            weight="duotone"
            aria-hidden
          />
          <p className="text-xs font-black tracking-wide uppercase">
            {winnerBannerText}
          </p>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="border border-border bg-muted/10 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("emptyNoPoints")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[280px] border-collapse text-left text-xs uppercase">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 font-bold tracking-widest text-muted-foreground sm:px-4">
                  #
                </th>
                <th className="px-3 py-2 font-bold tracking-widest text-muted-foreground sm:px-4">
                  {t("player")}
                </th>
                <th className="px-3 py-2 text-right font-bold tracking-widest text-muted-foreground sm:px-4">
                  {tCommon("pts")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isCurrentUser = row.userId === currentUserId
                const isWinner =
                  winnerData.isComplete && winnerUserIds.has(row.userId)

                return (
                <tr
                  key={row.userId}
                  className={
                    isCurrentUser
                      ? "border-b border-primary/50 bg-primary/10 hover:bg-primary/20"
                      : isWinner
                        ? "border-b border-border/80 bg-primary/15 hover:bg-primary/25"
                        : "border-b border-border/80 odd:bg-muted/15 hover:bg-muted/35"
                  }
                >
                  <td className="px-3 py-2.5 font-bold tabular-nums sm:px-4">
                    {index + 1}
                  </td>
                  <td className="max-w-48 truncate px-3 py-2.5 font-medium sm:max-w-none sm:px-4">
                    {row.displayName}
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-black tabular-nums text-primary sm:px-4 sm:text-lg">
                    {row.points}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
