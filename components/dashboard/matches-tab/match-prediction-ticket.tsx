"use client"

import type { PenaltyWinnerSide } from "@/generated/prisma/client"
import { InfoIcon, SoccerBallIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react"

import { upsertPrediction } from "@/app/(authed)/dashboard/prediction-actions"
import {
  beginPredictionEdit,
  endPredictionEdit,
} from "@/components/dashboard/use-periodic-refresh"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TeamEmblem } from "@/components/team-emblem"
import { isKnockoutStage } from "@/lib/knockout-stage"
import { isMatchLiveStatus } from "@/lib/match-status"
import { STAGE_LABEL_ES } from "@/lib/match-stage-labels"
import {
  getPredictionCloseTime,
  PREDICTION_LOCK_MINUTES_BEFORE,
} from "@/lib/prediction-window"
import { cn } from "@/lib/utils"

import type { MatchesTabMatch, MatchesTabTeam } from "./types"

/** Long enough to set local + visitante (and penalties) without mid-edit saves. */
const DEBOUNCE_MS = 2000
const RESULT_DELAY_MS = 2 * 60 * 60 * 1000
const SCORE_MIN = 0
const SCORE_MAX = 30

const predictionCloseTimeFmt = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function clampScore(n: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, n))
}

function isCompleteScorePair(
  home: number | null,
  away: number | null,
): boolean {
  return (
    home !== null &&
    away !== null &&
    Number.isInteger(home) &&
    Number.isInteger(away) &&
    home >= SCORE_MIN &&
    home <= SCORE_MAX &&
    away >= SCORE_MIN &&
    away <= SCORE_MAX
  )
}

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
  resultDelayed,
}: {
  match: MatchesTabMatch
  start: Date
  isLive: boolean
  hasScore: boolean
  resultDelayed: boolean
}) {
  const stage = stageCenterLabel(match)
  const showPenaltiesResult =
    match.isFinal &&
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
          {resultDelayed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Información sobre demora de resultados"
                >
                  <InfoIcon className="size-3" weight="bold" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56 text-center">
                Los resultados pueden tardar en llegar debido a restricciones de
                la API. ¡Paciencia!
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
          {match.isFinal ? "Finalizado" : "Próximamente"}
        </span>
      )}
    </div>
  )
}

