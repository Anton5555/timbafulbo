import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "@/generated/prisma/client"
import { env } from "@/env"
import { flagCdnUrlFromTeamCode } from "@/lib/flagcdn"

async function main() {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const teams = await prisma.team.findMany({
    select: { id: true, code: true, crestUrl: true },
  })

  let updated = 0
  let skipped = 0
  for (const t of teams) {
    const url = flagCdnUrlFromTeamCode(t.code)
    if (!url) {
      skipped += 1
      continue
    }
    if (t.crestUrl === url) {
      skipped += 1
      continue
    }
    await prisma.team.update({
      where: { id: t.id },
      data: { crestUrl: url },
    })
    updated += 1
  }

  await prisma.$disconnect()
  await pool.end()
  console.log(`[backfill-team-flags] updated=${updated} skipped=${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

