import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { shouldSkipFullSyncUpdate } from "../../lib/football-data-sync"

assert.equal(shouldSkipFullSyncUpdate(null), false, "new API match should import")
assert.equal(
  shouldSkipFullSyncUpdate({ isFinal: false }),
  false,
  "open match should update",
)
assert.equal(
  shouldSkipFullSyncUpdate({ isFinal: true }),
  true,
  "finalized match should be skipped",
)

const syncSource = readFileSync(
  new URL("../../lib/football-data-sync.ts", import.meta.url),
  "utf8",
)

assert.match(
  syncSource,
  /shouldSkipFullSyncUpdate\(before\)/,
  "full sync loop should skip finalized rows",
)

console.log("football-data-sync-full tests passed")
