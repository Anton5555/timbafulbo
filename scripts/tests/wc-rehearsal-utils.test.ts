import assert from "node:assert/strict"

import {
  MANUAL_REHEARSAL_EXTERNAL_PREFIX,
  manualAwareStageWhere,
} from "../manual-testing/wc-rehearsal-utils"

assert.deepEqual(
  manualAwareStageWhere("THIRD_PLACE", false, true),
  {
    stage: "THIRD_PLACE",
    isFinal: false,
    externalId: { startsWith: MANUAL_REHEARSAL_EXTERNAL_PREFIX },
  },
  "manual rehearsal stage commands should target manual rows once they exist",
)

assert.deepEqual(
  manualAwareStageWhere("THIRD_PLACE", false, false),
  {
    stage: "THIRD_PLACE",
    isFinal: false,
  },
  "stage commands without manual rows should keep targeting all rows",
)

assert.deepEqual(
  manualAwareStageWhere(null, false, true),
  {
    isFinal: false,
  },
  "unscoped commands should not switch into manual-only mode",
)

console.log("wc-rehearsal-utils tests passed")
