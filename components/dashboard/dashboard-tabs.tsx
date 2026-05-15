"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { tabsListVariants } from "@/components/ui/tabs"
import {
  DASHBOARD_SECTION_PATH,
  type DashboardTab,
} from "@/lib/dashboard-routes"
import { cn } from "@/lib/utils"

const tabTriggerClass =
  "shrink-0 rounded-none border-0 px-3 py-2 text-[10px] font-bold tracking-widest uppercase sm:px-4 sm:text-xs data-active:after:opacity-100"

function usePreservedQueryString() {
  const searchParams = useSearchParams()
  return useMemo(() => {
    const q = new URLSearchParams(searchParams.toString())
    q.delete("tab")
    const s = q.toString()
    return s ? `?${s}` : ""
  }, [searchParams])
}

export function DashboardTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const preserved = usePreservedQueryString()

  function hrefFor(tab: DashboardTab): string {
    return `${DASHBOARD_SECTION_PATH[tab]}${preserved}`
  }

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Pestañas del panel principal"
        className={cn(
          tabsListVariants({ variant: "line" }),
          "mb-1 flex h-auto w-full min-w-0 max-w-full flex-nowrap justify-start gap-0 overflow-x-auto overflow-y-clip border-b border-border bg-transparent px-0 pt-0 pb-2 sm:gap-1"
        )}
      >
        <Link
          role="tab"
          href={hrefFor("matches")}
          className={cn(
            tabTriggerClass,
            "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
            "bg-transparent after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:inset-x-0 after:bottom-[-5px] after:h-0.5",
            pathname === DASHBOARD_SECTION_PATH.matches &&
              "text-foreground after:opacity-100"
          )}
          aria-current={
            pathname === DASHBOARD_SECTION_PATH.matches ? "page" : undefined
          }
        >
          Partidos
        </Link>
        <Link
          role="tab"
          href={hrefFor("leaderboards")}
          className={cn(
            tabTriggerClass,
            "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
            "bg-transparent after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:inset-x-0 after:bottom-[-5px] after:h-0.5",
            pathname === DASHBOARD_SECTION_PATH.leaderboards &&
              "text-foreground after:opacity-100"
          )}
          aria-current={
            pathname === DASHBOARD_SECTION_PATH.leaderboards
              ? "page"
              : undefined
          }
        >
          Clasificaciones
        </Link>
        <Link
          role="tab"
          href={hrefFor("leagues")}
          className={cn(
            tabTriggerClass,
            "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
            "bg-transparent after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:inset-x-0 after:bottom-[-5px] after:h-0.5",
            pathname === DASHBOARD_SECTION_PATH.leagues &&
              "text-foreground after:opacity-100"
          )}
          aria-current={
            pathname === DASHBOARD_SECTION_PATH.leagues ? "page" : undefined
          }
        >
          Mis ligas
        </Link>
      </nav>

      <div className="mt-0 text-sm">{children}</div>
    </div>
  )
}
