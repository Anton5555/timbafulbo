import type { TournamentRules } from "@/lib/tournament-rules"

function RulesList({ rules }: { rules: TournamentRules }) {
  return (
    <ul className="flex flex-col gap-1 text-xs">
      <li className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Pleno exacto</span>
        <span className="font-black tabular-nums text-foreground">
          {rules.exactScorePoints} pts
        </span>
      </li>
      <li className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Resultado (sin pleno)</span>
        <span className="font-black tabular-nums text-foreground">
          {rules.resultPoints} pts
        </span>
      </li>
      {rules.knockoutMultiplier === 2 ? (
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Bonus de fase</span>
          <span className="font-black text-foreground">
            ×2 en semis, 3er puesto y final
          </span>
        </li>
      ) : null}
    </ul>
  )
}

export function TournamentRulesSummary({
  rules,
  variant = "banner",
}: {
  rules: TournamentRules
  variant?: "banner" | "inline"
}) {
  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-2 border border-dashed border-border bg-muted/10 p-2.5">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Reglas de puntos
        </p>
        <RulesList rules={rules} />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-2 rounded-none border border-dashed border-border bg-muted/10 p-3">
      <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
        Reglas de la timba
      </p>
      <RulesList rules={rules} />
    </section>
  )
}
