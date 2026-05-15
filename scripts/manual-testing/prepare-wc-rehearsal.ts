import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import { FootballDataMatchStatus, PrismaClient } from "../../generated/prisma/client"
import {
  canWriteToDatabase,
  formatRehearsalPhaseWindows,
  hasFlag,
  rehearsalPhaseKickoff,
} from "./wc-rehearsal-utils"

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in environment.")
  }

  if (!canWriteToDatabase(databaseUrl)) {
    throw new Error(
      "Blocked: remote database writes require both --allow-remote and MANUAL_TEST_ALLOW_REMOTE=true.",
    )
  }

  const clearPredictions = hasFlag("clear-predictions")
  const now = Date.now()

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const matches = await prisma.match.findMany({
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      select: { id: true, stage: true },
    })

    if (matches.length === 0) {
      console.log("[wc-rehearsal] No matches found. Run seed first.")
      return
    }

    if (clearPredictions) {
      const deleted = await prisma.prediction.deleteMany()
      console.log(`[wc-rehearsal] Deleted predictions: ${deleted.count}`)
    }

    const ops = matches.map((m) =>
      prisma.match.update({
        where: { id: m.id },
        data: {
          startTime: rehearsalPhaseKickoff(m.stage, now),
          status: FootballDataMatchStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
          penaltyWinner: null,
          isFinal: false,
          lastUpdated: new Date(now),
          apiSyncedAt: new Date(now),
        },
      }),
    )

    await prisma.$transaction(ops)

    console.log(
      `[wc-rehearsal] Prepared ${matches.length} matches. phaseWindows: ${formatRehearsalPhaseWindows()} clearPredictions=${clearPredictions}`,
    )
    console.log(
      "[wc-rehearsal] Matches in each stage share one kickoff (prediction closes at that time). Finalize phases manually when ready.",
    )
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
