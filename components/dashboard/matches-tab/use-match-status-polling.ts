"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  mergeMatchStatusIntoTabMatch,
  shouldPollMatchStatuses,
  type MatchStatusDto,
} from "@/lib/match-status"

import type { MatchesTabMatch } from "./types"

const POLL_INTERVAL_MS = 30_000

type StatusResponse = {
  statuses: MatchStatusDto[]
  serverTimeMs: number
}

export function useMatchStatusPolling({
  matches,
  tournamentId,
  predictionsEnabled,
  enabled = true,
}: {
  matches: MatchesTabMatch[]
  tournamentId: string
  predictionsEnabled: boolean
  enabled?: boolean
}): {
  displayMatches: MatchesTabMatch[]
  referenceTimeMs: number
} {
  const [pollOverlay, setPollOverlay] = useState<Map<string, MatchStatusDto>>(
    () => new Map(),
  )
  const [referenceTimeMs, setReferenceTimeMs] = useState(() => Date.now())
  const inFlightRef = useRef(false)

  const displayMatches = useMemo(() => {
    return matches.map((m) => {
      const status = pollOverlay.get(m.id)
      return status ? mergeMatchStatusIntoTabMatch(m, status) : m
    })
  }, [matches, pollOverlay])

  const fetchStatuses = useCallback(async () => {
    if (!enabled || matches.length === 0) return
    if (!shouldPollMatchStatuses(matches, Date.now())) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    try {
      const params = new URLSearchParams()
      params.set("matchIds", matches.map((m) => m.id).join(","))
      if (predictionsEnabled && tournamentId) {
        params.set("tournamentId", tournamentId)
      }

      const res = await fetch(
        `/dashboard/matches/status?${params.toString()}`,
        { cache: "no-store" },
      )
      if (!res.ok) return

      const body = (await res.json()) as StatusResponse
      if (!Array.isArray(body.statuses)) return

      setReferenceTimeMs(body.serverTimeMs ?? Date.now())
      setPollOverlay((prev) => {
        const next = new Map(prev)
        for (const status of body.statuses) {
          next.set(status.id, status)
        }
        return next
      })
    } finally {
      inFlightRef.current = false
    }
  }, [enabled, matches, predictionsEnabled, tournamentId])

  useEffect(() => {
    if (!enabled) return

    void fetchStatuses()

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchStatuses()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      void fetchStatuses()
    }, POLL_INTERVAL_MS)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.clearInterval(interval)
    }
  }, [enabled, fetchStatuses])

  return { displayMatches, referenceTimeMs }
}

/** Key to remount polling when server-provided match rows change materially. */
export function matchStatusPollingResetKey(
  matches: MatchesTabMatch[],
): string {
  return matches
    .map(
      (m) =>
        `${m.id}:${m.isFinal}:${m.homeScore ?? ""}:${m.awayScore ?? ""}:${m.predictionOpen}:${m.userPrediction?.homeScore ?? ""}:${m.userPrediction?.awayScore ?? ""}`,
    )
    .join("|")
}
