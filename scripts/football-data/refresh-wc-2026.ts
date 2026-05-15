import "dotenv/config"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, "../../prisma/data/football-data")
const MATCHES_FILE = join(OUT_DIR, "wc-2026.matches.json")
const TEAMS_FILE = join(OUT_DIR, "wc-2026.teams.json")

const BASE = "https://api.football-data.org/v4"
const COMP = "WC"
const SEASON = 2026

async function main() {
  const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim()
  if (!token) {
    console.error(
      "Missing FOOTBALL_DATA_API_TOKEN. Add it to .env then re-run:\n" +
        "  pnpm football-data:refresh:wc",
    )
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  const headers = { "X-Auth-Token": token }

  const matchesUrl = `${BASE}/competitions/${COMP}/matches?season=${SEASON}`
  const teamsUrl = `${BASE}/competitions/${COMP}/teams?season=${SEASON}`

  const [matchesRes, teamsRes] = await Promise.all([
    fetch(matchesUrl, { headers }),
    fetch(teamsUrl, { headers }),
  ])

  if (!matchesRes.ok) {
    console.error(
      `GET matches failed: ${matchesRes.status}`,
      await matchesRes.text(),
    )
    process.exit(1)
  }
  if (!teamsRes.ok) {
    console.error(`GET teams failed: ${teamsRes.status}`, await teamsRes.text())
    process.exit(1)
  }

  const matchesJson = await matchesRes.json()
  const teamsJson = await teamsRes.json()

  writeFileSync(MATCHES_FILE, JSON.stringify(matchesJson, null, 2), "utf8")
  writeFileSync(TEAMS_FILE, JSON.stringify(teamsJson, null, 2), "utf8")

  const nMatches = Array.isArray(matchesJson.matches)
    ? matchesJson.matches.length
    : 0
  const nTeams = Array.isArray(teamsJson.teams) ? teamsJson.teams.length : 0

  console.log(`Wrote ${MATCHES_FILE}`)
  console.log(`Wrote ${TEAMS_FILE}`)
  console.log(`Matches: ${nMatches}, teams: ${nTeams}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
