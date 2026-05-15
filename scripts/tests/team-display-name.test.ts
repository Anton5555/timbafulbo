import assert from "node:assert/strict"

import { displayTeamNameEs } from "../../lib/team-display-name"

assert.equal(
  displayTeamNameEs({ name: "Germany", code: "GER" }),
  "Alemania",
)
assert.equal(
  displayTeamNameEs({ name: "United States", code: "USA" }),
  "Estados Unidos",
)
assert.equal(
  displayTeamNameEs({ name: "Ivory Coast", code: "CIV" }),
  "Costa de Marfil",
)
assert.equal(
  displayTeamNameEs({ name: "Netherlands", code: "NED" }),
  "Países Bajos",
)

assert.equal(
  displayTeamNameEs({ name: "Uruguay", code: "URY" }),
  "Uruguay",
)

assert.equal(
  displayTeamNameEs({
    name: "Sin equipo (local) · 42",
    code: "TBD42H",
  }),
  "Sin equipo (local) · 42",
)

assert.equal(
  displayTeamNameEs({ name: "Mystery FC", code: "ZZZ" }),
  "Mystery FC",
)

console.log("team-display-name.test.ts: ok")
