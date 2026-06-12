import type { PrismaClient } from "@/generated/prisma/client"
import {
  mapFootballDataStageToMatchStage,
  parseFootballDataMatchStatus,
  resolveMatchIsFinalFromApi,
} from "@/lib/football-data"
import type { ApiMatch, ApiTeam } from "@/lib/football-data-wc-upsert"
import {
  hasDefinedMatchTeams,
  resolveMatchPenaltyWinnerFromApi,
  upsertWcMatchFromApi,
  upsertWcTeamsFromApiList,
} from "@/lib/football-data-wc-upsert"

const BASE = "https://api.football-data.org/v4"
const COMP = "WC"
const SEASON = 2026
const WINDOW_MS = 2 * 60 * 60 * 1000

type ApiMatchesDoc = { matches?: ApiMatch[] }
type ApiTeamsDoc = { teams?: ApiTeam[] }

type ApiMatchScoreOnly = {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  stage: string
  group: string | null
  lastUpdated: string
  score?: {
    winner?: string | null
    fullTime?: { home: number | null; away: number | null }
  }
}

export type IncrementalSyncSummary = {
  mode: "incremental"
  candidates: number
  apiMatches: number
  updated: number
  unchanged: number
  finalized: number
  notInPayload: number
  noLink: number
}

export type FullSyncSummary = {
  mode: "full"
  apiMatches: number
  imported: number
  skippedUndefinedTeams: number
  teams: number
  created: number
  updated: number
}

export type SyncSummary = IncrementalSyncSummary | FullSyncSummary

function footballDataIdFromRow(row: {
  footballDataId: number | null
  externalId: string | null
}): number | null {
  if (row.footballDataId != null) return row.footballDataId
  const ext = row.externalId?.trim()
  if (!ext) return null
  const m = /^fd-(\d+)$/i.exec(ext)
  return m ? Number(m[1]) : null
}

function sameScore(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null && b == null) return true
  return a === b
}

function samePenaltyWinner(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null && b == null) return true
  return a === b
}

