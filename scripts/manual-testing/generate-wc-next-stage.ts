import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import type { MatchStage } from "../../generated/prisma/client"
import {
  FootballDataMatchStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import {
  assertStageFullyFinal,
  canWriteToDatabase,
  expectedSlotCountForStage,
  formatRehearsalPhaseWindows,
  getNumberArg,
  isPlaceholderTeamCode,
  listFinalMatchesInStageOrdered,
  manualRehearsalExternalId,
  MANUAL_REHEARSAL_EXTERNAL_PREFIX,
  nextStageAfterCompleted,
  parseRequiredFromStageArg,
  rehearsalPhaseKickoff,
  resolveFinishedMatchWinner,
  seededShuffle,
  warnIfApiPendingKnockoutInStage,
} from "./wc-rehearsal-utils"

function buildUpsertData(
  externalId: string,
  homeTeamId: string,
  awayTeamId: string,
  stage: MatchStage,
  startTime: Date,
  now: Date,
) {
  return {
    footballDataId: null as number | null,
    externalId,
    homeTeamId,
    awayTeamId,
    startTime,
    stage,
    group: null as string | null,
    status: FootballDataMatchStatus.SCHEDULED,
    matchday: null as number | null,
    lastUpdated: now,
    apiSyncedAt: now,
    homeScore: null as number | null,
    awayScore: null as number | null,
    penaltyWinner: null,
    isFinal: false,
  }
}

async function pick32TeamIdsForRoundOf32(prisma: PrismaClient, seed: number) {
  const teams = await prisma.team.findMany({
    where: {
      NOT: {
        code: { startsWith: "TBD" },
      },
    },
    select: { id: true, code: true },
    orderBy: [{ code: "asc" }, { id: "asc" }],
  })

  const realTeams = teams.filter((t) => !isPlaceholderTeamCode(t.code))
  const shuffled = seededShuffle(
    realTeams.map((t) => t.id),
    seed + 424242,
  )

  if (shuffled.length < 32) {
    throw new Error(
      `[wc-rehearsal] Need at least 32 non-placeholder teams for mock ROUND_OF_32, found ${shuffled.length}. Refresh/seed teams first.`,
    )
  }

  return shuffled.slice(0, 32)
}

async function winnersFromPriorKnockoutStage(
  prisma: PrismaClient,
  fromStage: MatchStage,
): Promise<string[]> {
  const matches = await listFinalMatchesInStageOrdered(prisma, fromStage)
  const expected = expectedSlotCountForStage(fromStage)
  if (expected === 0) {
    throw new Error(`[wc-rehearsal] Stage ${fromStage} has no bracket slots.`)
  }
  if (matches.length < expected) {
    throw new Error(
      `[wc-rehearsal] Expected ${expected} final matches in ${fromStage}, found ${matches.length}.`,
    )
  }

  const ordered = matches.slice(0, expected)
  const winners: string[] = []
  for (const m of ordered) {
    const w = resolveFinishedMatchWinner(m)
    if (!w) {
      throw new Error(
        `[wc-rehearsal] Match ${m.id} in ${fromStage} is final but has no resolvable winner (check scores / penaltyWinner for draws).`,
      )
    }
    winners.push(w.winnerId)
  }
  return winners
}

function pairWinners(winners: string[]): Array<[string, string]> {
  if (winners.length % 2 !== 0) {
    throw new Error(
      `[wc-rehearsal] Odd winner count (${winners.length}); cannot pair.`,
    )
  }
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < winners.length; i += 2) {
    pairs.push([winners[i], winners[i + 1]])
  }
  return pairs
}

async function upsertStageMatches(
  prisma: PrismaClient,
  targetStage: MatchStage,
  pairs: Array<[string, string]>,
  now: Date,
) {
  const startTime = rehearsalPhaseKickoff(targetStage, now.getTime())
  const ops = pairs.map(([homeTeamId, awayTeamId], idx) => {
    const slot = idx + 1
    const externalId = manualRehearsalExternalId(targetStage, slot)
    const data = buildUpsertData(
      externalId,
      homeTeamId,
      awayTeamId,
      targetStage,
      startTime,
      now,
    )
    return prisma.match.upsert({
      where: { externalId },
      create: data,
      update: {
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        startTime: data.startTime,
        stage: data.stage,
        group: data.group,
        status: data.status,
        matchday: data.matchday,
        lastUpdated: data.lastUpdated,
        apiSyncedAt: data.apiSyncedAt,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        penaltyWinner: data.penaltyWinner,
        isFinal: data.isFinal,
      },
    })
  })
  await prisma.$transaction(ops)
}

