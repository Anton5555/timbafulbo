"use server"

import { headers } from "next/headers"
import { z } from "zod"

import { PenaltyWinnerSide } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { isKnockoutStage } from "@/lib/knockout-stage"
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
  const draw = homeScore === awayScore

  if (!ko && penaltyWinnerInput !== null) {
    return {
      ok: false,
      error: "El ganador por penales solo aplica en fase eliminatoria.",
    }
  }
  if (ko && !draw && penaltyWinnerInput !== null) {
    return {
      ok: false,
      error: "Si no hay empate en el marcador, no corresponde ganador por penales.",
    }
  }
  if (ko && draw && penaltyWinnerInput === null) {
    return {
      ok: false,
      error:
        "En eliminatorias con empate tenés que elegir quién gana por penales.",
    }
  }

  try {
    const row = await prisma.prediction.upsert({
      where: {
        userId_matchId_tournamentId: {
          userId,
          matchId,
          tournamentId,
        },
      },
      create: {
        userId,
        matchId,
        tournamentId,
        homeScore,
        awayScore,
        penaltyWinner: penaltyWinnerInput,
      },
      update: {
        homeScore,
        awayScore,
        penaltyWinner: penaltyWinnerInput,
      },
      select: { homeScore: true, awayScore: true, penaltyWinner: true },
    })
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