function sameTime(
  a: Date | null | undefined,
  b: Date | null | undefined,
): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return a.getTime() === b.getTime()
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "X-Auth-Token": token },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[sync-wc] GET failed: ${res.status} ${body}`)
  }
  return (await res.json()) as T
}

export function logSyncSummary(summary: SyncSummary): void {
  if (summary.mode === "full") {
    console.log(
      `[sync-wc] mode=full apiMatches=${summary.apiMatches} imported=${summary.imported} skippedUndefinedTeams=${summary.skippedUndefinedTeams} teams=${summary.teams} created=${summary.created} updated=${summary.updated}`,
    )
    return
  }

  console.log(
    `[sync-wc] mode=incremental candidatos=${summary.candidates} apiMatches=${summary.apiMatches} updated=${summary.updated} unchanged=${summary.unchanged} finalized=${summary.finalized} notInPayload=${summary.notInPayload} noLink=${summary.noLink}`,
  )
}

export async function syncWcScoresFull(
  prisma: PrismaClient,
  token: string,
): Promise<FullSyncSummary> {
  const matchesUrl = `${BASE}/competitions/${COMP}/matches?season=${SEASON}`
  const teamsUrl = `${BASE}/competitions/${COMP}/teams?season=${SEASON}`

  const [matchesDoc, teamsDoc] = await Promise.all([
    fetchJson<ApiMatchesDoc>(matchesUrl, token),
    fetchJson<ApiTeamsDoc>(teamsUrl, token),
  ])

  const apiMatches = matchesDoc.matches ?? []
  const apiTeams = teamsDoc.teams ?? []
  const matchesToImport = apiMatches.filter(hasDefinedMatchTeams)
  const matchesSkipped = apiMatches.length - matchesToImport.length

  await upsertWcTeamsFromApiList(prisma, apiTeams)

  let created = 0
  let updated = 0
  for (const m of matchesToImport) {
    const before = await prisma.match.findUnique({
      where: { footballDataId: m.id },
      select: { id: true },
    })
    await upsertWcMatchFromApi(prisma, m)
    if (before) updated += 1
    else created += 1
  }

  return {
    mode: "full",
    apiMatches: apiMatches.length,
    imported: matchesToImport.length,
    skippedUndefinedTeams: matchesSkipped,
    teams: apiTeams.length,
    created,
    updated,
  }
}

export async function syncWcScoresIncremental(
  prisma: PrismaClient,
  token: string,
): Promise<IncrementalSyncSummary> {
  const now = Date.now()
  const windowEnd = new Date(now + WINDOW_MS)

  const candidates = await prisma.match.findMany({
    where: {
      startTime: { lte: windowEnd },
      OR: [{ isFinal: false }, { isFinal: true, homeScore: null }],
    },
    select: {
      id: true,
      footballDataId: true,
      externalId: true,
      status: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
      isFinal: true,
      lastUpdated: true,
    },
  })

  if (candidates.length === 0) {
    return {
      mode: "incremental",
      candidates: 0,
      apiMatches: 0,
      updated: 0,
      unchanged: 0,
      finalized: 0,
      notInPayload: 0,
      noLink: 0,
    }
  }

  const matchesUrl = `${BASE}/competitions/${COMP}/matches?season=${SEASON}`
  const doc = await fetchJson<ApiMatchesDoc>(matchesUrl, token)
  const apiMatches = doc.matches ?? []
  const byId = new Map<number, ApiMatchScoreOnly>()
  for (const m of apiMatches) {
    byId.set(m.id, m as ApiMatchScoreOnly)
  }

  let updated = 0
  let unchanged = 0
  let notInPayload = 0
  let noLink = 0
  let finalized = 0

  for (const row of candidates) {
    const fdId = footballDataIdFromRow(row)
    if (fdId == null) {
      console.warn(
        `[sync-wc] Match ${row.id} sin footballDataId ni externalId fd-<id>, skip`,
      )
      noLink += 1
      continue
    }

    const api = byId.get(fdId)
    if (!api) {
      console.warn(
        `[sync-wc] Match ${row.id} footballDataId=${fdId} no aparece en la respuesta WC`,
      )
      notInPayload += 1
      continue
    }

    const nextStatus = parseFootballDataMatchStatus(api.status)
    const nextHome = api.score?.fullTime?.home ?? null
    const nextAway = api.score?.fullTime?.away ?? null
    const nextLastUpdated = new Date(api.lastUpdated)
    const nextIsFinal = resolveMatchIsFinalFromApi(
      nextStatus,
      nextHome,
      nextAway,
    )
    const apiStage = mapFootballDataStageToMatchStage(api.stage)
    const nextPenaltyWinner = resolveMatchPenaltyWinnerFromApi(
      apiStage,
      nextHome,
      nextAway,
      nextIsFinal,
      api.score?.winner,
    )

    const statusSame = row.status === nextStatus
    const scoresSame =
      sameScore(row.homeScore, nextHome) && sameScore(row.awayScore, nextAway)
    const penaltySame = samePenaltyWinner(
      row.penaltyWinner,
      nextPenaltyWinner,
    )
    const finalSame = row.isFinal === nextIsFinal
    const lastSame = sameTime(row.lastUpdated, nextLastUpdated)

    if (
      statusSame &&
      scoresSame &&
      penaltySame &&
      finalSame &&
      lastSame
    ) {
      unchanged += 1
      continue
    }

    await prisma.match.update({
      where: { id: row.id },
      data: {
        status: nextStatus,
        homeScore: nextHome,
        awayScore: nextAway,
        penaltyWinner: nextPenaltyWinner,
        lastUpdated: nextLastUpdated,
        isFinal: nextIsFinal,
        apiSyncedAt: new Date(),
      },
    })
    updated += 1
    if (nextIsFinal) finalized += 1
  }

  return {
    mode: "incremental",
    candidates: candidates.length,
    apiMatches: apiMatches.length,
    updated,
    unchanged,
    finalized,
    notInPayload,
    noLink,
  }
}

export async function syncWcScores(
  prisma: PrismaClient,
  token: string,
  mode: "incremental" | "full" = "incremental",
): Promise<SyncSummary> {
  if (mode === "full") {
    return syncWcScoresFull(prisma, token)
  }
  return syncWcScoresIncremental(prisma, token)
}
