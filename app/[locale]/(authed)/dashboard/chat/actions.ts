"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { actionError, resolveActionError } from "@/lib/action-errors"
import { auth } from "@/lib/auth"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { prisma } from "@/lib/prisma"
import {
  getTournamentChatMessagesForUser,
  userCanModerateTournamentChatMessage,
  type TournamentChatMessageRow,
} from "@/lib/tournament-chat-data"
import { userHasTournamentAccess } from "@/lib/tournament-access"
import { normalizeTournamentChatBody } from "@/lib/tournament-chat-validation"

const tournamentIdSchema = z.string().trim().min(1).max(40)
const messageIdSchema = z.string().trim().min(1).max(40)

export type GetTournamentChatMessagesResult =
  | { ok: true; messages: TournamentChatMessageRow[] }
  | { ok: false; error: string }

export type SendTournamentChatMessageResult =
  | { ok: true; message: TournamentChatMessageRow }
  | { ok: false; error: string }

export type DeleteTournamentChatMessageResult =
  | { ok: true }
  | { ok: false; error: string }

function revalidateChatPaths() {
  revalidatePath(DASHBOARD_SECTION_PATH.leaderboards)
  revalidatePath(DASHBOARD_SECTION_PATH.leagues)
}

export async function getTournamentChatMessages(
  tournamentId: string
): Promise<GetTournamentChatMessagesResult> {
  const parsed = tournamentIdSchema.safeParse(tournamentId)
  if (!parsed.success) {
    return { ok: false, error: await actionError("invalidTournament") }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  if (!userId) {
    return { ok: false, error: await actionError("noSession") }
  }

  const messages = await getTournamentChatMessagesForUser(
    userId,
    parsed.data
  )
  if (messages === null) {
    return { ok: false, error: await actionError("noTournamentAccess") }
  }

  return { ok: true, messages }
}

export async function sendTournamentChatMessage(input: {
  tournamentId: string
  body: string
}): Promise<SendTournamentChatMessageResult> {
  const parsedTournament = tournamentIdSchema.safeParse(input.tournamentId)
  if (!parsedTournament.success) {
    return { ok: false, error: await actionError("invalidTournament") }
  }

  const normalized = normalizeTournamentChatBody(input.body)
  if (!normalized.ok) {
    return { ok: false, error: await resolveActionError(normalized.error) }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  if (!userId) {
    return { ok: false, error: await actionError("noSession") }
  }

  const allowed = await userHasTournamentAccess(
    userId,
    parsedTournament.data
  )
  if (!allowed) {
    return { ok: false, error: await actionError("noTournamentAccess") }
  }

  const created = await prisma.tournamentChatMessage.create({
    data: {
      tournamentId: parsedTournament.data,
      userId,
      body: normalized.body,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  })

  revalidateChatPaths()

  return {
    ok: true,
    message: {
      id: created.id,
      tournamentId: created.tournamentId,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
      userId: created.user.id,
      userName: created.user.name,
      userImage: created.user.image,
      isOwn: true,
      canDelete: true,
    },
  }
}

export async function deleteTournamentChatMessage(
  messageId: string
): Promise<DeleteTournamentChatMessageResult> {
  const parsed = messageIdSchema.safeParse(messageId)
  if (!parsed.success) {
    return { ok: false, error: await actionError("invalidMessage") }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const userId = session?.user?.id
  if (!userId) {
    return { ok: false, error: await actionError("noSession") }
  }

  const canDelete = await userCanModerateTournamentChatMessage(
    userId,
    parsed.data
  )
  if (!canDelete) {
    return { ok: false, error: await actionError("cannotDeleteMessage") }
  }

  await prisma.tournamentChatMessage.update({
    where: { id: parsed.data },
    data: { deletedAt: new Date() },
  })

  revalidateChatPaths()

  return { ok: true }
}
