"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

/** Soft-refresh the dashboard RSC payload (leaderboards, new stages, scores). */
const REFRESH_INTERVAL_MS = 2 * 60_000
/** Refresh on focus only if the tab was hidden at least this long. */
const HIDDEN_REFRESH_THRESHOLD_MS = 60_000

/**
 * Count of in-progress prediction edits (pending debounce or save).
 * While > 0 the periodic refresh is skipped so a server re-render
 * doesn't clobber or visually jump mid-edit tickets.
 */
let activePredictionEdits = 0

export function beginPredictionEdit(): void {
  activePredictionEdits += 1
}

export function endPredictionEdit(): void {
  activePredictionEdits = Math.max(0, activePredictionEdits - 1)
}

export function hasActivePredictionEdits(): boolean {
  return activePredictionEdits > 0
}

/**
 * Keeps server-rendered dashboard data fresh without a full page reload:
 * `router.refresh()` re-runs the RSC tree and reconciles in place,
 * preserving client component state.
 */
export function usePeriodicRefresh(): void {
  const router = useRouter()
  const hiddenSinceRef = useRef<number | null>(null)
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    if (lastRefreshRef.current === 0) {
      lastRefreshRef.current = Date.now()
    }
    const refresh = () => {
      if (hasActivePredictionEdits()) return
      lastRefreshRef.current = Date.now()
      router.refresh()
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastRefreshRef.current < REFRESH_INTERVAL_MS - 1_000) {
        return
      }
      refresh()
    }, REFRESH_INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenSinceRef.current = Date.now()
        return
      }
      const hiddenSince = hiddenSinceRef.current
      hiddenSinceRef.current = null
      if (
        hiddenSince !== null &&
        Date.now() - hiddenSince >= HIDDEN_REFRESH_THRESHOLD_MS
      ) {
        refresh()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [router])
}
