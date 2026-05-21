import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"

/** Consecutive messages from the same user within this window share one header. */
export const TOURNAMENT_CHAT_GROUP_WINDOW_MS = 5 * 60 * 1000

export function shouldShowChatMessageHeader(
  messages: TournamentChatMessageRow[],
  index: number
): boolean {
  if (index <= 0) return true
  const prev = messages[index - 1]!
  const curr = messages[index]!
  if (prev.userId !== curr.userId) return true
  const prevMs = new Date(prev.createdAt).getTime()
  const currMs = new Date(curr.createdAt).getTime()
  return currMs - prevMs > TOURNAMENT_CHAT_GROUP_WINDOW_MS
}
