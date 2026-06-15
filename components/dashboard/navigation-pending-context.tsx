"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type NavigationPendingContextValue = {
  isNavigating: boolean
  setLinkPending: (pending: boolean) => void
  resetNavigation: () => void
}

const NavigationPendingContext =
  createContext<NavigationPendingContextValue | null>(null)

export function NavigationPendingProvider({
  children,
}: {
  children: ReactNode
}) {
  const [pendingCount, setPendingCount] = useState(0)

  const setLinkPending = useCallback((pending: boolean) => {
    setPendingCount((count) => {
      if (pending) {
        return count + 1
      }
      return Math.max(0, count - 1)
    })
  }, [])

  const resetNavigation = useCallback(() => {
    setPendingCount(0)
  }, [])

  const value = useMemo(
    () => ({
      isNavigating: pendingCount > 0,
      setLinkPending,
      resetNavigation,
    }),
    [pendingCount, setLinkPending, resetNavigation]
  )

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  )
}

export function useNavigationPending() {
  const ctx = useContext(NavigationPendingContext)
  if (!ctx) {
    throw new Error(
      "useNavigationPending must be used within NavigationPendingProvider"
    )
  }
  return ctx
}
