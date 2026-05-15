"use client"

import { PlusIcon } from "@phosphor-icons/react"
import { useQueryState } from "nuqs"

import { CreateTournamentTrigger } from "@/components/dashboard/create-tournament/create-tournament-trigger"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { dashboardTournamentParser } from "@/components/dashboard/tournament-search-params"
import { dashboardMatchFilterParser } from "@/components/dashboard/matches-tab/match-filter-search-params"
import { cn } from "@/lib/utils"

import {
  groupMatchesByLocalDay,
  groupMatchesByStage,
} from "./group-matches-by-day"
import { Accordion } from "@/components/ui/accordion"
import { MatchDaySection } from "./match-day-section"
import type { MatchesTabMatch } from "./types"

function filterMatches(
  matches: MatchesTabMatch[],
  filter: "all" | "pending" | "finished"
): MatchesTabMatch[] {
  if (filter === "all") return matches
  if (filter === "pending") {
    return matches.filter((m) => m.isFinal === false)
  }
  return matches.filter((m) => m.isFinal)
}

export function MatchesTabShell({
  predictionsEnabled,
  tournaments,
  matches,
  referenceTimeMs,
  currentUserEmail,
  inviteFromEmail,
}: {
  predictionsEnabled: boolean
  tournaments: { id: string; name: string }[]
  matches: MatchesTabMatch[]
  referenceTimeMs: number
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
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

  const activeFilter = predictionsEnabled ? (matchFilter ?? "pending") : "all"
  const filtered = filterMatches(matches, activeFilter)
  const grouped =
    activeFilter === "finished"
      ? groupMatchesByStage(filtered)
      : groupMatchesByLocalDay(filtered)
  const defaultOpenGroups = grouped.map((g) => g.key)

  const total = matches.length
  const completed = matches.filter((m) => m.userPrediction !== null).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/10 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 sm:px-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Próximos partidos
          </h2>
          {predictionsEnabled ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase shrink-0">
                Liga
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Select
                  value={tournamentId ?? ""}
                  onValueChange={(v) => {
                    void setTournamentId(v)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full min-w-0 max-w-md rounded-none border-border bg-background font-bold sm:w-72"
                  >
                    <SelectValue placeholder="Elegí una liga" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
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
                    aria-label="Crear torneo"
                    title="Crear torneo"
                  >
                    <PlusIcon className="size-4 text-primary" weight="bold" aria-hidden />
                  </Button>
                </CreateTournamentTrigger>
              </div>
              <p className="max-w-2xl text-[10px] font-bold leading-relaxed tracking-widest text-muted-foreground uppercase sm:basis-full">
                Cambiá el resultado y se guarda solo, incluso si queda 0-0.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Fixture del torneo
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
                  aria-label="Crear torneo"
                  title="Crear torneo"
                >
                  <PlusIcon className="size-4 text-primary" weight="bold" aria-hidden />
                </Button>
              </CreateTournamentTrigger>
            </div>
          )}
        </div>
        {predictionsEnabled ? (
          <p className="shrink-0 text-[10px] font-black tabular-nums tracking-widest text-foreground uppercase sm:text-xs">
            Completado: {completed}/{total}
          </p>
        ) : null}
      </div>

      {predictionsEnabled ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todos"],
              ["pending", "Pendientes"],
              ["finished", "Finalizados"],
            ] as const
          ).map(([key, label]) => {
            const active = (matchFilter ?? "pending") === key
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

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No hay partidos en esta vista.
          </p>
        </div>
      ) : (
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
              referenceTimeMs={referenceTimeMs}
              tournamentId={tournamentId ?? ""}
              predictionsEnabled={predictionsEnabled}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}
