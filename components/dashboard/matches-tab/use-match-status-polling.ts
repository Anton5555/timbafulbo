"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  isMatchLiveStatus,
  mergeMatchStatusIntoTabMatch,
  shouldPollMatchStatuses,
  type MatchStatusDto,
} from "@/lib/match-status"
import { getPredictionCloseTime } from "@/lib/prediction-window"

import type { MatchesTabMatch } from "./types"

/** Poll cadence while a match is live or about to lock. */
const POLL_INTERVAL_ACTIVE_MS = 30_000
/** Poll cadence when nothing is live (matches still pending). */
const POLL_INTERVAL_IDLE_MS = 180_000
/** Base tick used to re-evaluate which cadence applies. */
const POLL_TICK_MS = 30_000
/** Server route caps matchIds at 64 per request. */
const STATUS_BATCH_SIZE = 64
/** Window around the lock close where we keep the fast cadence. */
const NEAR_LOCK_MS = 5 * 60_000

type StatusResponse = {
  statuses: MatchStatusDto[]
  serverTimeMs: number
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/** Whether any match warrants the fast poll cadence right now. */
function hasActiveMatch(matches: MatchesTabMatch[], nowMs: number): boolean {
  for (const m of matches) {
    if (m.isFinal) continue
    if (isMatchLiveStatus(m.status)) return true
    const startMs = new Date(m.startTime).getTime()
    // Started but result not final yet (covers missing live status from the API).
    if (startMs <= nowMs) return true
    // Approaching the prediction lock: keep status fresh for the cutoff.
    const closeMs = getPredictionCloseTime(new Date(m.startTime)).getTime()
    if (nowMs >= closeMs - NEAR_LOCK_MS) return true
  }
  return false
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
  const lastFetchMsRef = useRef(0)
  /** serverTime − clientTime, so lock cutoffs use server-synced time. */
  const clockOffsetRef = useRef(0)
  /** Bumped by a timer at the exact lock-close instant to re-render closed tickets. */
  const [lockTick, setLockTick] = useState(0)

  const syncedNow = useCallback(
    () => Date.now() + clockOffsetRef.current,
    [],
  )

  const displayMatches = useMemo(() => {
    // lockTick re-runs this memo when a prediction window closes locally.
    void lockTick
    const nowMs = Date.now() + clockOffsetRef.current
    return matches.map((m) => {
      const status = pollOverlay.get(m.id)
      const merged = status ? mergeMatchStatusIntoTabMatch(m, status) : m
      if (!merged.predictionOpen || merged.isFinal) return merged
      // Enforce the cutoff locally between polls so the UI locks on time.
      const closeMs = getPredictionCloseTime(
        new Date(merged.startTime),
      ).getTime()
      if (nowMs >= closeMs) {
        return { ...merged, predictionOpen: false }
      }
      return merged
    })
  }, [matches, pollOverlay, lockTick])

  const fetchStatuses = useCallback(async () => {
    if (!enabled || matches.length === 0) return
    if (!shouldPollMatchStatuses(matches, Date.now())) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    lastFetchMsRef.current = Date.now()
    try {
      const batches = chunk(
        matches.map((m) => m.id),
        STATUS_BATCH_SIZE,
      )

      const responses = await Promise.all(
        batches.map(async (ids) => {
          const params = new URLSearchParams()
          params.set("matchIds", ids.join(","))
          if (predictionsEnabled && tournamentId) {
            params.set("tournamentId", tournamentId)
          }
          const res = await fetch(
            `/dashboard/matches/status?${params.toString()}`,
            { cache: "no-store" },
          )
          if (!res.ok) return null
          const body = (await res.json()) as StatusResponse
          return Array.isArray(body.statuses) ? body : null
        }),
      )

      const valid = responses.filter((r): r is StatusResponse => r !== null)
      if (valid.length === 0) return

      const serverTimeMs = valid[valid.length - 1]!.serverTimeMs
      if (typeof serverTimeMs === "number") {
        clockOffsetRef.current = serverTimeMs - Date.now()
        setReferenceTimeMs(serverTimeMs)
      } else {
        setReferenceTimeMs(Date.now())
      }

      setPollOverlay((prev) => {
        const next = new Map(prev)
        for (const body of valid) {
          for (const status of body.statuses) {
            next.set(status.id, status)
          }
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
      const nowMs = Date.now()
      const desiredInterval = hasActiveMatch(
        matches,
        nowMs + clockOffsetRef.current,
      )
        ? POLL_INTERVAL_ACTIVE_MS
        : POLL_INTERVAL_IDLE_MS
      // Small slack so a 30s tick satisfies a 30s cadence.
      if (nowMs - lastFetchMsRef.current < desiredInterval - 1_000) return
      void fetchStatuses()
    }, POLL_TICK_MS)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.clearInterval(interval)
    }
  }, [enabled, fetchStatuses, matches])

  // Schedule a state bump at the next lock-close instant so open tickets
  // flip to "Predicciones cerradas" exactly on time, without waiting for a poll.
  useEffect(() => {
    const nowMs = syncedNow()
    let nextCloseMs = Number.POSITIVE_INFINITY
    for (const m of displayMatches) {
      if (!m.predictionOpen || m.isFinal) continue
      const closeMs = getPredictionCloseTime(new Date(m.startTime)).getTime()
      if (closeMs > nowMs && closeMs < nextCloseMs) {
        nextCloseMs = closeMs
      }
    }
    if (!Number.isFinite(nextCloseMs)) return

    const timer = window.setTimeout(() => {
      setReferenceTimeMs(syncedNow())
      setLockTick((t) => t + 1)
    }, nextCloseMs - nowMs + 250)

    return () => window.clearTimeout(timer)
  }, [displayMatches, syncedNow])

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
