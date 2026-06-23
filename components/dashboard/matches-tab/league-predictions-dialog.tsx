"use client"

import type { MatchStage } from "@/generated/prisma/client"
import { SoccerBallIcon, UsersIcon } from "@phosphor-icons/react"
import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import type { LeaguePredictionsResponse } from "@/app/[locale]/(authed)/dashboard/matches/predictions/route"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { isKnockoutStage } from "@/lib/knockout-stage"
import { cn } from "@/lib/utils"

import type { MatchesTabTeam } from "./types"

function outcomeLabel(
  kind: "exact" | "result" | "miss",
  t: ReturnType<typeof useTranslations<"matches">>,
): string {
  switch (kind) {
    case "exact":
      return t("outcomeExact")
    case "result":
      return t("outcomeResult")
    default:
      return t("outcomeMiss")
  }
}

export function LeaguePredictions({
  matchId,
  tournamentId,
  homeTeam,
  awayTeam,
  stage,
  isFinal,
}: {
  matchId: string
  tournamentId: string
  homeTeam: MatchesTabTeam
  awayTeam: MatchesTabTeam
  stage: MatchStage
  isFinal: boolean
}) {
  const t = useTranslations("matches")
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<LeaguePredictionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPredictions = useCallback(async () => {
    if (!tournamentId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("matchId", matchId)
      params.set("tournamentId", tournamentId)
      const res = await fetch(`/dashboard/matches/predictions?${params.toString()}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setError(body?.error ?? t("leaguePredictionsLoadError"))
        setData(null)
        return
      }
      const body = (await res.json()) as LeaguePredictionsResponse
      setData(body)
    } catch {
      setError(t("leaguePredictionsLoadError"))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [matchId, tournamentId, t])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setData(null)
        setError(null)
        setLoading(false)
      }
      setOpen(nextOpen)
    },
    [],
  )

  const openAndLoad = useCallback(() => {
    setOpen(true)
    void fetchPredictions()
  }, [fetchPredictions])

  const showScoring = isFinal && data?.isFinal

  return (
    <>
      <button
        type="button"
        onClick={openAndLoad}
        className={cn(
          "mt-2 flex w-full items-center justify-center gap-1.5 border border-dashed border-border bg-background/60 px-3 py-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase transition-colors",
          "hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
        )}
      >
        <UsersIcon className="size-3.5 shrink-0" weight="bold" aria-hidden />
        {t("seeLeaguePredictions")}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border bg-muted/20 px-4 py-4 pr-12">
            <DialogTitle className="text-xs font-black uppercase tracking-[0.18em]">
              {t("leaguePredictionsTitle")}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              {homeTeam.name} — {awayTeam.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-muted-foreground">
                <SoccerBallIcon
                  className="size-6 motion-safe:animate-spin"
                  weight="duotone"
                  aria-hidden
                />
                <p className="text-[10px] font-bold tracking-widest uppercase">
                  {t("leaguePredictionsLoading")}
                </p>
              </div>
            ) : error ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : data && data.rows.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("leaguePredictionsEmpty")}
                </p>
              </div>
            ) : data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-4">
                        {t("leaguePredictionsPlayer")}
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-4">
                        {t("leaguePredictionsPick")}
                      </th>
                      {showScoring ? (
                        <th className="px-3 py-2 text-right text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-4">
                          {t("points")}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => {
                      const isCurrentUser = row.userId === data.currentUserId
                      const hasPrediction = row.prediction !== null

                      return (
                        <tr
                          key={row.userId}
                          className={cn(
                            "border-b border-border/80",
                            isCurrentUser
                              ? "bg-primary/10"
                              : "odd:bg-muted/10",
                          )}
                        >
                          <td className="max-w-32 truncate px-3 py-2.5 font-medium sm:max-w-none sm:px-4">
                            <span className="flex items-center gap-1.5">
                              {isCurrentUser ? (
                                <span className="shrink-0 rounded-sm border border-primary/30 bg-primary/15 px-1 py-0.5 text-[8px] font-black tracking-wider text-primary uppercase">
                                  {t("leaguePredictionsYou")}
                                </span>
                              ) : null}
                              <span className="truncate">{row.displayName}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            {hasPrediction ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-black tabular-nums">
                                  {row.prediction!.homeScore} —{" "}
                                  {row.prediction!.awayScore}
                                </span>
                                {isKnockoutStage(stage) &&
                                row.prediction!.homeScore ===
                                  row.prediction!.awayScore &&
                                row.prediction!.penaltyWinner ? (
                                  <span className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                                    {t("penalties", {
                                      side:
                                        row.prediction!.penaltyWinner === "HOME"
                                          ? t("penaltiesHome")
                                          : t("penaltiesAway"),
                                    })}
                                  </span>
                                ) : null}
                                {showScoring && row.result ? (
                                  <span
                                    className={cn(
                                      "mt-0.5 w-fit rounded-sm border px-1 py-0.5 text-[8px] font-black tracking-wider uppercase",
                                      row.result.kind === "exact" &&
                                        "border-primary/30 bg-primary/15 text-primary",
                                      row.result.kind === "result" &&
                                        "border-primary/20 bg-background text-foreground",
                                      row.result.kind === "miss" &&
                                        "border-border bg-muted/40 text-muted-foreground",
                                    )}
                                  >
                                    {outcomeLabel(row.result.kind, t)}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                                {t("leaguePredictionsSleptIn")}
                              </span>
                            )}
                          </td>
                          {showScoring ? (
                            <td className="px-3 py-2.5 text-right sm:px-4">
                              {hasPrediction ? (
                                <div className="flex items-center justify-end gap-1">
                                  {row.result?.kind === "exact" ? (
                                    <SoccerBallIcon
                                      weight="fill"
                                      className="size-3.5 shrink-0 text-primary"
                                      aria-hidden
                                    />
                                  ) : null}
                                  <span
                                    className={cn(
                                      "text-base font-black tabular-nums",
                                      row.points && row.points > 0
                                        ? "text-primary"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    {row.points && row.points > 0
                                      ? `+${row.points}`
                                      : "0"}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-black tabular-nums text-muted-foreground">
                                  0
                                </span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
