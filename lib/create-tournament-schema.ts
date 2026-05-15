import { z } from "zod"

import { tournamentRulesSchema } from "@/lib/tournament-rules"

export const MAX_TOURNAMENT_INVITEES = 50

export const INVITATION_EXPIRY_DAYS = 14

const emailItemSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email inválido.")

/** Email list only (shared by create-tournament and invite-to-existing-tournament flows). */
export const inviteEmailsOnlySchema = z.object({
  invitees: z
    .array(emailItemSchema)
    .max(
      MAX_TOURNAMENT_INVITEES,
      `Máximo ${MAX_TOURNAMENT_INVITEES} invitados por torneo.`
    ),
})

export const createTournamentInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(120, "El nombre es demasiado largo."),
    rules: tournamentRulesSchema,
  })
  .merge(inviteEmailsOnlySchema)

export type CreateTournamentInput = z.infer<typeof createTournamentInputSchema>

export type InviteEmailsOnlyInput = z.infer<typeof inviteEmailsOnlySchema>

export const inviteToTournamentInputSchema = inviteEmailsOnlySchema.extend({
  tournamentId: z.string().trim().min(1).max(40),
})

export type InviteToTournamentInput = z.infer<typeof inviteToTournamentInputSchema>

/** Normalizes, deduplicates, and excludes the owner. */
export function normalizeInviteEmails(
  emails: string[],
  ownerEmail: string | null | undefined
): string[] {
  const owner = ownerEmail?.trim().toLowerCase() ?? ""
  const set = new Set<string>()
  for (const raw of emails) {
    const e = raw.trim().toLowerCase()
    if (!e || e === owner) continue
    set.add(e)
  }
  return [...set]
}
