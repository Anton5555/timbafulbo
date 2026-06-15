"use client"

import { useNavigationPending } from "@/components/dashboard/navigation-pending-context"
import { cn } from "@/lib/utils"

export function RouteProgressBar() {
  const { isNavigating } = useNavigationPending()

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden transition-opacity duration-150",
        isNavigating ? "opacity-100" : "opacity-0"
      )}
      aria-hidden
    >
      <div
        className={cn(
          "dashboard-route-progress h-full w-1/3 bg-primary shadow-[0_0_10px_oklch(0.55_0.12_150/0.55)]",
          isNavigating &&
            "animate-[dashboard-route-progress_0.9s_ease-in-out_infinite]"
        )}
      />
    </div>
  )
}
