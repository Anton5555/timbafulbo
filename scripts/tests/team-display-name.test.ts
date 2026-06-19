import assert from "node:assert/strict"

import { displayTeamName, displayTeamNameEs } from "../../lib/team-display-name"

assert.equal(
  displayTeamNameEs({ name: "Germany", code: "GER" }),
  "Alemania",
)
assert.equal(
  displayTeamName({ name: "Germany", code: "GER" }, "en"),
  "Germany",
)
assert.equal(
  displayTeamNameEs({ name: "United States", code: "USA" }),
  "Estados Unidos",
)
assert.equal(
  displayTeamName({ name: "United States", code: "USA" }, "en"),
  "United States",
)
assert.equal(
  displayTeamNameEs({ name: "Ivory Coast", code: "CIV" }),
  "Costa de Marfil",
)
assert.equal(
  displayTeamName({ name: "Ivory Coast", code: "CIV" }, "en"),
  "Ivory Coast",
)
assert.equal(
  displayTeamNameEs({ name: "Netherlands", code: "NED" }),
  "Países Bajos",
)
assert.equal(
  displayTeamName({ name: "Netherlands", code: "NED" }, "en"),
  "Netherlands",
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
