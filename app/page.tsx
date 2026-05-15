import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { HomeFeatures } from "@/components/home-features"
import { HomeSignIn } from "@/components/home-sign-in"
import { Button } from "@/components/ui/button"
import {
  UpcomingFixtures,
  type UpcomingFixture,
} from "@/components/upcoming-fixtures"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { displayTeamNameEs } from "@/lib/team-display-name"

async function getUpcomingMatches(): Promise<UpcomingFixture[]> {
  const rows = await prisma.match.findMany({
    where: {
      isFinal: false,
      startTime: { gte: new Date() },
    },
    take: 3,
    orderBy: { startTime: "asc" },
    include: {
      homeTeam: { select: { name: true, code: true } },
      awayTeam: { select: { name: true, code: true } },
    },
  })

  return rows.map((m) => ({
    ...m,
    homeTeam: {
      code: m.homeTeam.code,
      name: displayTeamNameEs(m.homeTeam),
    },
    awayTeam: {
      code: m.awayTeam.code,
      name: displayTeamNameEs(m.awayTeam),
    },
  }))
}

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect("/dashboard")
  }

  const upcomingMatches = await getUpcomingMatches()

  return (
    <div className="relative flex min-h-svh flex-col items-center bg-background p-6 font-mono lg:p-12">
      <div
        className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.55_0.12_150/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.12_150/0.06)_1px,transparent_1px)] bg-size-[14px_24px]"
        aria-hidden
      />

      <div className="grid w-full max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        {/* Left: hero & auth */}
        <div className="flex flex-col gap-8 text-left">
          <header className="flex flex-col items-start gap-4">
            <div className="bg-primary px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-primary-foreground uppercase">
              Mundial 2026
            </div>
            <h1 className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.25em] text-muted-foreground uppercase sm:text-base">
                timba
              </span>
              <span className="text-5xl font-black tracking-tighter uppercase italic text-primary sm:text-7xl">
                fulbo
              </span>
            </h1>
            <p className="max-w-[40ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
              La plataforma definitiva para gestionar tus prodes. Creá ligas,
              invitá amigos y demostrá quién sabe más de fútbol.
            </p>
          </header>

          <div className="flex flex-col gap-6 border-l-2 border-primary/20 pl-6">
            <HomeFeatures />
          </div>

          <div className="max-w-sm">
            <Suspense
              fallback={
                <Button
                  className="h-12 w-full animate-pulse"
                  disabled
                  size="lg"
                >
                  Cargando…
                </Button>
              }
            >
              <HomeSignIn />
            </Suspense>
          </div>
        </div>

        {/* Right: fixtures ticket */}
        <aside className="relative min-w-0">
          <div
            className="absolute -inset-4 bg-primary/5 blur-3xl"
            aria-hidden
          />

          <div className="relative overflow-hidden border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-dashed border-border bg-muted/50 px-6 py-4">
              <span className="text-[10px] font-bold tracking-widest uppercase">
                Live Fixtures
              </span>
              <div className="flex gap-1">
                <div className="size-1.5 rounded-full bg-primary/50" />
                <div className="size-1.5 rounded-full bg-primary" />
              </div>
            </div>

            <UpcomingFixtures matches={upcomingMatches} />

            <div className="bg-muted/20 px-6 py-4 text-center">
              <span className="text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
                Datos provistos por football-data.org
              </span>
            </div>

            <div
              className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full border-r border-border bg-background"
              aria-hidden
            />
            <div
              className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full border-l border-border bg-background"
              aria-hidden
            />
          </div>
        </aside>
      </div>

      <footer className="mt-16 flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 opacity-50 sm:flex-row">
        <span className="text-[10px] tracking-[0.2em] uppercase">
          © 2026 timbafulbo
        </span>
        <div className="font-mono text-[10px] text-muted-foreground uppercase">
          (Pulsá <kbd className="border border-border px-1 font-mono">d</kbd>{" "}
          modo oscuro)
        </div>
      </footer>
    </div>
  )
}
