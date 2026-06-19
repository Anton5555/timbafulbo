import type { ReactNode } from "react"
import { headers } from "next/headers"

import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell"
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero"
import { DashboardStickyHeader } from "@/components/dashboard/dashboard-sticky-header"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { NavigationPendingProvider } from "@/components/dashboard/navigation-pending-context"
import { NavigationPendingReset } from "@/components/dashboard/navigation-pending-reset"
import { RouteProgressBar } from "@/components/dashboard/route-progress-bar"
import { Toaster } from "@/components/ui/sonner"
import { auth } from "@/lib/auth"
import { getTournamentsForUser } from "@/lib/dashboard-data"
import { localizedRedirectFromRequest } from "@/lib/localized-redirect"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    await localizedRedirectFromRequest("/")
  }

  const tournaments = await getTournamentsForUser(session!.user.id)

  return (
    <NavigationPendingProvider>
      <div className="relative flex min-h-svh flex-col bg-background font-mono">
        <div
          className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.55_0.12_150/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.12_150/0.06)_1px,transparent_1px)] bg-size-[14px_24px]"
          aria-hidden
        />

        <RouteProgressBar />
        <NavigationPendingReset />

        <DashboardStickyHeader
          user={{
            name: session!.user.name,
            email: session!.user.email,
            image: session!.user.image ?? null,
          }}
        />

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6 sm:pb-24 lg:px-8">
          <DashboardLayoutShell tournaments={tournaments} initialChatMessages={[]}>
            <div className="flex flex-col gap-8">
              <DashboardPageHero />
              <DashboardTabs>{children}</DashboardTabs>
            </div>
          </DashboardLayoutShell>
        </div>
        <Toaster richColors position="top-center" />
      </div>
    </NavigationPendingProvider>
  )
}
