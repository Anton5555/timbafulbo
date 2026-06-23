import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

import type { PenaltyWinnerSide } from "@/generated/prisma/client"

import { auth } from "@/lib/auth"
import { canEditPrediction } from "@/lib/prediction-window"
import { prisma } from "@/lib/prisma"
import {
  predictionEvaluation,
  type PredictionEvaluation,
} from "@/lib/prode-scoring"
import { parseRules } from "@/lib/tournament-rules"
import { userHasTournamentAccess } from "@/lib/tournament-access"

const querySchema = z.object({
  matchId: z.string().min(1),
  tournamentId: z.string().min(1),
})

export type LeaguePredictionRow = {
  userId: string
  displayName: string
  prediction: {
    homeScore: number
    awayScore: number
    penaltyWinner: PenaltyWinnerSide | null
  } | null
  result: PredictionEvaluation | null
  points: number | null
}

export type LeaguePredictionsResponse = {
  currentUserId: string
  isFinal: boolean
  rows: LeaguePredictionRow[]
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "No hay sesión." }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    matchId: url.searchParams.get("matchId") ?? "",
    tournamentId: url.searchParams.get("tournamentId") ?? "",
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
  }

  const { matchId, tournamentId } = parsed.data

  const allowed = await userHasTournamentAccess(userId, tournamentId)
  if (!allowed) {
    return NextResponse.json(
      { error: "No tenés acceso a este torneo." },
      { status: 403 },
    )
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      startTime: true,
      isFinal: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
      stage: true,
    },
  })
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 })
  }

  if (canEditPrediction({ isFinal: match.isFinal, startTime: match.startTime })) {
    return NextResponse.json(
      { error: "Las predicciones aún no están disponibles." },
      { status: 403 },
    )
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      rules: true,
      ownerId: true,
      memberships: { select: { userId: true } },
    },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado." }, { status: 404 })
  }

  const rules = parseRules(tournament.rules)

  const participantIds = new Set<string>()
  if (tournament.ownerId) participantIds.add(tournament.ownerId)
  for (const m of tournament.memberships) {
    participantIds.add(m.userId)
  }

  const predictions = await prisma.prediction.findMany({
    where: { tournamentId, matchId },
    select: {
      userId: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
    },
  })

  const predictionByUser = new Map(
    predictions.map((p) => [
      p.userId,
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        penaltyWinner: p.penaltyWinner,
      },
    ]),
  )

  const userIds = [...participantIds]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const canScore =
    match.isFinal && match.homeScore !== null && match.awayScore !== null

  const rows: LeaguePredictionRow[] = userIds.map((participantId) => {
    const u = userMap.get(participantId)
    const displayName =
      u?.name ?? u?.email ?? participantId.slice(0, 8)
    const prediction = predictionByUser.get(participantId) ?? null

    if (!prediction || !canScore) {
      return {
        userId: participantId,
        displayName,
        prediction,
        result: null,
        points: null,
      }
    }

    const result = predictionEvaluation(
      prediction.homeScore,
      prediction.awayScore,
      prediction.penaltyWinner,
      match.homeScore!,
      match.awayScore!,
      match.penaltyWinner,
      rules,
      match.stage,
    )

    return {
      userId: participantId,
      displayName,
      prediction,
      result,
      points: result.points,
    }
  })

  rows.sort((a, b) => {
    if (canScore) {
      const byPoints = (b.points ?? 0) - (a.points ?? 0)
      if (byPoints !== 0) return byPoints
    }
    return a.displayName.localeCompare(b.displayName)
  })

  const body: LeaguePredictionsResponse = {
    currentUserId: userId,
    isFinal: match.isFinal,
    rows,
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=30",
    },
  })
}
