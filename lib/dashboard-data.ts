import type {
  MatchStage,
  MembershipRole,
  PenaltyWinnerSide,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/prisma"
import {
  type PredictionEvaluation,
  predictionEvaluation,
  predictionPoints,
} from "@/lib/prode-scoring"
import {
  filterMatchesForPredictionView,
  filterReadOnlyDashboardMatches,
} from "@/lib/dashboard-matches-visibility"
import { parseRules } from "@/lib/tournament-rules"
import { canEditPrediction } from "@/lib/prediction-window"
import { userHasTournamentAccess } from "@/lib/tournament-access"
import { displayTeamNameEs } from "@/lib/team-display-name"

export type DashboardMatchTeam = {
  name: string
  code: string
}

export type DashboardMatch = {
  id: string
  startTime: Date
  stage: MatchStage
  group: string | null
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: PenaltyWinnerSide | null
  /** Derived from football-data `FINISHED` only; UI and scoring must not use raw `Match.status`. */
  isFinal: boolean
  homeTeam: DashboardMatchTeam
  awayTeam: DashboardMatchTeam
}

export type LeaderboardRow = {
  userId: string
  displayName: string
  points: number
}

export type MyTournamentRow = {
  id: string
  name: string
  inviteCode: string
  role: MembershipRole
  /** Current user is the tournament creator/owner (the only admin we currently expect). */
  isOwner: boolean
  /** Only when you're a tournament admin. */
  pendingInvitations?: number
}

function toDashboardMatchTeam(team: {
  name: string
  code: string
}): DashboardMatchTeam {
  return {
    code: team.code,
    name: displayTeamNameEs(team),
  }
}

export async function getDashboardMatches(): Promise<DashboardMatch[]> {
  const rows = await prisma.match.findMany({
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    include: {
      homeTeam: {
        select: {
          name: true,
          code: true,
        },
      },
      awayTeam: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  })

  return rows.map((m) => ({
    ...m,
    homeTeam: toDashboardMatchTeam(m.homeTeam),
    awayTeam: toDashboardMatchTeam(m.awayTeam),
  }))
}

export type DashboardMatchWithPrediction = DashboardMatch & {
  userPrediction: {
    homeScore: number
    awayScore: number
    penaltyWinner: PenaltyWinnerSide | null
  } | null
  /** Set when the match is final with real scores and the user had a prediction. */
  userPredictionResult: PredictionEvaluation | null
  predictionOpen: boolean
}

/** Dashboard matches with the user's prediction for the tournament; `null` if the user has no access. */
export async function getDashboardMatchesWithPredictions(
  userId: string,
  tournamentId: string
): Promise<DashboardMatchWithPrediction[] | null> {
  const allowed = await userHasTournamentAccess(userId, tournamentId)
  if (!allowed) return null

  const allMatches = await getDashboardMatches()
  if (allMatches.length === 0) return []

  const now = Date.now()
  const matches = filterMatchesForPredictionView(allMatches, now)
  if (matches.length === 0) return []

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { rules: true },
  })
  const rules = parseRules(tournament?.rules)

  const ids = matches.map((m) => m.id)
  const preds = await prisma.prediction.findMany({
    where: {
      userId,
      tournamentId,
      matchId: { in: ids },
    },
    select: {
      matchId: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
    },
  })
  const predByMatch = new Map(
    preds.map((p) => [
      p.matchId,
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        penaltyWinner: p.penaltyWinner,
      },
    ]),
  )

  return matches.map((m) => {
    const userPrediction = predByMatch.get(m.id) ?? null
    let userPredictionResult: PredictionEvaluation | null = null
    if (
      m.isFinal &&
      m.homeScore !== null &&
      m.awayScore !== null &&
      userPrediction !== null
    ) {
      userPredictionResult = predictionEvaluation(
        userPrediction.homeScore,
        userPrediction.awayScore,
        userPrediction.penaltyWinner,
        m.homeScore,
        m.awayScore,
        m.penaltyWinner,
        rules,
        m.stage,
      )
    }
    return {
      ...m,
      userPrediction,
      userPredictionResult,
      predictionOpen: canEditPrediction(
        { isFinal: m.isFinal, startTime: m.startTime },
        now,
      ),
    }
  })
}

