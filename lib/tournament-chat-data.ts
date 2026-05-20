import { prisma } from "@/lib/prisma"
import { userHasTournamentAccess } from "@/lib/tournament-access"

export const TOURNAMENT_CHAT_PAGE_SIZE = 50

export type TournamentChatMessageRow = {
  id: string
  tournamentId: string
  body: string
  createdAt: string
  userId: string
  userName: string
  userImage: string | null
  isOwn: boolean
  canDelete: boolean
}

export async function getTournamentChatMessagesForUser(
  userId: string,
  tournamentId: string
): Promise<TournamentChatMessageRow[] | null> {
  const allowed = await userHasTournamentAccess(userId, tournamentId)
  if (!allowed) return null

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      ownerId: true,
      memberships: {
        where: { userId, role: "ADMIN" },
        select: { id: true },
      },
    },
  })
  const isOwner = tournament?.ownerId === userId
  const isAdmin = (tournament?.memberships.length ?? 0) > 0

  const rows = await prisma.tournamentChatMessage.findMany({
    where: {
      tournamentId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: TOURNAMENT_CHAT_PAGE_SIZE,
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

  return rows
    .reverse()
    .map((row) => ({
      id: row.id,
      tournamentId: row.tournamentId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      userId: row.user.id,
      userName: row.user.name,
      userImage: row.user.image,
      isOwn: row.user.id === userId,
      canDelete:
        row.user.id === userId || isOwner || isAdmin,
    }))
}

export async function userCanModerateTournamentChatMessage(
  userId: string,
  messageId: string
): Promise<boolean> {
  const message = await prisma.tournamentChatMessage.findUnique({
    where: { id: messageId },
    select: {
      userId: true,
      deletedAt: true,
      tournament: {
        select: {
          ownerId: true,
          memberships: {
            where: { userId, role: "ADMIN" },
            select: { id: true },
          },
        },
      },
    },
  })

  if (!message || message.deletedAt !== null) return false
  if (message.userId === userId) return true
  if (message.tournament.ownerId === userId) return true
  return message.tournament.memberships.length > 0
}
