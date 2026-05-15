import type { MatchStage } from "@/generated/prisma/client"

export const STAGE_LABEL_ES: Record<MatchStage, string> = {
  GROUP: "Fase de grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "3er puesto",
  FINAL: "Final",
}