async function generateFromSemiFinals(prisma: PrismaClient, now: Date) {
  const semis = await listFinalMatchesInStageOrdered(prisma, "SEMI_FINALS")
  if (semis.length < 2) {
    throw new Error(
      `[wc-rehearsal] Expected 2 final SEMI_FINALS matches, found ${semis.length}.`,
    )
  }
  const [s0, s1] = semis.slice(0, 2)
  const w0 = resolveFinishedMatchWinner(s0)
  const w1 = resolveFinishedMatchWinner(s1)
  if (!w0 || !w1) {
    throw new Error("[wc-rehearsal] Could not resolve semi-final winners.")
  }

  const finalExt = manualRehearsalExternalId("FINAL", 1)
  const thirdExt = manualRehearsalExternalId("THIRD_PLACE", 1)

  const finalData = buildUpsertData(
    finalExt,
    w0.winnerId,
    w1.winnerId,
    "FINAL",
    rehearsalPhaseKickoff("FINAL", now.getTime()),
    now,
  )
  const thirdData = buildUpsertData(
    thirdExt,
    w0.loserId,
    w1.loserId,
    "THIRD_PLACE",
    rehearsalPhaseKickoff("THIRD_PLACE", now.getTime()),
    now,
  )

  await prisma.$transaction([
    prisma.match.upsert({
      where: { externalId: finalExt },
      create: finalData,
      update: {
        homeTeamId: finalData.homeTeamId,
        awayTeamId: finalData.awayTeamId,
        startTime: finalData.startTime,
        stage: finalData.stage,
        group: finalData.group,
        status: finalData.status,
        matchday: finalData.matchday,
        lastUpdated: finalData.lastUpdated,
        apiSyncedAt: finalData.apiSyncedAt,
        homeScore: finalData.homeScore,
        awayScore: finalData.awayScore,
        penaltyWinner: finalData.penaltyWinner,
        isFinal: finalData.isFinal,
      },
    }),
    prisma.match.upsert({
      where: { externalId: thirdExt },
      create: thirdData,
      update: {
        homeTeamId: thirdData.homeTeamId,
        awayTeamId: thirdData.awayTeamId,
        startTime: thirdData.startTime,
        stage: thirdData.stage,
        group: thirdData.group,
        status: thirdData.status,
        matchday: thirdData.matchday,
        lastUpdated: thirdData.lastUpdated,
        apiSyncedAt: thirdData.apiSyncedAt,
        homeScore: thirdData.homeScore,
        awayScore: thirdData.awayScore,
        penaltyWinner: thirdData.penaltyWinner,
        isFinal: thirdData.isFinal,
      },
    }),
  ])

  console.log(
    `[wc-rehearsal] Generated FINAL (${finalExt}) and THIRD_PLACE (${thirdExt}).`,
  )
}

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

  const fromStage = parseRequiredFromStageArg()
  if (fromStage === "THIRD_PLACE" || fromStage === "FINAL") {
    throw new Error(
      `[wc-rehearsal] No next stage after --from-stage ${fromStage}.`,
    )
  }

  const seed = getNumberArg("seed", 2026, 0)

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const now = new Date()

  try {
    await assertStageFullyFinal(prisma, fromStage)

    if (fromStage === "SEMI_FINALS") {
      await warnIfApiPendingKnockoutInStage(prisma, "FINAL")
      await warnIfApiPendingKnockoutInStage(prisma, "THIRD_PLACE")
      await generateFromSemiFinals(prisma, now)
      console.log(
        `[wc-rehearsal] phaseWindows: ${formatRehearsalPhaseWindows()}`,
      )
      return
    }

    const targetStage = nextStageAfterCompleted(fromStage)
    if (!targetStage) {
      throw new Error(`[wc-rehearsal] No next stage after ${fromStage}.`)
    }

    await warnIfApiPendingKnockoutInStage(prisma, targetStage)

    let pairs: Array<[string, string]>

    if (fromStage === "GROUP") {
      const teamIds = await pick32TeamIdsForRoundOf32(prisma, seed)
      pairs = pairWinners(teamIds)
    } else {
      const winners = await winnersFromPriorKnockoutStage(prisma, fromStage)
      pairs = pairWinners(winners)
    }

    const expectedPairs = expectedSlotCountForStage(targetStage)
    if (pairs.length !== expectedPairs) {
      throw new Error(
        `[wc-rehearsal] Internal error: expected ${expectedPairs} pairs for ${targetStage}, got ${pairs.length}.`,
      )
    }

    await upsertStageMatches(prisma, targetStage, pairs, now)

    console.log(
      `[wc-rehearsal] Generated ${pairs.length} match(es) for ${targetStage} (from ${fromStage}, seed=${seed}). externalId prefix: ${MANUAL_REHEARSAL_EXTERNAL_PREFIX}-`,
    )
    console.log(
      `[wc-rehearsal] phaseWindows: ${formatRehearsalPhaseWindows()}`,
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
