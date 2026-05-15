"use client"

import type { PenaltyWinnerSide } from "@/generated/prisma/client"
import { SoccerBallIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react"

import { upsertPrediction } from "@/app/(authed)/dashboard/prediction-actions"
import { Button } from "@/components/ui/button"
import { TeamEmblem } from "@/components/team-emblem"
import { isKnockoutStage } from "@/lib/knockout-stage"
import { STAGE_LABEL_ES } from "@/lib/match-stage-labels"
import { cn } from "@/lib/utils"

import type { MatchesTabMatch, MatchesTabTeam } from "./types"

/** Long enough to set local + visitante (and penalties) without mid-edit saves. */
const DEBOUNCE_MS = 2000
const SCORE_MIN = 0
const SCORE_MAX = 30

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

/** Penalties only in KO + draw in the predicted scoreline. */
function effectivePenaltyForPersist(
  stage: MatchesTabMatch["stage"],
  home: number,
  away: number,
  pick: PenaltyWinnerSide | null,
): PenaltyWinnerSide | null {
  if (!isKnockoutStage(stage)) return null
  if (home !== away) return null
  return pick
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
  dimmed,
}: {
  team: MatchesTabTeam
  paddingClass: string
  dimmed?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center py-2 transition-opacity",
        paddingClass,
        dimmed && "opacity-40 grayscale-[0.45]",
      )}
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
          <span className="text-xl font-black tabular-nums tracking-tighter text-foreground sm:text-2xl">
            {match.homeScore} — {match.awayScore}
          </span>
        ) : (
          <span className="font-mono text-sm font-bold tabular-nums text-foreground/90 sm:text-base">
            {match.isFinal ? "— · —" : timeFmt.format(start)}
          </span>
        )}
        {showPenaltiesResult ? (
          <span className="max-w-44 text-[8px] font-bold leading-tight tracking-wide text-muted-foreground uppercase">
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

function ScoreStepper({
  value,
  isGhosted,
  onChange,
  disabled,
  label,
}: {
  value: number
  isGhosted: boolean
  onChange: (n: number) => void
  disabled: boolean
  label: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 transition-opacity",
        isGhosted && "opacity-40 hover:opacity-100 focus-within:opacity-100",
      )}
      aria-label={label}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className="shrink-0 rounded-none border-border"
        disabled={disabled || value <= SCORE_MIN}
        onClick={() => onChange(Math.max(SCORE_MIN, value - 1))}
        aria-label={`Quitar uno a ${label}`}
      >
        −
      </Button>
      <span
        className={cn(
          "min-w-6 text-center font-black tabular-nums sm:min-w-8 sm:text-lg",
          isGhosted ? "text-muted-foreground/60" : "text-foreground",
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className="shrink-0 rounded-none border-border"
        disabled={disabled || value >= SCORE_MAX}
        onClick={() => onChange(Math.min(SCORE_MAX, value + 1))}
        aria-label={`Sumar uno a ${label}`}
      >
        +
      </Button>
    </div>
  )
}

function liquidationOutcomeLabel(kind: "exact" | "result" | "miss"): string {
  switch (kind) {
    case "exact":
      return "Pleno"
    case "result":
      return "Acierto"
    default:
      return "Errado"
  }
}

export function MatchPredictionTicket({
  match,
  tournamentId,
  referenceTimeMs,
  predictionsEnabled,
}: {
  match: MatchesTabMatch
  tournamentId: string
  referenceTimeMs: number
  predictionsEnabled: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [home, setHome] = useState(() => match.userPrediction?.homeScore ?? 0)
  const [away, setAway] = useState(() => match.userPrediction?.awayScore ?? 0)
  const [penaltyWinner, setPenaltyWinner] = useState<
    PenaltyWinnerSide | null
  >(() => match.userPrediction?.penaltyWinner ?? null)
  const [isTouched, setIsTouched] = useState(
    () => match.userPrediction !== null,
  )
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const lastPersisted = useRef<{
    home: number
    away: number
    penalty: PenaltyWinnerSide | null
  } | null>(
    match.userPrediction
      ? {
          home: match.userPrediction.homeScore,
          away: match.userPrediction.awayScore,
          penalty: match.userPrediction.penaltyWinner ?? null,
        }
      : null,
  )

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveGeneration = useRef(0)
  const isTouchedRef = useRef(match.userPrediction !== null)

  function markTouched() {
    if (isTouchedRef.current) return
    isTouchedRef.current = true
    setIsTouched(true)
  }

  function isPredictionDirty(
    nextHome: number,
    nextAway: number,
    nextPenalty: PenaltyWinnerSide | null,
    touched: boolean,
  ) {
    const baseline = lastPersisted.current
    return baseline === null
      ? touched
      : baseline.home !== nextHome ||
          baseline.away !== nextAway ||
          baseline.penalty !== nextPenalty
  }

  async function persistScores(
    nextHome: number,
    nextAway: number,
    nextPenaltyPick: PenaltyWinnerSide | null,
  ) {
    if (!predictionsEnabled) return
    const eff = effectivePenaltyForPersist(
      match.stage,
      nextHome,
      nextAway,
      nextPenaltyPick,
    )
    if (
      isKnockoutStage(match.stage) &&
      nextHome === nextAway &&
      eff === null
    ) {
      return
    }

    const dirty = isPredictionDirty(
      nextHome,
      nextAway,
      eff,
      isTouchedRef.current,
    )

    if (!dirty) return
    if (!match.predictionOpen) return

    const myGen = ++saveGeneration.current
    setSaveState("saving")
    setErrorMsg(null)

    const res = await upsertPrediction({
      tournamentId,
      matchId: match.id,
      homeScore: nextHome,
      awayScore: nextAway,
      penaltyWinner: eff,
    })

    if (myGen !== saveGeneration.current) return

    if (res.ok) {
      lastPersisted.current = {
        home: res.homeScore,
        away: res.awayScore,
        penalty: res.penaltyWinner,
      }
      setSaveState("idle")
      startTransition(() => {
        router.refresh()
      })
    } else {
      setSaveState("error")
      setErrorMsg(res.error)
    }
  }

  function schedulePersist(
    nextHome: number,
    nextAway: number,
    nextPenaltyPick: PenaltyWinnerSide | null,
  ) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null
      void persistScores(nextHome, nextAway, nextPenaltyPick)
    }, DEBOUNCE_MS)
  }

  function onScoresChange(nextHome: number, nextAway: number) {
    markTouched()

    const koDraw = isKnockoutStage(match.stage) && nextHome === nextAway
    const pickForSchedule = koDraw ? penaltyWinner : null

    setHome(nextHome)
    setAway(nextAway)
    if (!koDraw) {
      setPenaltyWinner(null)
    }

    if (!match.predictionOpen) return

    const eff = effectivePenaltyForPersist(
      match.stage,
      nextHome,
      nextAway,
      pickForSchedule,
    )
    const dirty = isPredictionDirty(nextHome, nextAway, eff, true)
    if (!dirty) return
    schedulePersist(nextHome, nextAway, pickForSchedule)
  }

  function onPenaltyPick(side: PenaltyWinnerSide) {
    markTouched()

    setPenaltyWinner(side)
    if (!match.predictionOpen) return
    const eff = effectivePenaltyForPersist(match.stage, home, away, side)
    const dirty = isPredictionDirty(home, away, eff, true)
    if (!dirty) return
    schedulePersist(home, away, side)
  }

  const latestFlush = useRef({
    home: 0,
    away: 0,
    penaltyWinner: null as PenaltyWinnerSide | null,
    stage: match.stage,
    tournamentId: "",
    matchId: "",
    open: false,
    touched: match.userPrediction !== null,
  })

  useLayoutEffect(() => {
    latestFlush.current = {
      home,
      away,
      penaltyWinner,
      stage: match.stage,
      tournamentId,
      matchId: match.id,
      open: match.predictionOpen,
      touched: isTouchedRef.current,
    }
  }, [
    away,
    home,
    penaltyWinner,
    match.id,
    match.predictionOpen,
    match.stage,
    tournamentId,
  ])

  const predictionsEnabledRef = useRef(predictionsEnabled)
  useEffect(() => {
    predictionsEnabledRef.current = predictionsEnabled
  }, [predictionsEnabled])

  useEffect(() => {
    return () => {
      if (!predictionsEnabledRef.current) return
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
      const L = latestFlush.current
      if (!L.open) return
      const eff = effectivePenaltyForPersist(
        L.stage,
        L.home,
        L.away,
        L.penaltyWinner,
      )
      if (isKnockoutStage(L.stage) && L.home === L.away && eff === null) {
        return
      }
      const b = lastPersisted.current
      const dirty =
        b === null
          ? L.touched
          : b.home !== L.home || b.away !== L.away || b.penalty !== eff
      if (!dirty) return
      void upsertPrediction({
        tournamentId: L.tournamentId,
        matchId: L.matchId,
        homeScore: L.home,
        awayScore: L.away,
        penaltyWinner: eff,
      })
    }
  }, [match.id, tournamentId])

  const start = new Date(match.startTime)
  const isLive = !match.isFinal && start.getTime() <= referenceTimeMs
  const hasScore =
    match.isFinal &&
    match.homeScore !== null &&
    match.awayScore !== null

  const scoreDraw =
    hasScore &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore === match.awayScore

  const homeDimmed =
    match.isFinal &&
    hasScore &&
    !scoreDraw &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore < match.awayScore

  const awayDimmed =
    match.isFinal &&
    hasScore &&
    !scoreDraw &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.awayScore < match.homeScore

  const showLiquidation = !match.predictionOpen && hasScore
  const liquidationResult = match.userPredictionResult

  const saving = saveState === "saving" || isPending
  const showPenaltyPick =
    isKnockoutStage(match.stage) && home === away && match.predictionOpen
  const showIncompletePenaltyPick =
    showPenaltyPick && isTouched && penaltyWinner === null

  return (
    <article
      className={cn(
        "group relative flex flex-col border border-border bg-card transition-all",
        predictionsEnabled && match.predictionOpen && "hover:border-primary/50",
        saveState === "error" && "border-destructive/60",
        showLiquidation &&
          liquidationResult?.kind === "exact" &&
          "ring-1 ring-primary/30 border-primary/40",
      )}
      aria-busy={saving}
    >
      <TicketSideNotches />
      <div className="flex items-stretch">
        <MatchTicketTeamColumn
          team={match.homeTeam}
          paddingClass="pr-2 pl-5"
          dimmed={homeDimmed}
        />
        <MatchTicketCenter
          match={match}
          start={start}
          isLive={isLive}
          hasScore={hasScore}
        />
        <MatchTicketTeamColumn
          team={match.awayTeam}
          paddingClass="pr-5 pl-2"
          dimmed={awayDimmed}
        />
      </div>

      {predictionsEnabled ? (
        <div className="border-t border-dashed border-border bg-muted/20 px-3 py-1.5 sm:px-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase sm:text-[10px]">
              {showLiquidation ? "Liquidación" : "Tu pronóstico"}
            </span>
            {saving ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary">
                <SoccerBallIcon
                  className="size-4 shrink-0 text-primary motion-safe:animate-spin"
                  weight="duotone"
                  aria-hidden
                />
                <span className="sr-only">Guardando pronóstico</span>
                <span aria-hidden>Guardando…</span>
              </span>
            ) : null}
          </div>

          {match.predictionOpen ? (
            <>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                <ScoreStepper
                  value={home}
                  isGhosted={!isTouched}
                  disabled={saving}
                  label="goles local"
                  onChange={(n) => onScoresChange(n, away)}
                />
                <span className="font-black text-muted-foreground">—</span>
                <ScoreStepper
                  value={away}
                  isGhosted={!isTouched}
                  disabled={saving}
                  label="goles visitante"
                  onChange={(n) => onScoresChange(home, n)}
                />
              </div>
              {showPenaltyPick ? (
                <div
                  className={cn(
                    "mt-3 flex flex-col items-center gap-2 border-t border-dashed pt-3 transition-colors",
                    showIncompletePenaltyPick
                      ? "border-amber-500/50"
                      : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "text-center text-[9px] font-bold tracking-widest uppercase",
                      showIncompletePenaltyPick
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-muted-foreground",
                    )}
                  >
                    Ganador por penales
                  </span>
                  <div
                    className={cn(
                      "flex w-full max-w-md flex-wrap justify-center gap-2",
                      showIncompletePenaltyPick &&
                        "rounded-sm bg-amber-500/10 p-1 ring-1 ring-amber-500/30",
                    )}
                  >
                    <Button
                      type="button"
                      variant={
                        penaltyWinner === "HOME" ? "default" : "outline"
                      }
                      size="sm"
                      className={cn(
                        "min-w-0 flex-1 rounded-none font-bold uppercase tracking-wide",
                        showIncompletePenaltyPick &&
                          penaltyWinner !== "HOME" &&
                          "border-amber-500/50 text-amber-700 dark:text-amber-300",
                      )}
                      disabled={saving}
                      onClick={() => onPenaltyPick("HOME")}
                      aria-pressed={penaltyWinner === "HOME"}
                      aria-label={`Ganador por penales: local (${match.homeTeam.name})`}
                    >
                      <span className="truncate">{match.homeTeam.name}</span>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        penaltyWinner === "AWAY" ? "default" : "outline"
                      }
                      size="sm"
                      className={cn(
                        "min-w-0 flex-1 rounded-none font-bold uppercase tracking-wide",
                        showIncompletePenaltyPick &&
                          penaltyWinner !== "AWAY" &&
                          "border-amber-500/50 text-amber-700 dark:text-amber-300",
                      )}
                      disabled={saving}
                      onClick={() => onPenaltyPick("AWAY")}
                      aria-pressed={penaltyWinner === "AWAY"}
                      aria-label={`Ganador por penales: visitante (${match.awayTeam.name})`}
                    >
                      <span className="truncate">{match.awayTeam.name}</span>
                    </Button>
                  </div>
                  {isKnockoutStage(match.stage) &&
                  home === away &&
                  penaltyWinner === null ? (
                    <p
                      className={cn(
                        "text-center text-[9px] font-medium",
                        showIncompletePenaltyPick
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-muted-foreground",
                      )}
                    >
                      Elegí quién pasa para guardar el pronóstico.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : showLiquidation ? (
            <>
              <div
                className={cn(
                  "mt-2 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                  liquidationResult === null &&
                    "border-border bg-muted/25 text-muted-foreground",
                  liquidationResult?.kind === "exact" &&
                    "border-primary/30 bg-primary/10 text-foreground shadow-sm shadow-primary/5",
                  liquidationResult?.kind === "result" &&
                    "border-primary/15 bg-primary/5 text-foreground",
                  liquidationResult?.kind === "miss" &&
                    "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    Tu jugada
                  </span>
                  {match.userPrediction ? (
                    <>
                      <p className="text-lg font-black tabular-nums text-foreground sm:text-xl">
                        {match.userPrediction.homeScore} —{" "}
                        {match.userPrediction.awayScore}
                      </p>
                      {isKnockoutStage(match.stage) &&
                      match.userPrediction.homeScore ===
                        match.userPrediction.awayScore &&
                      match.userPrediction.penaltyWinner ? (
                        <p className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                          Por penales:{" "}
                          {match.userPrediction.penaltyWinner === "HOME"
                            ? "Local"
                            : "Visitante"}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm font-black leading-tight text-foreground">
                      Te dormiste: 0 pts
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    Puntos
                  </span>
                  <div className="flex items-center gap-1.5">
                    {liquidationResult?.kind === "exact" ? (
                      <SoccerBallIcon
                        weight="fill"
                        className="size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        "text-xl font-black tabular-nums sm:text-2xl",
                        liquidationResult &&
                          liquidationResult.points > 0 &&
                          "text-primary",
                        (!liquidationResult || liquidationResult.points === 0) &&
                          "text-muted-foreground",
                      )}
                    >
                      {liquidationResult && liquidationResult.points > 0
                        ? `+${liquidationResult.points}`
                        : "0"}
                    </span>
                  </div>
                  {liquidationResult ? (
                    <span
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                        liquidationResult.kind === "exact" &&
                          "border-primary/30 bg-primary/15 text-primary",
                        liquidationResult.kind === "result" &&
                          "border-primary/20 bg-background/80 text-foreground",
                        liquidationResult.kind === "miss" &&
                          "border-border bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {liquidationOutcomeLabel(liquidationResult.kind)}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Predicciones cerradas
              </p>
            </>
          ) : (
            <div className="mt-2 text-center">
              {match.userPrediction ? (
                <>
                  <p className="font-black tabular-nums text-lg text-foreground sm:text-xl">
                    {match.userPrediction.homeScore} —{" "}
                    {match.userPrediction.awayScore}
                  </p>
                  {isKnockoutStage(match.stage) &&
                  match.userPrediction.homeScore ===
                    match.userPrediction.awayScore &&
                  match.userPrediction.penaltyWinner ? (
                    <p className="mt-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                      Por penales:{" "}
                      {match.userPrediction.penaltyWinner === "HOME"
                        ? "Local"
                        : "Visitante"}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs font-bold text-muted-foreground">
                  Sin jugada aún
                </p>
              )}
              <p className="mt-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Predicciones cerradas
              </p>
            </div>
          )}

          {saveState === "error" && errorMsg ? (
            <p className="mt-2 text-center text-[10px] font-medium text-destructive">
              {errorMsg}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
