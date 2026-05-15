import "dotenv/config"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "../generated/prisma/client"
import type { ApiMatch, ApiTeam } from "../lib/football-data-wc-upsert"
import {
  hasDefinedMatchTeams,
  upsertWcMatchFromApi,
  upsertWcTeamsFromApiList,
} from "../lib/football-data-wc-upsert"

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("[seed] Missing DATABASE_URL.")
    console.error(
      "[seed] Set DATABASE_URL to the target database before running pnpm prisma:seed.",
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log("[seed] Clearing predictions, matches, and teams (世界杯 full resync)…")
  await prisma.prediction.deleteMany()
  await prisma.match.deleteMany()
  await prisma.team.deleteMany()

  const dataDir = join(__dirname, "data/football-data")
  const matchesPath = join(dataDir, "wc-2026.matches.json")
  const teamsPath = join(dataDir, "wc-2026.teams.json")

  let matchesRaw: string
  let teamsRaw: string
  try {
    matchesRaw = readFileSync(matchesPath, "utf8")
    teamsRaw = readFileSync(teamsPath, "utf8")
  } catch {
    console.error(
      `[seed] Missing cached football-data JSON. Run:\n  pnpm football-data:refresh:wc\n\nExpected:\n  ${matchesPath}\n  ${teamsPath}`,
    )
    process.exit(1)
  }

  const matchesDoc = JSON.parse(matchesRaw) as { matches?: ApiMatch[] }
  const teamsDoc = JSON.parse(teamsRaw) as { teams?: ApiTeam[] }

  const apiMatches = matchesDoc.matches ?? []
  const apiTeams = teamsDoc.teams ?? []
  const matchesToImport = apiMatches.filter(hasDefinedMatchTeams)
  const matchesSkipped = apiMatches.length - matchesToImport.length

  await upsertWcTeamsFromApiList(prisma, apiTeams)

  let matchesUpserted = 0
  for (const m of matchesToImport) {
    await upsertWcMatchFromApi(prisma, m)
    matchesUpserted += 1
  }

  await prisma.$disconnect()
  await pool.end()

  console.log(`\n[seed] football-data WC — matches upserted: ${matchesUpserted}`)
  console.log(
    `[seed] Matches skipped (undefined teams): ${matchesSkipped} of ${apiMatches.length}`,
  )
  console.log(`[seed] Teams loaded from cache: ${apiTeams.length}`)
  console.log(`[seed] Kickoffs stored as UTC.\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
