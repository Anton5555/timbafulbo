"use client"

import { useTranslations } from "next-intl"

import type { TournamentRules } from "@/lib/tournament-rules"

function RulesList({ rules }: { rules: TournamentRules }) {
  const t = useTranslations("rules")
  const tCommon = useTranslations("common")

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1 text-xs">
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">{t("exactScore")}</span>
          <span className="font-black tabular-nums text-foreground">
            {rules.exactScorePoints} {tCommon("pts")}
          </span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">{t("resultOnly")}</span>
          <span className="font-black tabular-nums text-foreground">
            {rules.resultPoints} {tCommon("pts")}
          </span>
        </li>
        {rules.knockoutMultiplier === 2 ? (
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{t("phaseBonus")}</span>
            <span className="font-black text-foreground">
              {t("phaseBonusDetail")}
            </span>
          </li>
        ) : null}
      </ul>

      <div className="flex flex-col gap-1.5 border-t border-dashed border-border pt-2">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("knockoutPenalties")}
        </p>
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          <li>{t("knockoutPenaltiesIntro")}</li>
          <li>
            {t("knockoutPenaltiesExact", {
              exactPts: rules.exactScorePoints,
            })}
          </li>
          <li>
            {t("knockoutPenaltiesResult", {
              resultPts: rules.resultPoints,
            })}
          </li>
          <li>{t("knockoutPenaltiesMiss")}</li>
          {rules.knockoutMultiplier === 2 ? (
            <li>{t("knockoutPenaltiesMultiplierNote")}</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}

export function TournamentRulesSummary({
  rules,
  variant = "banner",
}: {
  rules: TournamentRules
  variant?: "banner" | "inline"
}) {
  const t = useTranslations("rules")

  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-2 border border-dashed border-border bg-muted/10 p-2.5">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("pointsRules")}
        </p>
        <RulesList rules={rules} />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-2 rounded-none border border-dashed border-border bg-muted/10 p-3">
      <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
        {t("tournamentRules")}
      </p>
      <RulesList rules={rules} />
    </section>
  )
}