function ScoreStepper({
  value,
  isGhosted,
  onStep,
  onArm,
  disabled,
  label,
}: {
  value: number | null
  isGhosted: boolean
  onStep: (delta: -1 | 1) => void
  onArm: () => void
  disabled: boolean
  label: string
}) {
  const minusDisabled =
    disabled || (value !== null && value <= SCORE_MIN)
  const plusDisabled =
    disabled || (value !== null && value >= SCORE_MAX)

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
        disabled={minusDisabled}
        onClick={() => onStep(-1)}
        aria-label={`Quitar uno a ${label}`}
      >
        −
      </Button>
      {value === null ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onArm}
          className={cn(
            "min-w-6 text-center font-black tabular-nums underline decoration-dashed decoration-muted-foreground/50 underline-offset-4 transition-colors sm:min-w-8 sm:text-lg",
            "text-muted-foreground/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
          )}
          aria-label={`Empezar tu pronóstico en 0 (${label})`}
        >
          —
        </button>
      ) : (
        <span
          className={cn(
            "min-w-6 text-center font-black tabular-nums sm:min-w-8 sm:text-lg",
            isGhosted ? "text-muted-foreground/60" : "text-foreground",
          )}
        >
          {value}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className="shrink-0 rounded-none border-border"
        disabled={plusDisabled}
        onClick={() => onStep(1)}
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
  applyToAllTournaments,
}: {
  match: MatchesTabMatch
  tournamentId: string
  referenceTimeMs: number
  predictionsEnabled: boolean
  applyToAllTournaments: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [home, setHome] = useState<number | null>(
    () => match.userPrediction?.homeScore ?? null,
  )
  const [away, setAway] = useState<number | null>(
    () => match.userPrediction?.awayScore ?? null,
  )
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
  /** Server rejected a save because the window closed; lock the ticket now. */
  const [forceClosed, setForceClosed] = useState(false)

  const predictionOpen = match.predictionOpen && !forceClosed

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
    if (!isCompleteScorePair(nextHome, nextAway)) return
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
    if (!predictionOpen) return

    const myGen = ++saveGeneration.current
    setSaveState("saving")
    setErrorMsg(null)

    beginPredictionEdit()
    let res: Awaited<ReturnType<typeof upsertPrediction>>
    try {
      res = await upsertPrediction({
        tournamentId,
        matchId: match.id,
        homeScore: nextHome,
        awayScore: nextAway,
        penaltyWinner: eff,
        applyToAllTournaments,
      })
    } finally {
      endPredictionEdit()
    }

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
    } else if (res.code === "prediction-closed") {
      // The window closed under a stale UI: lock the ticket immediately.
      setForceClosed(true)
      setSaveState("idle")
      setErrorMsg(null)
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
    if (!isCompleteScorePair(nextHome, nextAway)) return
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    } else {
      beginPredictionEdit()
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null
      endPredictionEdit()
      void persistScores(nextHome, nextAway, nextPenaltyPick)
    }, DEBOUNCE_MS)
  }

  function applyScoreStep(side: "home" | "away", delta: -1 | 1) {
    markTouched()

    let nextHome = home
    let nextAway = away

    if (nextHome === null && nextAway === null) {
      nextHome = 0
      nextAway = 0
      if (side === "home") {
        nextHome = clampScore(nextHome + delta)
      } else {
        nextAway = clampScore(nextAway + delta)
      }
    } else if (nextHome !== null && nextAway !== null) {
      if (side === "home") {
        nextHome = clampScore(nextHome + delta)
      } else {
        nextAway = clampScore(nextAway + delta)
      }
    } else {
      return
    }

    commitScoresChange(nextHome, nextAway)
  }

  function armScores() {
    if (!predictionOpen) return
    markTouched()
    commitScoresChange(0, 0)
  }

  function commitScoresChange(nextHome: number, nextAway: number) {
    if (!isCompleteScorePair(nextHome, nextAway)) return

    const koDraw = isKnockoutStage(match.stage) && nextHome === nextAway
    const pickForSchedule = koDraw ? penaltyWinner : null

    setHome(nextHome)
    setAway(nextAway)
    if (!koDraw) {
      setPenaltyWinner(null)
    }

    if (!predictionOpen) return

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

    if (home === null || away === null) return

    setPenaltyWinner(side)
    if (!predictionOpen) return
    const eff = effectivePenaltyForPersist(match.stage, home, away, side)
    const dirty = isPredictionDirty(home, away, eff, true)
    if (!dirty) return
    schedulePersist(home, away, side)
  }

  const latestFlush = useRef({
    home: null as number | null,
    away: null as number | null,
    penaltyWinner: null as PenaltyWinnerSide | null,
    stage: match.stage,
    tournamentId: "",
    matchId: "",
    open: false,
    touched: match.userPrediction !== null,
    applyToAllTournaments,
  })

  useLayoutEffect(() => {
    latestFlush.current = {
      home,
      away,
      penaltyWinner,
      stage: match.stage,
      tournamentId,
      matchId: match.id,
      open: predictionOpen,
      touched: isTouchedRef.current,
      applyToAllTournaments,
    }
  }, [
    away,
    home,
    penaltyWinner,
    match.id,
    predictionOpen,
    match.stage,
    tournamentId,
    applyToAllTournaments,
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
        endPredictionEdit()
      }
      const L = latestFlush.current
      if (!L.open) return
      if (L.home === null || L.away === null) return
      const flushHome = L.home
      const flushAway = L.away
      const eff = effectivePenaltyForPersist(
        L.stage,
        flushHome,
        flushAway,
        L.penaltyWinner,
      )
      if (isKnockoutStage(L.stage) && flushHome === flushAway && eff === null) {
        return
      }
      const b = lastPersisted.current
      const dirty =
        b === null
          ? L.touched
          : b.home !== flushHome ||
            b.away !== flushAway ||
            b.penalty !== eff
      if (!dirty) return
      void upsertPrediction({
        tournamentId: L.tournamentId,
        matchId: L.matchId,
        homeScore: flushHome,
        awayScore: flushAway,
        penaltyWinner: eff,
        applyToAllTournaments: L.applyToAllTournaments,
      })
    }
  }, [match.id, tournamentId, applyToAllTournaments])

  const start = new Date(match.startTime)
  const predictionCloseTime = getPredictionCloseTime(start)
  const predictionCloseTimeLabel = predictionCloseTimeFmt.format(
    predictionCloseTime,
  )
  const isLive =
    match.status != null
      ? isMatchLiveStatus(match.status)
      : !match.isFinal && start.getTime() <= referenceTimeMs
  const hasScoresPresent =
    match.homeScore !== null && match.awayScore !== null
  const hasScore = hasScoresPresent && (match.isFinal || isLive)
  const hasFinalScore = match.isFinal && hasScoresPresent
  const resultDelayed =
    isLive &&
    !hasScoresPresent &&
    referenceTimeMs - start.getTime() >= RESULT_DELAY_MS

  const scoreDraw =
    hasFinalScore &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore === match.awayScore

  const homeDimmed =
    match.isFinal &&
    hasFinalScore &&
    !scoreDraw &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore < match.awayScore

  const awayDimmed =
    match.isFinal &&
    hasFinalScore &&
    !scoreDraw &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.awayScore < match.homeScore

  const showLiquidation = !predictionOpen && hasFinalScore
  const liquidationResult = match.userPredictionResult

  const saving = saveState === "saving" || isPending
  const scoresComplete = isCompleteScorePair(home, away)
  const showPenaltyPick =
    scoresComplete &&
    isKnockoutStage(match.stage) &&
    home === away &&
    predictionOpen
  const showIncompletePenaltyPick =
    showPenaltyPick && isTouched && penaltyWinner === null

  return (
    <article
      className={cn(
        "group relative flex flex-col border border-border bg-card transition-all",
        predictionsEnabled && predictionOpen && "hover:border-primary/50",
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
          resultDelayed={resultDelayed}
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
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {predictionOpen ? (
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase sm:text-[10px]">
                  Cierra {predictionCloseTimeLabel}
                </span>
              ) : null}
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
          </div>

          {predictionOpen ? (
            <>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                <ScoreStepper
                  value={home}
                  isGhosted={!isTouched}
                  disabled={saving}
                  label="goles local"
                  onStep={(delta) => applyScoreStep("home", delta)}
                  onArm={armScores}
                />
                <span className="font-black text-muted-foreground">—</span>
                <ScoreStepper
                  value={away}
                  isGhosted={!isTouched}
                  disabled={saving}
                  label="goles visitante"
                  onStep={(delta) => applyScoreStep("away", delta)}
                  onArm={armScores}
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
                {!isLive && !match.isFinal
                  ? `Pronósticos cerrados (${PREDICTION_LOCK_MINUTES_BEFORE} min antes del partido)`
                  : "Predicciones cerradas"}
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
