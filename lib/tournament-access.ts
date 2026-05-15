import { prisma } from "@/lib/prisma"

/** User is the tournament owner or a member with an active membership. */
export async function userHasTournamentAccess(
  userId: string,
  tournamentId: string
): Promise<boolean> {
  const row = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    },
    select: { id: true },
  })
  return row !== null
}
