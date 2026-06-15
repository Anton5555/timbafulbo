"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useMemo } from "react"

import { DashboardTabLink } from "@/components/dashboard/dashboard-tab-link"
import { tabsListVariants } from "@/components/ui/tabs"
import {
  DASHBOARD_SECTION_PATH,
  type DashboardTab,
} from "@/lib/dashboard-routes"
import { cn } from "@/lib/utils"

const tabTriggerClass =
  "shrink-0 rounded-none border-0 px-3 py-2 text-[10px] font-bold tracking-widest uppercase sm:px-4 sm:text-xs data-active:after:opacity-100"

const TAB_ITEMS: { tab: DashboardTab; label: string; mobileOnly?: boolean }[] =
  [
    { tab: "matches", label: "Partidos" },
    { tab: "leaderboards", label: "Clasificaciones" },
    { tab: "leagues", label: "Mis ligas" },
    { tab: "chat", label: "Chat", mobileOnly: true },
  ]

function DashboardTabsNav({
  preservedQuery,
}: {
  preservedQuery: string
}) {
  const pathname = usePathname()

  function hrefFor(tab: DashboardTab): string {
    return `${DASHBOARD_SECTION_PATH[tab]}${preservedQuery}`
  }

  return (
    <nav
      aria-label="Pestañas del panel principal"
      className={cn(
        tabsListVariants({ variant: "line" }),
        "mb-1 flex h-auto w-full min-w-0 max-w-full flex-nowrap justify-start gap-0 overflow-x-auto overflow-y-clip border-b border-border bg-transparent px-0 pt-0 pb-2 sm:gap-1"
      )}
    >
      {TAB_ITEMS.map(({ tab, label, mobileOnly }) => {
        const active = pathname === DASHBOARD_SECTION_PATH[tab]
        return (
          <DashboardTabLink
            key={tab}
            href={hrefFor(tab)}
            active={active}
            className={cn(
              tabTriggerClass,
              "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
              "bg-transparent after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:inset-x-0 after:-bottom-2 after:h-0.5",
              active && "text-foreground after:opacity-100",
              mobileOnly && "sm:hidden"
            )}
          >
            {label}
          </DashboardTabLink>
        )
      })}
    </nav>
  )
}

function DashboardTabsNavWithSearchParams() {
  const searchParams = useSearchParams()
  const preservedQuery = useMemo(() => {
    const q = new URLSearchParams(searchParams.toString())
    q.delete("tab")
    const s = q.toString()
    return s ? `?${s}` : ""
  }, [searchParams])

  return <DashboardTabsNav preservedQuery={preservedQuery} />
}

function DashboardTabsNavFallback() {
  return <DashboardTabsNav preservedQuery="" />
}

export function DashboardTabs({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<DashboardTabsNavFallback />}>
        <DashboardTabsNavWithSearchParams />
      </Suspense>

      <div className="mt-0 text-sm">{children}</div>
    </div>
  )
}
