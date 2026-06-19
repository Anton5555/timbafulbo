export const TOURNAMENT_CHAT_MAX_BODY_LENGTH = 500

export type NormalizeChatBodyResult =
  | { ok: true; body: string }
  | { ok: false; error: string }

export function normalizeTournamentChatBody(raw: string): NormalizeChatBodyResult {
  const body = raw.trim()
  if (body.length === 0) {
    return { ok: false, error: "chatEmptyMessage" }
  }
  if (body.length > TOURNAMENT_CHAT_MAX_BODY_LENGTH) {
    return {
      ok: false,
      error: "chatMessageTooLong",
    }
  }
  return { ok: true, body }
}
