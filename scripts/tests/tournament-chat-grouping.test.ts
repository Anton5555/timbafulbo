import assert from "node:assert/strict"

import {
  shouldShowChatMessageHeader,
  TOURNAMENT_CHAT_GROUP_WINDOW_MS,
} from "../../lib/tournament-chat-grouping"
import type { TournamentChatMessageRow } from "../../lib/tournament-chat-data"

function msg(
  partial: Partial<TournamentChatMessageRow> & {
    id: string
    userId: string
    createdAt: string
  }
): TournamentChatMessageRow {
  return {
    tournamentId: "t1",
    body: "hola",
    userName: "Ana",
    userImage: null,
    isOwn: false,
    canDelete: false,
    ...partial,
  }
}

const base = new Date("2026-05-20T15:00:00.000Z").getTime()

const messages: TournamentChatMessageRow[] = [
  msg({ id: "1", userId: "u1", createdAt: new Date(base).toISOString() }),
  msg({
    id: "2",
    userId: "u1",
    createdAt: new Date(base + 2 * 60 * 1000).toISOString(),
  }),
  msg({
    id: "3",
    userId: "u1",
    createdAt: new Date(base + TOURNAMENT_CHAT_GROUP_WINDOW_MS + 1000).toISOString(),
  }),
  msg({ id: "4", userId: "u2", createdAt: new Date(base + 8 * 60 * 1000).toISOString() }),
]

assert.equal(shouldShowChatMessageHeader(messages, 0), true)
assert.equal(shouldShowChatMessageHeader(messages, 1), false)
assert.equal(shouldShowChatMessageHeader(messages, 2), false)
assert.equal(shouldShowChatMessageHeader(messages, 3), true)

console.log("tournament-chat-grouping.test.ts: ok")
