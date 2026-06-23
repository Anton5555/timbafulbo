import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

import type { PenaltyWinnerSide } from "@/generated/prisma/client"

import { buildMatchStatusDto } from "@/lib/match-status"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseRules } from "@/lib/tournament-rules"
import { userHasTournamentAccess } from "@/lib/tournament-access"

const querySchema = z.object({
  matchIds: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(1)).min(1).max(64)),
  tournamentId: z.string().min(1).optional(),
})

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
    matchIds: url.searchParams.get("matchIds") ?? "",
    tournamentId: url.searchParams.get("tournamentId") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
  }

  const { matchIds, tournamentId } = parsed.data
  const nowMs = Date.now()

  let rules = parseRules(null)
  let predictionsByMatch = new Map<
    string,
    {
      homeScore: number
      awayScore: number
      penaltyWinner: PenaltyWinnerSide | null
    }
  >()

  if (tournamentId) {
    const allowed = await userHasTournamentAccess(userId, tournamentId)
    if (!allowed) {
      return NextResponse.json(
        { error: "No tenés acceso a este torneo." },
        { status: 403 },
      )
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { rules: true },
    })
    rules = parseRules(tournament?.rules)

    const preds = await prisma.prediction.findMany({
      where: {
        userId,
        tournamentId,
        matchId: { in: matchIds },
      },
      select: {
        matchId: true,
        homeScore: true,
        awayScore: true,
        penaltyWinner: true,
      },
    })
    predictionsByMatch = new Map(
      preds.map((p) => [
        p.matchId,
        {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          penaltyWinner: p.penaltyWinner,
        },
      ]),
    )
  }

  const rows = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      startTime: true,
      stage: true,
      status: true,
      isFinal: true,
      homeScore: true,
      awayScore: true,
      penaltyWinner: true,
    },
  })

  const rowById = new Map(rows.map((r) => [r.id, r]))
  const statuses = matchIds
    .filter((id) => rowById.has(id))
    .map((id) => {
      const row = rowById.get(id)!
      return buildMatchStatusDto(
        row,
        nowMs,
        predictionsByMatch.get(id) ?? null,
        rules,
      )
    })

  return NextResponse.json(
    { statuses, serverTimeMs: nowMs },
    {
      headers: {
        "Cache-Control": "private, max-age=15",
      },
    },
  )
}
