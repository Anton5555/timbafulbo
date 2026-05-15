"use client"

import { useSyncExternalStore } from "react"

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onStoreChange)
      return () => mql.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Alineado al breakpoint `sm:` de Tailwind (mobile-first → drawer). */
export function useIsDesktopSm(): boolean {
  return useMediaQuery("(min-width: 640px)")
}
