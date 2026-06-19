import type { MatchStage } from "@/generated/prisma/client"

import type { MatchesTabMatch } from "./types"

function localCalendarDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseLocalDayKey(key: string): Date {
  const parts = key.split("-")
  if (parts.length !== 3) return new Date(NaN)
  const y = Number(parts[0])
  const mo = Number(parts[1])
  const da = Number(parts[2])
  return new Date(y, mo - 1, da)
}

export type MatchGroup = {
  key: string
  label: string
  matches: MatchesTabMatch[]
}

/** @deprecated Use MatchGroup */
export type MatchDayGroup = MatchGroup & { dayMatches: MatchesTabMatch[] }

const STAGE_ORDER_DESC: MatchStage[] = [
  "FINAL",
  "THIRD_PLACE",
  "SEMI_FINALS",
  "QUARTER_FINALS",
  "ROUND_OF_16",
  "ROUND_OF_32",
  "GROUP",
]

function sortMatchesByStartTime(matches: MatchesTabMatch[]) {
  matches.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )
}

export function groupMatchesByLocalDay(
  matches: MatchesTabMatch[],
  dateHeadingFmt: Intl.DateTimeFormat
): MatchDayGroup[] {
  const map = new Map<string, MatchesTabMatch[]>()
  for (const m of matches) {
    const key = localCalendarDayKey(m.startTime)
    const list = map.get(key)
    if (list) list.push(m)
    else map.set(key, [m])
  }
  const keys = [...map.keys()].sort()
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }
  return keys.map((key) => {
    const dayMatches = map.get(key) ?? []
    return {
      key,
      label: dateHeadingFmt.format(parseLocalDayKey(key)),
      matches: dayMatches,
      dayMatches,
    }
  })
}

export function groupMatchesByStage(
  matches: MatchesTabMatch[],
  getStageLabel: (stage: MatchStage) => string
): MatchGroup[] {
  const map = new Map<MatchStage, MatchesTabMatch[]>()
  for (const m of matches) {
    const list = map.get(m.stage)
    if (list) list.push(m)
    else map.set(m.stage, [m])
  }
  for (const list of map.values()) {
    sortMatchesByStartTime(list)
  }
  return STAGE_ORDER_DESC.filter((stage) => map.has(stage)).map((stage) => ({
    key: stage,
    label: getStageLabel(stage),
    matches: map.get(stage) ?? [],
  }))
}
