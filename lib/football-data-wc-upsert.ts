import type { MatchStage, PenaltyWinnerSide, PrismaClient } from "@/generated/prisma/client"
import {
  mapFootballDataStageToMatchStage,
  mapFootballDataWinnerToPenaltySide,
  parseFootballDataMatchStatus,
  parseGroupLetterFromApiGroup,
  resolveMatchIsFinalFromApi,
} from "@/lib/football-data"
import { isKnockoutStage } from "@/lib/knockout-stage"
import { flagCdnUrlFromTeamCode } from "@/lib/flagcdn"

export type ApiArea = {
  id: number
  name: string
  code: string
  flag: string | null
}

export type ApiTeam = {
  id?: number | null
  name: string | null
  shortName?: string | null
  tla?: string | null
  crest?: string | null
  area?: ApiArea | null
}

/** Match shape from football-data WC `matches` list (embedded teams). */
export type ApiMatch = {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  stage: string
  group: string | null
  lastUpdated: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score?: {
    winner?: string | null
    duration?: string | null
    fullTime?: { home: number | null; away: number | null }
  }
}

function hasPositiveTeamId(team: ApiTeam | null | undefined): boolean {
  const id = team?.id
  return id != null && typeof id === "number" && id > 0
}

/** True when football-data provides real team ids for both sides (bulk import gate). */
export function hasDefinedMatchTeams(m: ApiMatch): boolean {
  return hasPositiveTeamId(m.homeTeam) && hasPositiveTeamId(m.awayTeam)
}

/** KO + draw in regular time: persist who advances based on `score.winner`. */
export function resolveMatchPenaltyWinnerFromApi(
  stage: MatchStage,
  homeScore: number | null,
  awayScore: number | null,
  isFinal: boolean,
  scoreWinner: string | null | undefined,
): PenaltyWinnerSide | null {
  if (!isFinal || homeScore === null || awayScore === null) return null
  if (!isKnockoutStage(stage)) return null
  if (homeScore !== awayScore) return null
  return mapFootballDataWinnerToPenaltySide(scoreWinner)
}

export function teamCodeFromApiTeam(team: ApiTeam): string {
  const fromArea = team.area?.code?.trim()
  if (fromArea && /^[A-Za-z0-9]{3}$/.test(fromArea)) return fromArea.toUpperCase()
  const tla = team.tla?.trim()
  if (tla && /^[A-Za-z0-9]{3}$/.test(tla)) return tla.toUpperCase()
  if (team.id != null && typeof team.id === "number") return `Z${team.id}`
  return "UNK"
}

export async function ensurePlaceholderTeam(
  prisma: PrismaClient,
  matchId: number,
  side: "H" | "V",
): Promise<string> {
  const code = `TBD${matchId}${side}`
  const name =
    side === "H"
      ? `Sin equipo (local) · ${matchId}`
      : `Sin equipo (visitante) · ${matchId}`
  const row = await prisma.team.upsert({
    where: { code },
    create: {
      name,
      code,
      footballDataId: null,
      crestUrl: null,
      shortName: null,
      areaName: null,
    },
    update: {},
  })
  return row.id
}

export async function upsertTeamFromApi(
  prisma: PrismaClient,
  team: ApiTeam,
): Promise<string> {
  if (team.id == null || team.id === undefined) {
    throw new Error("Team without id in API payload")
  }
  const code = teamCodeFromApiTeam(team)
  const crestUrl = flagCdnUrlFromTeamCode(code)
  const row = await prisma.team.upsert({
    where: { footballDataId: team.id },
    create: {
      footballDataId: team.id,
      name: team.name ?? `Equipo ${team.id}`,
      code,
      crestUrl,
      shortName: team.shortName ?? null,
      areaName: team.area?.name ?? null,
    },
    update: {
      name: team.name ?? `Equipo ${team.id}`,
      code,
      crestUrl,
      shortName: team.shortName ?? null,
      areaName: team.area?.name ?? null,
    },
  })
  return row.id
}

export async function resolveSideTeamId(
  prisma: PrismaClient,
  team: ApiTeam,
  matchId: number,
  side: "H" | "V",
): Promise<string> {
  const id = team?.id
  if (id != null && typeof id === "number" && id > 0) {
    return upsertTeamFromApi(prisma, team)
  }
  console.warn(
    `[wc-upsert] Missing team id for match ${matchId} (${side === "H" ? "local" : "visitante"}), using placeholder`,
  )
  return ensurePlaceholderTeam(prisma, matchId, side)
}

/** Upsert all competition teams (same as seed pre-match pass). */
export async function upsertWcTeamsFromApiList(
  prisma: PrismaClient,
  apiTeams: ApiTeam[],
): Promise<void> {
  for (const t of apiTeams) {
    if (t?.id != null && typeof t.id === "number" && t.id > 0) {
      await upsertTeamFromApi(prisma, t)
    }
  }
}

/** Upsert a single WC match by `footballDataId` (create or update all structural + score fields). */
export async function upsertWcMatchFromApi(
  prisma: PrismaClient,
  m: ApiMatch,
): Promise<void> {
  const homeId = await resolveSideTeamId(prisma, m.homeTeam, m.id, "H")
  const awayId = await resolveSideTeamId(prisma, m.awayTeam, m.id, "V")

  const stage = mapFootballDataStageToMatchStage(m.stage)
  const groupLetter = parseGroupLetterFromApiGroup(m.group)
  const startTime = new Date(m.utcDate)
  const lastUpdated = new Date(m.lastUpdated)
  const parsedStatus = parseFootballDataMatchStatus(m.status)
  const apiSyncedAt = new Date()
  const homeScore = m.score?.fullTime?.home ?? null
  const awayScore = m.score?.fullTime?.away ?? null
  const isFinal = resolveMatchIsFinalFromApi(
    parsedStatus,
    homeScore,
    awayScore,
  )
  const penaltyWinner = resolveMatchPenaltyWinnerFromApi(
    stage,
    homeScore,
    awayScore,
    isFinal,
    m.score?.winner,
  )

  await prisma.match.upsert({
    where: { footballDataId: m.id },
    create: {
      footballDataId: m.id,
      externalId: `fd-${m.id}`,
      homeTeamId: homeId,
      awayTeamId: awayId,
      startTime,
      stage,
      group: groupLetter,
      status: parsedStatus,
      matchday: m.matchday,
      lastUpdated,
      apiSyncedAt,
      homeScore,
      awayScore,
      penaltyWinner,
      isFinal,
    },
    update: {
      externalId: `fd-${m.id}`,
      homeTeamId: homeId,
      awayTeamId: awayId,
      startTime,
      stage,
      group: groupLetter,
      status: parsedStatus,
      matchday: m.matchday,
      lastUpdated,
      apiSyncedAt,
      homeScore,
      awayScore,
      penaltyWinner,
      isFinal,
    },
  })
}
