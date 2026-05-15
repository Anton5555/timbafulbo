import { TeamEmblem } from "@/components/team-emblem"
import { STAGE_LABEL_ES } from "@/lib/match-stage-labels"

import type { MatchesTabMatch, MatchesTabTeam } from "./types"

const timeFmt = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function stageCenterLabel(match: MatchesTabMatch): string {
  if (match.stage === "GROUP") {
    return match.group ? `Grupo ${match.group}` : STAGE_LABEL_ES[match.stage]
  }
  return STAGE_LABEL_ES[match.stage]
}

function TicketSideNotches() {
  return (
    <>
      <div
        className="pointer-events-none absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full border-r border-border bg-background"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rounded-full border-l border-border bg-background"
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
}: {
  match: MatchesTabMatch
  start: Date
  isLive: boolean
  hasScore: boolean
}) {
  const stage = stageCenterLabel(match)
  const showPenaltiesResult =
    hasScore &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore === match.awayScore &&
    match.penaltyWinner !== null

  return (
    <div className="flex w-24 shrink-0 flex-col items-center justify-center border-x border-dashed border-border bg-muted/30 px-2 py-1 text-center sm:w-32">
      <span className="inline-block max-w-[min(100%,11rem)] truncate rounded-sm bg-primary/10 px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-primary sm:text-[10px]">
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
            Por penales:{" "}
            {match.penaltyWinner === "HOME" ? "Local" : "Visitante"}
          </span>
        ) : null}
      </div>

      {isLive ? (
        <span className="flex animate-pulse items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-destructive">
          <span className="size-1 shrink-0 rounded-full bg-destructive" />
          <span>En vivo</span>
        </span>
      ) : (
        <span
          className={`text-[9px] font-black uppercase tracking-tighter ${
            match.isFinal ? "text-muted-foreground/80" : "text-primary"
          }`}
        >
          {match.isFinal ? "Finalizado" : "Próximamente"}
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

  return (
    <article className="group relative flex items-stretch border border-border bg-card transition-all hover:border-primary/50">
      <TicketSideNotches />
      <MatchTicketTeamColumn team={match.homeTeam} paddingClass="pr-2 pl-5" />
      <MatchTicketCenter
        match={match}
        start={start}
        isLive={isLive}
        hasScore={hasScore}
      />
      <MatchTicketTeamColumn team={match.awayTeam} paddingClass="pr-5 pl-2" />
    </article>
  )
}
