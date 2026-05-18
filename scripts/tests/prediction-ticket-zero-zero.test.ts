import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const ticketSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/match-prediction-ticket.tsx",
    import.meta.url,
  ),
  "utf8",
)
const matchesTabShellSource = readFileSync(
  new URL(
    "../../components/dashboard/matches-tab/matches-tab-shell.tsx",
    import.meta.url,
  ),
  "utf8",
)

assert.match(
  ticketSource,
  /const \[isTouched, setIsTouched\] = useState\(\s*\(\) => match\.userPrediction !== null,\s*\)/,
  "prediction tickets should track whether the user intentionally touched the score",
)

assert.doesNotMatch(
  ticketSource,
  /baseline === null\s*\?\s*nextHome !== 0 \|\| nextAway !== 0 \|\| eff !== null/,
  "first-time predictions must not treat 0-0 as unchanged",
)

assert.doesNotMatch(
  ticketSource,
  /b === null\s*\?\s*L\.home !== 0 \|\| L\.away !== 0 \|\| eff !== null/,
  "unmount flush must not drop touched first-time 0-0 predictions",
)

assert.match(
  ticketSource,
  /isGhosted={!isTouched}/,
  "untouched first-time prediction scores should render as a ghost state",
)

assert.match(
  ticketSource,
  /match\.userPrediction\?\.homeScore \?\? null/,
  "first-time predictions should initialize home score as null",
)

assert.match(
  ticketSource,
  /match\.userPrediction\?\.awayScore \?\? null/,
  "first-time predictions should initialize away score as null",
)

assert.match(
  ticketSource,
  /value === null \? "—" : value/,
  "unset prediction scores should render as an em dash",
)

assert.match(
  ticketSource,
  /function applyScoreStep\(side: "home" \| "away", delta: -1 \| 1\)/,
  "score steppers should apply deltas with first-click 0-0 initialization",
)

assert.match(
  ticketSource,
  /if \(nextHome === null && nextAway === null\) \{[\s\S]*?nextHome = 0[\s\S]*?nextAway = 0/,
  "first score button click should initialize both sides to 0-0",
)

assert.match(
  ticketSource,
  /function isCompleteScorePair\(/,
  "autosave should require a complete score pair before persisting",
)

assert.match(
  ticketSource,
  /if \(!isCompleteScorePair\(nextHome, nextAway\)\) return/,
  "persist path should skip partial score pairs",
)

assert.match(
  ticketSource,
  /if \(L\.home === null \|\| L\.away === null\) return/,
  "unmount flush should skip partial score pairs",
)

assert.doesNotMatch(
  ticketSource,
  /Tocá para pronosticar|Cambiá el resultado y se guarda solo, incluso si queda 0-0\./,
  "autosave instructions must not be repeated inside every match card",
)

assert.match(
  matchesTabShellSource,
  /Cambiá el resultado y se guarda solo, incluso si querés guardar 0-0\./,
  "the predictions page should show one stable autosave instruction above the cards",
)

assert.match(
  ticketSource,
  /penaltyWinner: eff,\s*applyToAllTournaments,/,
  "autosave should pass applyToAllTournaments to upsertPrediction",
)

assert.match(
  ticketSource,
  /applyToAllTournaments:\s*L\.applyToAllTournaments/,
  "unmount flush should pass applyToAllTournaments snapshot",
)

console.log("prediction-ticket zero-zero tests passed")
