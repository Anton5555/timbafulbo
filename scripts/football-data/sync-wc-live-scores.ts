import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "../../generated/prisma/client"
import {
  logSyncSummary,
  syncWcScores,
} from "../../lib/football-data-sync"

function isFullSyncMode(): boolean {
  if (process.argv.includes("--full")) return true
  const envMode = process.env.WC_SYNC_MODE?.trim().toLowerCase()
  return envMode === "full" || envMode === "manual-full-sync"
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    console.error(
      "Missing DATABASE_URL. Set it in .env or GitHub Actions secrets.",
    )
    process.exit(1)
  }

  const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim()
  if (!token) {
    console.error(
      "Missing FOOTBALL_DATA_API_TOKEN. Add it to .env or secrets, then re-run:\n" +
        "  pnpm football-data:sync:wc\n" +
        "  pnpm football-data:sync:wc:full",
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const mode = isFullSyncMode() ? "full" : "incremental"
  console.log(`[sync-wc] Iniciando sincronización mode=${mode}`)
  try {
    const summary = await syncWcScores(prisma, token, mode)
    logSyncSummary(summary)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
