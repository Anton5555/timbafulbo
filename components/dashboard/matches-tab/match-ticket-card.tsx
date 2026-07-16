"use client"

import { InfoIcon, TrophyIcon } from "@phosphor-icons/react"
import { useTranslations } from "next-intl"

import { TeamEmblem } from "@/components/team-emblem"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMatchLabels } from "@/hooks/use-match-labels"
import { cn } from "@/lib/utils"

import type { MatchesTabMatch, MatchesTabTeam } from "./types"

const RESULT_DELAY_MS = 2 * 60 * 60 * 1000

function TicketSideNotches() {
  return (
    <>
      <div
        className="pointer-events-none absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full border-r border-border bg-background"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-3 size-3 -translate-y-1/2 rounded-full border-l border-border bg-background"
        aria-hidden
      />
    </>
  )
}

function MatchTicketTeamColumn({
  team,
  paddingClass,
}: {
  team: MatchesTabTeam
  paddingClass: string
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center py-2 ${paddingClass}`}
    >
      <TeamEmblem name={team.name} code={team.code} size="sm" />
      <span
        className="mt-2 w-full min-w-0 truncate text-center text-[10px] font-bold uppercase tracking-tighter sm:text-xs"
        title={team.name}
      >
        {team.name}
      </span>
    </div>
  )
}

function MatchTicketCenter({
  match,
  start,
  isLive,
  hasScore,
  resultDelayed,
}: {
  match: MatchesTabMatch
  start: Date
  isLive: boolean
  hasScore: boolean
  resultDelayed: boolean
}) {
  const t = useTranslations("matches")
  const { stageLabel, timeFmt } = useMatchLabels()

  const stage = stageLabel(match.stage, match.group)
  const showPenaltiesResult =
    hasScore &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore === match.awayScore &&
    match.penaltyWinner !== null

  const penaltySide =
    match.penaltyWinner === "HOME"
      ? t("penaltiesHome")
      : t("penaltiesAway")

  return (
    <div className="flex w-24 shrink-0 flex-col items-center justify-center border-x border-dashed border-border bg-muted/30 px-2 py-1 text-center sm:w-32">
      <span
        className={cn(
          "inline-flex items-center gap-1 max-w-[min(100%,11rem)] truncate rounded-sm px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider sm:text-[10px]",
          match.stage === "FINAL"
            ? "bg-amber-500/15 text-amber-400"
            : "bg-primary/10 text-primary",
        )}
      >
        {match.stage === "FINAL" && (
          <TrophyIcon className="size-2.5 shrink-0" weight="duotone" />
        )}
        {stage}
      </span>

      <div className="my-1.5 flex flex-col items-center justify-center gap-0.5">
        {hasScore ? (
          <span className="text-lg font-black tabular-nums tracking-tighter text-foreground sm:text-xl">
            {match.homeScore} — {match.awayScore}
          </span>
        ) : (
          <span className="font-mono text-sm font-bold tabular-nums text-foreground/90 sm:text-base">
            {match.isFinal ? "— · —" : timeFmt.format(start)}
          </span>
        )}
        {showPenaltiesResult ? (
          <span className="max-w-[11rem] text-[8px] font-bold leading-tight tracking-wide text-muted-foreground uppercase">
            {t("penalties", { side: penaltySide })}
          </span>
        ) : null}
      </div>

      {isLive ? (
        <span className="flex animate-pulse items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-destructive">
          <span className="size-1 shrink-0 rounded-full bg-destructive" />
          <span>{t("status.live")}</span>
          {resultDelayed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={t("resultDelayAria")}
                >
                  <InfoIcon className="size-3" weight="bold" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56 text-center">
                {t("resultDelayTooltip")}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
      ) : (
        <span
          className={`text-[9px] font-black uppercase tracking-tighter ${
            match.isFinal ? "text-muted-foreground/80" : "text-primary"
          }`}
        >
          {match.isFinal ? t("status.finished") : t("status.upcoming")}
        </span>
      )}
    </div>
  )
}

export function MatchTicketCard({
  match,
  referenceTimeMs,
}: {
  match: MatchesTabMatch
  referenceTimeMs: number
}) {
  const start = new Date(match.startTime)
  const isLive = !match.isFinal && start.getTime() <= referenceTimeMs
  const hasScore =
    match.isFinal &&
    match.homeScore !== null &&
    match.awayScore !== null
  const resultDelayed =
    isLive &&
    !hasScore &&
    referenceTimeMs - start.getTime() >= RESULT_DELAY_MS

  return (
    <article
      className={cn(
        "group relative flex items-stretch border bg-card transition-all hover:border-primary/50",
        match.stage === "FINAL"
          ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20 hover:border-amber-400/60"
          : "border-border",
      )}
    >
      <TicketSideNotches />
      <MatchTicketTeamColumn team={match.homeTeam} paddingClass="pr-2 pl-5" />
      <MatchTicketCenter
        match={match}
        start={start}
        isLive={isLive}
        hasScore={hasScore}
        resultDelayed={resultDelayed}
      />
      <MatchTicketTeamColumn team={match.awayTeam} paddingClass="pr-5 pl-2" />
    </article>
  )
}
