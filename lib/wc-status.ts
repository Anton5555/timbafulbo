import { prisma } from "@/lib/prisma"

/** True when the global WC FINAL match is finished with scores recorded. */
export async function isWorldCupComplete(): Promise<boolean> {
  const finalMatch = await prisma.match.findFirst({
    where: {
      stage: "FINAL",
      isFinal: true,
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { id: true },
  })

  return finalMatch !== null
}
