import assert from "node:assert/strict"

import {
  normalizeTournamentChatBody,
  TOURNAMENT_CHAT_MAX_BODY_LENGTH,
} from "../../lib/tournament-chat-validation"

const empty = normalizeTournamentChatBody("   \n\t ")
assert.equal(empty.ok, false)
if (!empty.ok) {
  assert.match(empty.error, /mensaje/i)
}

const ok = normalizeTournamentChatBody("  Hola liga  ")
assert.equal(ok.ok, true)
if (ok.ok) {
  assert.equal(ok.body, "Hola liga")
}

const long = normalizeTournamentChatBody("x".repeat(TOURNAMENT_CHAT_MAX_BODY_LENGTH + 1))
assert.equal(long.ok, false)
if (!long.ok) {
  assert.ok(long.error.includes(String(TOURNAMENT_CHAT_MAX_BODY_LENGTH)))
}

console.log("tournament-chat-validation.test.ts: ok")
