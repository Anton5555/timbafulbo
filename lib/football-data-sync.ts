import type {
  FootballDataMatchStatus,
  PenaltyWinnerSide,
  PrismaClient,
} from "@/generated/prisma/client"
import {
  mapFootballDataStageToMatchStage,
  parseFootballDataMatchStatus,
  parseGroupLetterFromApiGroup,
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

export type IncrementalMatchChange = {
  matchId: string
  footballDataId: number
  label: string
  changes: string[]
  finalized: boolean
}

export type FullMatchChange = {
  footballDataId: number
  label: string
  action: "created" | "updated"
  status: FootballDataMatchStatus | null
  score: string
  stage: string
  group: string | null
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
  changes: IncrementalMatchChange[]
}

export type FullSyncSummary = {
  mode: "full"
  apiMatches: number
  imported: number
  skippedUndefinedTeams: number
  skippedFinalized: number
  teams: number
  created: number
  updated: number
  changes: FullMatchChange[]
}

/** Full sync must not rewrite rows already finalized in our DB (scores stay on incremental). */
export function shouldSkipFullSyncUpdate(
  existing: { isFinal: boolean } | null | undefined,
): boolean {
  return existing?.isFinal === true
}

export type SyncSummary = IncrementalSyncSummary | FullSyncSummary

function formatScoreDisplay(
  home: number | null | undefined,
  away: number | null | undefined,
): string {
  if (home == null && away == null) return "—"
  return `${home ?? "?"}-${away ?? "?"}`
}

function formatPenaltyWinner(
  winner: PenaltyWinnerSide | null | undefined,
): string {
  return winner ?? "—"
}

function matchLabelFromDbTeams(
  home: { code: string; name: string },
  away: { code: string; name: string },
): string {
  const homeLabel = home.code.startsWith("TBD") ? home.name : home.code
  const awayLabel = away.code.startsWith("TBD") ? away.name : away.code
  return `${homeLabel} vs ${awayLabel}`
}

function matchLabelFromApiMatch(m: ApiMatch): string {
  const home =
    m.homeTeam.tla?.trim() ||
    m.homeTeam.area?.code?.trim() ||
    m.homeTeam.shortName?.trim() ||
    m.homeTeam.name?.trim() ||
    "?"
  const away =
    m.awayTeam.tla?.trim() ||
    m.awayTeam.area?.code?.trim() ||
    m.awayTeam.shortName?.trim() ||
    m.awayTeam.name?.trim() ||
    "?"
  return `${home} vs ${away}`
}

function describeIncrementalFieldChanges(
  row: {
    status: FootballDataMatchStatus | null
    homeScore: number | null
    awayScore: number | null
    penaltyWinner: PenaltyWinnerSide | null
    isFinal: boolean
    lastUpdated: Date | null
  },
  next: {
    status: FootballDataMatchStatus | null
    homeScore: number | null
    awayScore: number | null
    penaltyWinner: PenaltyWinnerSide | null
    isFinal: boolean
    lastUpdated: Date
  },
  flags: {
    statusSame: boolean
    scoresSame: boolean
    penaltySame: boolean
    finalSame: boolean
    lastSame: boolean
  },
): string[] {
  const changes: string[] = []
  if (!flags.statusSame) {
    changes.push(`status ${row.status ?? "—"} → ${next.status}`)
  }
  if (!flags.scoresSame) {
    changes.push(
      `score ${formatScoreDisplay(row.homeScore, row.awayScore)} → ${formatScoreDisplay(next.homeScore, next.awayScore)}`,
    )
  }
  if (!flags.penaltySame) {
    changes.push(
      `penaltyWinner ${formatPenaltyWinner(row.penaltyWinner)} → ${formatPenaltyWinner(next.penaltyWinner)}`,
    )
  }
  if (!flags.finalSame) {
    changes.push(`isFinal ${row.isFinal} → ${next.isFinal}`)
  }
  if (!flags.lastSame) {
    changes.push(
      `lastUpdated ${row.lastUpdated?.toISOString() ?? "—"} → ${next.lastUpdated.toISOString()}`,
    )
  }
  return changes
}

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

const FULL_SYNC_LOG_LIMIT = 30

export function logSyncSummary(summary: SyncSummary): void {
  if (summary.mode === "full") {
    const touched = summary.created + summary.updated
    if (touched === 0) {
      console.log(
        `[sync-wc] mode=full Sin cambios en BD: ${summary.apiMatches} partidos en API, ${summary.imported} importables, ${summary.skippedUndefinedTeams} omitidos sin equipos, ${summary.skippedFinalized} ya finalizados omitidos, ${summary.teams} equipos en API`,
      )
      return
    }

    console.log(
      `[sync-wc] mode=full Sincronización completa: ${summary.created} creado(s), ${summary.updated} actualizado(s) (${summary.imported}/${summary.apiMatches} partidos importables, ${summary.skippedUndefinedTeams} omitidos sin equipos, ${summary.skippedFinalized} ya finalizados omitidos, ${summary.teams} equipos)`,
    )
  } else if (summary.candidates === 0) {
    console.log(
      "[sync-wc] mode=incremental No hay partidos candidatos (pendientes o marcador faltante y startTime dentro de +2h). Sin llamada a la API de partidos.",
    )
    return
  } else if (summary.updated === 0) {
    const skipped = summary.notInPayload + summary.noLink
    console.log(
      `[sync-wc] mode=incremental Sin cambios en ${summary.candidates} candidato(s) (${summary.unchanged} iguales${skipped > 0 ? `, ${skipped} omitidos` : ""}${summary.notInPayload > 0 ? `: ${summary.notInPayload} no en payload API` : ""}${summary.noLink > 0 ? `${summary.notInPayload > 0 ? "," : ":"} ${summary.noLink} sin footballDataId` : ""}). API devolvió ${summary.apiMatches} partidos WC.`,
    )
    return
  } else {
    console.log(
      `[sync-wc] mode=incremental ${summary.updated} partido(s) actualizado(s) de ${summary.candidates} candidato(s) (API: ${summary.apiMatches} partidos WC${summary.finalized > 0 ? `, ${summary.finalized} finalizado(s)` : ""})`,
    )
  }

  if (summary.mode === "full") {
    const changes = summary.changes
    const limit = FULL_SYNC_LOG_LIMIT
    for (let i = 0; i < Math.min(changes.length, limit); i += 1) {
      const change = changes[i]
      const prefix = change.action === "created" ? "+" : "~"
      const group = change.group ? `, grupo ${change.group}` : ""
      console.log(
        `[sync-wc]   ${prefix} ${change.label} (fd-${change.footballDataId}): ${change.status ?? "—"}, ${change.score}${group}`,
      )
    }
    if (changes.length > limit) {
      console.log(`[sync-wc]   … y ${changes.length - limit} más`)
    }
    return
  }

  const changes = summary.changes
  for (const change of changes) {
    const finalizedTag = change.finalized ? " [finalizado]" : ""
    console.log(
      `[sync-wc]   · ${change.label} (fd-${change.footballDataId}): ${change.changes.join(", ")}${finalizedTag}`,
    )
  }

  const extras: string[] = []
  if (summary.unchanged > 0) extras.push(`${summary.unchanged} sin cambios`)
  if (summary.notInPayload > 0) {
    extras.push(`${summary.notInPayload} no en payload API`)
  }
  if (summary.noLink > 0) extras.push(`${summary.noLink} sin footballDataId`)
  if (extras.length > 0) {
    console.log(`[sync-wc]   resto: ${extras.join(", ")}`)
  }
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
  let skippedFinalized = 0
  const changes: FullMatchChange[] = []
  for (const m of matchesToImport) {
    const before = await prisma.match.findUnique({
      where: { footballDataId: m.id },
      select: { id: true, isFinal: true },
    })
    if (shouldSkipFullSyncUpdate(before)) {
      skippedFinalized += 1
      continue
    }
    await upsertWcMatchFromApi(prisma, m)
    const action = before ? "updated" : "created"
    if (before) updated += 1
    else created += 1

    const stage = mapFootballDataStageToMatchStage(m.stage)
    const parsedStatus = parseFootballDataMatchStatus(m.status)
    const homeScore = m.score?.fullTime?.home ?? null
    const awayScore = m.score?.fullTime?.away ?? null
    changes.push({
      footballDataId: m.id,
      label: matchLabelFromApiMatch(m),
      action,
      status: parsedStatus,
      score: formatScoreDisplay(homeScore, awayScore),
      stage,
      group: parseGroupLetterFromApiGroup(m.group),
    })
  }

  return {
    mode: "full",
    apiMatches: apiMatches.length,
    imported: matchesToImport.length,
    skippedUndefinedTeams: matchesSkipped,
    skippedFinalized,
    teams: apiTeams.length,
    created,
    updated,
    changes,
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
      homeTeam: { select: { code: true, name: true } },
      awayTeam: { select: { code: true, name: true } },
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
      changes: [],
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
  const changes: IncrementalMatchChange[] = []

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

    const fieldChanges = describeIncrementalFieldChanges(
      row,
      {
        status: nextStatus,
        homeScore: nextHome,
        awayScore: nextAway,
        penaltyWinner: nextPenaltyWinner,
        isFinal: nextIsFinal,
        lastUpdated: nextLastUpdated,
      },
      {
        statusSame,
        scoresSame,
        penaltySame,
        finalSame,
        lastSame,
      },
    )

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
    changes.push({
      matchId: row.id,
      footballDataId: fdId,
      label: matchLabelFromDbTeams(row.homeTeam, row.awayTeam),
      changes: fieldChanges,
      finalized: nextIsFinal && !row.isFinal,
    })
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
    changes,
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
