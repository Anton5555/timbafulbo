import type { MatchStage } from "@/generated/prisma/client"

/** Eliminaciones directas (no fase de grupos). */
export function isKnockoutStage(stage: MatchStage): boolean {
  return stage !== "GROUP"
}
