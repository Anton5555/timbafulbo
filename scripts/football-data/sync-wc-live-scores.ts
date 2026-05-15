import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "../../generated/prisma/client"
import {
  isMatchFinishedStatus,
  mapFootballDataStageToMatchStage,
  parseFootballDataMatchStatus,
} from "../../lib/football-data"
import type { ApiMatch, ApiTeam } from "../../lib/football-data-wc-upsert"
import {
  hasDefinedMatchTeams,
  resolveMatchPenaltyWinnerFromApi,
  upsertWcMatchFromApi,
  upsertWcTeamsFromApiList,
} from "../../lib/football-data-wc-upsert"

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

function isFullSyncMode(): boolean {
  if (process.argv.includes("--full")) return true
  const envMode = process.env.WC_SYNC_MODE?.trim().toLowerCase()
  return envMode === "full" || envMode === "manual-full-sync"
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
    console.error(`[sync-wc] GET failed: ${res.status}`, await res.text())
    process.exit(1)
  }
  return (await res.json()) as T
}

async function runFullWcSync(prisma: PrismaClient, token: string) {
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

  console.log(
    `[sync-wc] mode=full apiMatches=${apiMatches.length} imported=${matchesToImport.length} skippedUndefinedTeams=${matchesSkipped} teams=${apiTeams.length} created=${created} updated=${updated}`,
  )
}

async function runIncrementalSync(prisma: PrismaClient, token: string) {
  const now = Date.now()
  const windowEnd = new Date(now + WINDOW_MS)

  const candidates = await prisma.match.findMany({
    where: {
      isFinal: false,
      startTime: { lte: windowEnd },
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
    console.log(
      "[sync-wc] mode=incremental No hay partidos candidatos (isFinal=false y startTime dentro de +2h). Gasto API: 0",
    )
    return
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
    const nextIsFinal = isMatchFinishedStatus(nextStatus)
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

  console.log(
    `[sync-wc] mode=incremental candidatos=${candidates.length} apiMatches=${apiMatches.length} updated=${updated} unchanged=${unchanged} finalized=${finalized} notInPayload=${notInPayload} noLink=${noLink}`,
  )
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    console.error(
      "Missing DATABASE_URL. Set it in .env or GitHub Actions secrets.",
    )
    process.exit(1)
  }

  const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim()
  if (!token) {
    console.error(
      "Missing FOOTBALL_DATA_API_TOKEN. Add it to .env or secrets, then re-run:\n" +
        "  pnpm football-data:sync:wc\n" +
        "  pnpm football-data:sync:wc:full",
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const full = isFullSyncMode()
  try {
    if (full) {
      await runFullWcSync(prisma, token)
    } else {
      await runIncrementalSync(prisma, token)
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