/** Matches for users without a league: same data as the fixture, no predictions and no editing. */
export async function getDashboardMatchesReadOnly(): Promise<
  DashboardMatchWithPrediction[]
> {
  const allMatches = await getDashboardMatches()
  const matches = filterReadOnlyDashboardMatches(allMatches)
  return matches.map((m) => ({
    ...m,
    userPrediction: null,
    userPredictionResult: null,
    predictionOpen: false,
  }))
}

export async function getTournamentsForUser(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const owned = await prisma.tournament.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  })

  const member = await prisma.membership.findMany({
    where: { userId },
    select: {
      tournament: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const map = new Map<string, string>()
  for (const t of owned) {
    map.set(t.id, t.name)
  }
  for (const m of member) {
    map.set(m.tournament.id, m.tournament.name)
  }

  return [...map.entries()].map(([id, name]) => ({ id, name }))
}

export async function getMyTournaments(
  userId: string
): Promise<MyTournamentRow[]> {
  const owned = await prisma.tournament.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true, inviteCode: true },
    orderBy: { createdAt: "desc" },
  })

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      tournament: {
        select: { id: true, name: true, inviteCode: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const ownedIdList = owned.map((t) => t.id)
  const pendingByTournament = new Map<string, number>()
  if (ownedIdList.length > 0) {
    const grouped = await prisma.invitation.groupBy({
      by: ["tournamentId"],
      where: {
        tournamentId: { in: ownedIdList },
        status: "PENDING",
      },
      _count: { _all: true },
    })
    for (const g of grouped) {
      pendingByTournament.set(g.tournamentId, g._count._all)
    }
  }

  const rows: MyTournamentRow[] = []

  for (const t of owned) {
    rows.push({
      id: t.id,
      name: t.name,
      inviteCode: t.inviteCode,
      role: "ADMIN",
      isOwner: true,
      pendingInvitations: pendingByTournament.get(t.id) ?? 0,
    })
  }

  const ownedIdSet = new Set(owned.map((t) => t.id))
  for (const m of memberships) {
    if (ownedIdSet.has(m.tournament.id)) continue
    rows.push({
      id: m.tournament.id,
      name: m.tournament.name,
      inviteCode: m.tournament.inviteCode,
      role: m.role,
      isOwner: false,
    })
  }

  return rows
}

export async function getLeaderboardForTournament(
  tournamentId: string
): Promise<LeaderboardRow[]> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      rules: true,
      ownerId: true,
      memberships: { select: { userId: true } },
    },
  })
  const rules = parseRules(tournament?.rules)

  const participantIds = new Set<string>()
  if (tournament?.ownerId) participantIds.add(tournament.ownerId)
  for (const m of tournament?.memberships ?? []) {
    participantIds.add(m.userId)
  }

  const predictions = await prisma.prediction.findMany({
    where: { tournamentId },
    select: {
      userId: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
      match: {
        select: {
          isFinal: true,
          homeScore: true,
          awayScore: true,
          penaltyWinner: true,
          stage: true,
        },
      },
    },
  })

  const totals = new Map<string, number>()

  for (const p of predictions) {
    const m = p.match
    if (
      !m.isFinal ||
      m.homeScore === null ||
      m.awayScore === null
    ) {
      continue
    }
    const pts = predictionPoints(
      p.homeScore,
      p.awayScore,
      p.penaltyWinner,
      m.homeScore,
      m.awayScore,
      m.penaltyWinner,
      rules,
      m.stage,
    )
    totals.set(p.userId, (totals.get(p.userId) ?? 0) + pts)
  }

  for (const userId of totals.keys()) {
    participantIds.add(userId)
  }

  const userIds = [...participantIds]
  if (userIds.length === 0) return []

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))

  const rows: LeaderboardRow[] = userIds.map((userId) => {
    const u = userMap.get(userId)
    const displayName = u?.name ?? u?.email ?? userId.slice(0, 8)
    return {
      userId,
      displayName,
      points: totals.get(userId) ?? 0,
    }
  })

  rows.sort((a, b) => {
    const byPoints = b.points - a.points
    if (byPoints !== 0) return byPoints
    return a.displayName.localeCompare(b.displayName)
  })

  return rows
}
