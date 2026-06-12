"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { PenaltyWinnerSide } from "@/generated/prisma/client"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
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
  | { ok: false; error: string; code?: "prediction-closed" }

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
    return {
      ok: false,
      error: "Predicciones cerradas para este partido.",
      code: "prediction-closed",
    }
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

const copyPredictionsSchema = z
  .object({
    sourceTournamentId: z.string().min(1),
    targetTournamentId: z.string().min(1),
  })
  .refine((d) => d.sourceTournamentId !== d.targetTournamentId, {
    message: "Elegí otra liga.",
  })

export type CopyPredictionsFromLeagueResult =
  | {
      ok: true
      copied: number
      skippedLocked: number
      bonusCopied: number
    }
  | { ok: false; error: string }

export async function copyPredictionsFromLeague(
  input: z.infer<typeof copyPredictionsSchema>
): Promise<CopyPredictionsFromLeagueResult> {
  const parsed = copyPredictionsSchema.safeParse(input)
  if (!parsed.success) {
    const err = parsed.error.issues[0]?.message ?? "Datos inválidos."
    return { ok: false, error: err }
  }

  const { sourceTournamentId, targetTournamentId } = parsed.data

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  if (!userId) {
    return { ok: false, error: "No hay sesión." }
  }

  const [sourceAllowed, targetAllowed] = await Promise.all([
    userHasTournamentAccess(userId, sourceTournamentId),
    userHasTournamentAccess(userId, targetTournamentId),
  ])
  if (!sourceAllowed || !targetAllowed) {
    return { ok: false, error: "No tenés acceso a una o ambas ligas." }
  }

  const nowMs = Date.now()

  const [sourcePredictions, sourceBonuses] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId, tournamentId: sourceTournamentId },
      select: {
        matchId: true,
        homeScore: true,
        awayScore: true,
        penaltyWinner: true,
        match: {
          select: { isFinal: true, startTime: true },
        },
      },
    }),
    prisma.bonusPrediction.findMany({
      where: { userId, tournamentId: sourceTournamentId },
      select: { type: true, value: true },
    }),
  ])

  const toCopy: {
    matchId: string
    homeScore: number
    awayScore: number
    penaltyWinner: PenaltyWinnerSide | null
  }[] = []
  let skippedLocked = 0

  for (const p of sourcePredictions) {
    if (
      canEditPrediction(
        { isFinal: p.match.isFinal, startTime: p.match.startTime },
        nowMs
      )
    ) {
      toCopy.push({
        matchId: p.matchId,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        penaltyWinner: p.penaltyWinner,
      })
    } else {
      skippedLocked += 1
    }
  }

  try {
    await prisma.$transaction([
      ...toCopy.map((p) =>
        prisma.prediction.upsert({
          where: {
            userId_matchId_tournamentId: {
              userId,
              matchId: p.matchId,
              tournamentId: targetTournamentId,
            },
          },
          create: {
            userId,
            matchId: p.matchId,
            tournamentId: targetTournamentId,
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            penaltyWinner: p.penaltyWinner,
          },
          update: {
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            penaltyWinner: p.penaltyWinner,
          },
        })
      ),
      ...sourceBonuses.map((b) =>
        prisma.bonusPrediction.upsert({
          where: {
            userId_tournamentId_type: {
              userId,
              tournamentId: targetTournamentId,
              type: b.type,
            },
          },
          create: {
            userId,
            tournamentId: targetTournamentId,
            type: b.type,
            value: b.value,
          },
          update: { value: b.value },
        })
      ),
    ])
  } catch {
    return { ok: false, error: "No se pudieron copiar los pronósticos. Probá de nuevo." }
  }

  revalidatePath("/dashboard")
  revalidatePath(DASHBOARD_SECTION_PATH.matches)
  revalidatePath(DASHBOARD_SECTION_PATH.leagues)

  return {
    ok: true,
    copied: toCopy.length,
    skippedLocked,
    bonusCopied: sourceBonuses.length,
  }
}
