"use server"

import { headers } from "next/headers"
import { z } from "zod"

import { PenaltyWinnerSide } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { isKnockoutStage } from "@/lib/knockout-stage"
import { getTournamentsForUser } from "@/lib/dashboard-data"
import { prisma } from "@/lib/prisma"
import { canEditPrediction } from "@/lib/prediction-window"
import { userHasTournamentAccess } from "@/lib/tournament-access"

const scoreSchema = z.number().int().min(0).max(30)

const upsertSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  homeScore: scoreSchema,
  awayScore: scoreSchema,
  penaltyWinner: z.nativeEnum(PenaltyWinnerSide).nullable().optional(),
  applyToAllTournaments: z.boolean().optional(),
})

export type UpsertPredictionResult =
  | {
      ok: true
      homeScore: number
      awayScore: number
      penaltyWinner: PenaltyWinnerSide | null
    }
  | { ok: false; error: string }

export async function upsertPrediction(
  input: z.infer<typeof upsertSchema>
): Promise<UpsertPredictionResult> {
  const parsed = upsertSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." }
  }

  const { tournamentId, matchId, homeScore, awayScore } = parsed.data
  const applyToAllTournaments = parsed.data.applyToAllTournaments ?? false
  const penaltyWinnerRaw = parsed.data.penaltyWinner
  const penaltyWinnerInput =
    penaltyWinnerRaw === undefined ? null : penaltyWinnerRaw

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  if (!userId) {
    return { ok: false, error: "No hay sesión." }
  }

  const allowed = await userHasTournamentAccess(userId, tournamentId)
  if (!allowed) {
    return { ok: false, error: "No tenés acceso a este torneo." }
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, startTime: true, isFinal: true, stage: true },
  })
  if (!match) {
    return { ok: false, error: "Partido no encontrado." }
  }

  if (
    !canEditPrediction(
      { isFinal: match.isFinal, startTime: match.startTime },
      Date.now()
    )
  ) {
    return { ok: false, error: "Predicciones cerradas para este partido." }
  }

  const ko = isKnockoutStage(match.stage)

  if (!ko && penaltyWinnerInput !== null) {
    return {
      ok: false,
      error: "El ganador por penales solo aplica en fase eliminatoria.",
    }
  }
  if (ko && homeScore !== awayScore && penaltyWinnerInput !== null) {
    return {
      ok: false,
      error: "Si no hay empate en el marcador, no corresponde ganador por penales.",
    }
  }
  if (ko && homeScore === awayScore && penaltyWinnerInput === null) {
    return {
      ok: false,
      error:
        "En eliminatorias con empate tenés que elegir quién gana por penales.",
    }
  }

  const createUpdate = {
    homeScore,
    awayScore,
    penaltyWinner: penaltyWinnerInput,
  } as const

  let targetTournamentIds: string[]
  if (applyToAllTournaments) {
    const rows = await getTournamentsForUser(userId)
    targetTournamentIds = rows.map((r) => r.id)
  } else {
    targetTournamentIds = [tournamentId]
  }

  if (targetTournamentIds.length === 0) {
    return { ok: false, error: "No tenés ligas para guardar." }
  }

  const primaryIndex = targetTournamentIds.indexOf(tournamentId)
  if (primaryIndex < 0) {
    return { ok: false, error: "No tenés acceso a este torneo." }
  }

  try {
    if (targetTournamentIds.length === 1) {
      const row = await prisma.prediction.upsert({
        where: {
          userId_matchId_tournamentId: {
            userId,
            matchId,
            tournamentId: targetTournamentIds[0]!,
          },
        },
        create: {
          userId,
          matchId,
          tournamentId: targetTournamentIds[0]!,
          ...createUpdate,
        },
        update: { ...createUpdate },
        select: { homeScore: true, awayScore: true, penaltyWinner: true },
      })
      return {
        ok: true,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        penaltyWinner: row.penaltyWinner,
      }
    }

    const results = await prisma.$transaction(
      targetTournamentIds.map((tid) =>
        prisma.prediction.upsert({
          where: {
            userId_matchId_tournamentId: {
              userId,
              matchId,
              tournamentId: tid,
            },
          },
          create: {
            userId,
            matchId,
            tournamentId: tid,
            ...createUpdate,
          },
          update: { ...createUpdate },
          select: {
            homeScore: true,
            awayScore: true,
            penaltyWinner: true,
          },
        }),
      ),
    )

    const row = results[primaryIndex]!
    return {
      ok: true,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      penaltyWinner: row.penaltyWinner,
    }
  } catch {
    return { ok: false, error: "No se pudo guardar. Probá de nuevo." }
  }
}
