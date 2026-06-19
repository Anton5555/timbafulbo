"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"

import { useNavigationPending } from "@/components/dashboard/navigation-pending-context"
import { usePathname } from "@/i18n/routing"

function NavigationPendingResetInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { resetNavigation } = useNavigationPending()
  const routeKey = `${pathname}?${searchParams.toString()}`

  useEffect(() => {
    resetNavigation()
  }, [routeKey, resetNavigation])

  return null
}

export function NavigationPendingReset() {
  return (
    <Suspense fallback={null}>
      <NavigationPendingResetInner />
    </Suspense>
  )
}
