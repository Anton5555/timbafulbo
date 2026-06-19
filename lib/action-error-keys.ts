import { MAX_TOURNAMENT_INVITEES } from "@/lib/create-tournament-schema"
import { TOURNAMENT_CHAT_MAX_BODY_LENGTH } from "@/lib/tournament-chat-validation"

/** Stable keys stored in Zod schemas and validation helpers; resolved via `messages/*.json`. */
export const ACTION_ERROR_KEYS = [
  "invalidData",
  "noSession",
  "noTournamentAccess",
  "matchNotFound",
  "predictionsClosed",
  "penaltyWinnerKnockoutOnly",
  "penaltyWinnerNeedsDraw",
  "penaltyWinnerRequired",
  "noLeaguesToSave",
  "saveFailed",
  "pickOtherLeague",
  "noAccessToLeagues",
  "copyPredictionsFailed",
  "createTournamentFailed",
  "cannotInviteSelf",
  "addAtLeastOneEmail",
  "tournamentNotFound",
  "noPermission",
  "createInvitationsFailed",
  "invalidTournament",
  "invitationNotFound",
  "resendPendingOnly",
  "invitationExpired",
  "sendEmailFailed",
  "revokePendingOnly",
  "invalidJoinCode",
  "leagueNotFoundByCode",
  "joinFailed",
  "deleteTournamentForbidden",
  "deleteTournamentFailed",
  "invalidEmail",
  "maxInvitees",
  "nameRequired",
  "nameTooLong",
  "chatEmptyMessage",
  "chatMessageTooLong",
  "invalidMessage",
  "cannotDeleteMessage",
] as const

export type ActionErrorKey = (typeof ACTION_ERROR_KEYS)[number]

const ACTION_ERROR_KEY_SET = new Set<string>(ACTION_ERROR_KEYS)

export function isActionErrorKey(value: string): value is ActionErrorKey {
  return ACTION_ERROR_KEY_SET.has(value)
}

export function paramsForActionErrorKey(
  key: ActionErrorKey
): Record<string, string | number> | undefined {
  switch (key) {
    case "maxInvitees":
      return { max: MAX_TOURNAMENT_INVITEES }
    case "chatMessageTooLong":
      return { max: TOURNAMENT_CHAT_MAX_BODY_LENGTH }
    default:
      return undefined
  }
}
