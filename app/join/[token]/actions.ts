"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type AcceptInvitationResult =
  | { ok: true; tournamentId: string }
  | { ok: false; error: string }

export async function acceptInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  const trimmed = token.trim()
  if (!trimmed) {
    return { ok: false, error: "Enlace inválido." }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  const email = session?.user?.email?.trim().toLowerCase()
  if (!userId || !email) {
    return { ok: false, error: "Iniciá sesión para aceptar la invitación." }
  }

  const inv = await prisma.invitation.findUnique({
    where: { token: trimmed },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      tournamentId: true,
    },
  })

  if (!inv) {
    return { ok: false, error: "Invitación no encontrada." }
  }

  if (inv.status === "REVOKED") {
    return { ok: false, error: "Esta invitación fue revocada." }
  }
  if (inv.status === "ACCEPTED") {
    return { ok: false, error: "Esta invitación ya fue aceptada." }
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Esta invitación expiró." }
  }

  if (inv.email !== email) {
    return {
      ok: false,
      error: `Esta invitación es para ${inv.email}. Estás conectado como ${email}.`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_tournamentId: {
            userId,
            tournamentId: inv.tournamentId,
          },
        },
        create: {
          userId,
          tournamentId: inv.tournamentId,
          role: "MEMBER",
        },
        update: {},
      })

      await tx.invitation.update({
        where: { id: inv.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      })
    })
  } catch {
    return { ok: false, error: "No se pudo aceptar. Probá de nuevo." }
  }

  revalidatePath("/dashboard")
  return { ok: true, tournamentId: inv.tournamentId }
}
