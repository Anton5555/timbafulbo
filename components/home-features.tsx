"use client"

import { NotePencilIcon, TrophyIcon, UsersIcon } from "@phosphor-icons/react"
import { useTranslations } from "next-intl"

export function HomeFeatures() {
  const t = useTranslations("home")

  return (
    <div id="reglas" className="flex flex-col gap-4 scroll-mt-24">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted sm:size-10">
          <TrophyIcon
            className="size-4 sm:size-5"
            weight="duotone"
            aria-hidden
          />
        </div>
        <span>{t("featureTournaments")}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted sm:size-10">
          <NotePencilIcon
            className="size-4 sm:size-5"
            weight="duotone"
            aria-hidden
          />
        </div>
        <span>{t("featureApi")}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted sm:size-10">
          <UsersIcon
            className="size-4 sm:size-5"
            weight="duotone"
            aria-hidden
          />
        </div>
        <span>{t("featureLeaderboards")}</span>
      </div>
    </div>
  )
}
