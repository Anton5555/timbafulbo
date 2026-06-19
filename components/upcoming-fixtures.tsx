"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"

import type { MatchStage } from "@/generated/prisma/client"

import { TeamEmblem } from "@/components/team-emblem"
import { useMatchLabels } from "@/hooks/use-match-labels"

export type UpcomingFixtureTeam = {
  name: string
  code: string
}

export type UpcomingFixture = {
  id: string
  startTime: Date | string
  stage: MatchStage
  group: string | null
  homeTeam: UpcomingFixtureTeam
  awayTeam: UpcomingFixtureTeam
}

function displayCode(team: UpcomingFixtureTeam): string {
  return team.code.trim().slice(0, 3).toUpperCase() || "?"
}

export function UpcomingFixtures({ matches }: { matches: UpcomingFixture[] }) {
  const t = useTranslations("fixtures")
  const { locale, stageLabel, timeFmt } = useMatchLabels()

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale]
  )

  if (matches.length === 0) {
    return (
      <div className="px-6 py-10">
        <p className="text-center text-sm text-muted-foreground sm:text-base">
          {t("empty")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-6 py-6">
      {matches.map((match) => {
        const start = new Date(match.startTime)
        const stageLine =
          match.stage === "GROUP" && match.group
            ? `${stageLabel(match.stage)} · ${t("groupShort", { letter: match.group })}`
            : stageLabel(match.stage)

        return (
          <div
            key={match.id}
            className="group relative flex min-h-22 items-center justify-between border-b border-border/60 px-2 py-5 transition-colors hover:bg-muted/20 sm:px-4 sm:py-6"
          >
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <TeamEmblem
                name={match.homeTeam.name}
                code={match.homeTeam.code}
                size="md"
              />
              <span className="text-sm font-bold uppercase tabular-nums sm:text-base">
                {displayCode(match.homeTeam)}
              </span>
            </div>

            <div className="flex min-w-26 shrink-0 flex-col items-center gap-1 px-2 sm:min-w-30 sm:px-4">
              <span className="text-center text-[10px] font-bold leading-tight text-primary uppercase sm:text-xs">
                {stageLine}
              </span>
              <span className="text-lg font-bold tabular-nums sm:text-xl">
                {timeFmt.format(start)}
              </span>
              <span className="text-xs text-muted-foreground capitalize sm:text-sm">
                {dateFmt.format(start)}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <TeamEmblem
                name={match.awayTeam.name}
                code={match.awayTeam.code}
                size="md"
              />
              <span className="text-sm font-bold uppercase tabular-nums sm:text-base">
                {displayCode(match.awayTeam)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
