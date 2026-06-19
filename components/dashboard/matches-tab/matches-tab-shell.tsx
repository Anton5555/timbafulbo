"use client"

import { PlusIcon } from "@phosphor-icons/react"
import { useQueryState } from "nuqs"
import { useState } from "react"
import { useTranslations } from "next-intl"

import { CreateTournamentTrigger } from "@/components/dashboard/create-tournament/create-tournament-trigger"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { dashboardTournamentParser } from "@/components/dashboard/tournament-search-params"
import { dashboardMatchFilterParser } from "@/components/dashboard/matches-tab/match-filter-search-params"
import { useMatchLabels } from "@/hooks/use-match-labels"
import { cn } from "@/lib/utils"

import {
  groupMatchesByLocalDay,
  groupMatchesByStage,
} from "./group-matches-by-day"
import { Accordion } from "@/components/ui/accordion"
import { MatchDaySection } from "./match-day-section"
import type { MatchesTabMatch } from "./types"
import {
  matchStatusPollingResetKey,
  useMatchStatusPolling,
} from "./use-match-status-polling"

function filterMatches(
  matches: MatchesTabMatch[],
  filter: "pending" | "finished"
): MatchesTabMatch[] {
  if (filter === "pending") {
    return matches.filter((m) => m.isFinal === false)
  }
  return matches.filter((m) => m.isFinal)
}

function MatchesTabMatchList({
  matches,
  activeFilter,
  predictionsEnabled,
  tournamentId,
  applyToAllTournaments,
}: {
  matches: MatchesTabMatch[]
  activeFilter: "pending" | "finished"
  predictionsEnabled: boolean
  tournamentId: string
  applyToAllTournaments: boolean
}) {
  const { dateHeadingFmt, stageLabel } = useMatchLabels()
  const t = useTranslations("matches")

  const { displayMatches, referenceTimeMs } = useMatchStatusPolling({
    matches,
    tournamentId,
    predictionsEnabled,
  })

  const filtered = predictionsEnabled
    ? filterMatches(displayMatches, activeFilter)
    : displayMatches
  const grouped =
    predictionsEnabled && activeFilter === "finished"
      ? groupMatchesByStage(filtered, (stage) => stageLabel(stage))
      : groupMatchesByLocalDay(filtered, dateHeadingFmt)
  const defaultOpenGroups = grouped.map((g) => g.key)

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {t("noMatchesInView")}
        </p>
      </div>
    )
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpenGroups}
      className="flex flex-col gap-3"
    >
      {grouped.map(({ key, label, matches: groupMatches }) => (
        <MatchDaySection
          key={key}
          groupKey={key}
          headingLabel={label}
          matches={groupMatches}
          allMatches={displayMatches}
          referenceTimeMs={referenceTimeMs}
          tournamentId={tournamentId}
          predictionsEnabled={predictionsEnabled}
          applyToAllTournaments={applyToAllTournaments}
        />
      ))}
    </Accordion>
  )
}

export function MatchesTabShell({
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
  const tCommon = useTranslations("common")

  const [tournamentId, setTournamentId] = useQueryState(
    "tournament",
    dashboardTournamentParser.withOptions({
      shallow: false,
      history: "replace",
    })
  )

  const [matchFilter, setMatchFilter] = useQueryState(
    "matchFilter",
    dashboardMatchFilterParser
  )

  const [applyToAllTournaments, setApplyToAllTournaments] = useState(true)

  const activeFilter = matchFilter ?? "pending"
  const canBulkSave =
    predictionsEnabled && activeFilter === "pending" && tournaments.length > 1
  const effectiveApplyToAllTournaments = canBulkSave && applyToAllTournaments
  const showTournamentScopedProgress =
    predictionsEnabled && !effectiveApplyToAllTournaments

  const total = matches.length
  const completed = matches.filter((m) => m.userPrediction !== null).length
  const pollingKey = matchStatusPollingResetKey(matches)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/10 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h2 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
              {t("yourPredictions")}
            </h2>
            {predictionsEnabled ? (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["pending", t("pending")],
                    ["finished", t("finished")],
                  ] as const
                ).map(([key, label]) => {
                  const active = activeFilter === key
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-none text-[10px] font-bold tracking-widest uppercase",
                        active && "ring-1 ring-primary/30"
                      )}
                      onClick={() => {
                        void setMatchFilter(key)
                      }}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            ) : null}
          </div>
          {showTournamentScopedProgress ? (
            <p className="shrink-0 text-[10px] font-black tracking-widest text-foreground uppercase tabular-nums sm:text-xs">
              {t("completed", { completed, total })}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          {predictionsEnabled ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {canBulkSave ? (
                <div className="flex w-full max-w-md min-w-0 flex-col gap-2 rounded-md border border-border/60 bg-background/50 px-3 py-2 sm:max-w-xl">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="apply-all-tournaments"
                      size="sm"
                      checked={applyToAllTournaments}
                      onCheckedChange={setApplyToAllTournaments}
                    />
                    <Label
                      htmlFor="apply-all-tournaments"
                      className="cursor-pointer text-[10px] font-bold tracking-widest uppercase"
                    >
                      {t("saveToAllLeagues")}
                    </Label>
                  </div>
                  <p className="text-[9px] leading-snug font-medium tracking-wide text-muted-foreground">
                    {t("saveToAllLeaguesHint")}
                  </p>
                </div>
              ) : null}
              {!effectiveApplyToAllTournaments ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    {tCommon("league")}
                  </span>
                  <div className="flex w-full max-w-md min-w-0 items-center gap-2 sm:w-auto">
                    <Select
                      value={tournamentId ?? ""}
                      onValueChange={(v) => {
                        void setTournamentId(v)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="min-w-0 flex-1 rounded-none border-border bg-background font-bold sm:w-72"
                      >
                        <SelectValue placeholder={tCommon("selectLeague")} />
                      </SelectTrigger>
                      <SelectContent>
                        {tournaments.map((tournament) => (
                          <SelectItem key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <CreateTournamentTrigger
                      currentUserEmail={currentUserEmail}
                      inviteFromEmail={inviteFromEmail}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0 rounded-none border-dashed border-primary/40"
                        aria-label={tCommon("createTournament")}
                        title={tCommon("createTournament")}
                      >
                        <PlusIcon
                          className="text-primary"
                          weight="bold"
                          aria-hidden
                        />
                      </Button>
                    </CreateTournamentTrigger>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                {t("tournamentFixture")}
              </p>
              <CreateTournamentTrigger
                currentUserEmail={currentUserEmail}
                inviteFromEmail={inviteFromEmail}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 rounded-none border-dashed border-primary/40"
                  aria-label={tCommon("createTournament")}
                  title={tCommon("createTournament")}
                >
                  <PlusIcon
                    className="text-primary"
                    weight="bold"
                    aria-hidden
                  />
                </Button>
              </CreateTournamentTrigger>
            </div>
          )}
        </div>
      </div>

      {predictionsEnabled ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] leading-relaxed font-bold tracking-widest text-muted-foreground uppercase">
            {t("autoSaveHint")}
          </p>
        </div>
      ) : null}

      <MatchesTabMatchList
        key={pollingKey}
        matches={matches}
        activeFilter={activeFilter}
        predictionsEnabled={predictionsEnabled}
        tournamentId={tournamentId ?? ""}
        applyToAllTournaments={effectiveApplyToAllTournaments}
      />
    </div>
  )
}
