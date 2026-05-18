import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import {
  FootballDataMatchStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import {
  buildSimulatedRehearsalOutcome,
  canWriteToDatabase,
  getNumberArg,
  hasManualRehearsalRowsInStage,
  manualAwareStageWhere,
  parseMatchStageFromArg,
} from "./wc-rehearsal-utils"

const DEFAULT_BATCH_SIZE = 8

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

  const hasCount = process.argv.includes("--count")
  const batchSize = getNumberArg("count", DEFAULT_BATCH_SIZE, 1)
  const seed = getNumberArg("seed", 2026, 0)
  const stage = parseMatchStageFromArg("stage")

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const useManualOnly = stage
      ? await hasManualRehearsalRowsInStage(prisma, stage)
      : false
    const pending = await prisma.match.findMany({
      where: manualAwareStageWhere(stage, false, useManualOnly),
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      ...(stage && !hasCount ? {} : { take: batchSize }),
      select: {
        id: true,
        footballDataId: true,
        stage: true,
        homeTeam: { select: { code: true } },
        awayTeam: { select: { code: true } },
      },
    })

    if (pending.length === 0) {
      console.log(
        stage
          ? `[wc-rehearsal] No pending matches left for stage ${stage}.`
          : "[wc-rehearsal] No pending matches left. Tournament is complete.",
      )
      return
    }

    const now = new Date()
    const updates = pending.map((match) => {
      const outcome = buildSimulatedRehearsalOutcome(match, seed)
      return prisma.match.update({
        where: { id: match.id },
        data: {
          status: FootballDataMatchStatus.FINISHED,
          isFinal: true,
          homeScore: outcome.homeScore,
          awayScore: outcome.awayScore,
          penaltyWinner: outcome.penaltyWinner,
          lastUpdated: now,
          apiSyncedAt: now,
        },
      })
    })

    await prisma.$transaction(updates)

    console.log(
      `[wc-rehearsal] Finalized matches: ${pending.length} (seed=${seed}, stage=${stage ?? "ANY"}, requested=${hasCount ? String(batchSize) : "ALL_FOR_FILTER"})`,
    )
    for (const match of pending) {
      const outcome = buildSimulatedRehearsalOutcome(match, seed)
      const pens =
        outcome.penaltyWinner === null ? "" : ` (pens: ${outcome.penaltyWinner})`
      console.log(
        `  - ${match.homeTeam.code} ${outcome.homeScore}-${outcome.awayScore} ${match.awayTeam.code}${pens}`,
      )
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
