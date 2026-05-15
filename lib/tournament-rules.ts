import { z } from "zod"

export const tournamentRulesSchema = z.object({
  exactScorePoints: z.number().int().min(0).max(20),
  resultPoints: z.number().int().min(0).max(20),
  knockoutMultiplier: z.union([z.literal(1), z.literal(2)]),
})

export type TournamentRules = z.infer<typeof tournamentRulesSchema>

export const DEFAULT_RULES: TournamentRules = {
  exactScorePoints: 3,
  resultPoints: 1,
  knockoutMultiplier: 1,
}

/** Parse stored Json rules; invalid or missing → defaults (backward compatible). */
export function parseRules(json: unknown): TournamentRules {
  const parsed = tournamentRulesSchema.safeParse(json)
  return parsed.success ? parsed.data : DEFAULT_RULES
}
