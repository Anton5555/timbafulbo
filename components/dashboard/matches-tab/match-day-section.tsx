"use client"

import { useTranslations } from "next-intl"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

import { MatchPredictionTicket } from "./match-prediction-ticket"
import type { MatchesTabMatch } from "./types"

export function MatchDaySection({
  groupKey,
  headingLabel,
  matches,
  allMatches,
  referenceTimeMs,
  tournamentId,
  predictionsEnabled,
  applyToAllTournaments,
}: {
  groupKey: string
  headingLabel: string
  matches: MatchesTabMatch[]
  allMatches: MatchesTabMatch[]
  referenceTimeMs: number
  tournamentId: string
  predictionsEnabled: boolean
  applyToAllTournaments: boolean
}) {
  const t = useTranslations("matches")

  const matchCountLabel =
    matches.length === 1
      ? t("oneMatch")
      : t("matchCount", { count: matches.length })

  return (
    <AccordionItem
      value={groupKey}
      className="border border-border bg-card/50 not-last:border-b-0"
    >
      <AccordionTrigger
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5",
          "border-0 border-b border-transparent bg-muted/20",
          "transition-colors hover:bg-muted/40 hover:no-underline",
          "data-[state=open]:border-primary/25 data-[state=open]:bg-primary/5",
          "focus-visible:ring-1 focus-visible:ring-primary/40",
          "[&>svg]:ml-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-primary",
        )}
      >
        <span
          className="h-5 w-0.5 shrink-0 bg-primary transition-opacity group-data-[state=closed]/accordion-trigger:opacity-40"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left text-xs font-black uppercase tracking-[0.18em] text-foreground">
          {headingLabel}
        </span>
        <span className="shrink-0 rounded-sm border border-border bg-background px-2.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase tabular-nums">
          {matchCountLabel}
        </span>
      </AccordionTrigger>

      <AccordionContent className="border-t border-border/60 bg-background/40 pb-4 pt-4">
        <div className="grid grid-cols-1 items-start gap-3 px-3 lg:grid-cols-2">
          {matches.map((match) => (
            <MatchPredictionTicket
              key={`${tournamentId}-${match.id}`}
              match={match}
              allMatches={allMatches}
              tournamentId={tournamentId}
              referenceTimeMs={referenceTimeMs}
              predictionsEnabled={predictionsEnabled}
              applyToAllTournaments={applyToAllTournaments}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
