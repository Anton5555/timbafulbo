"use client"

import { useTranslations } from "next-intl"

export function DashboardPageHero() {
  const t = useTranslations("dashboard")

  return (
    <div className="border-l-2 border-primary/20 pl-4">
      <p className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
        {t("heroEyebrow")}
      </p>
      <h1 className="mt-1 text-2xl font-black tracking-tighter uppercase italic sm:text-3xl">
        {t("heroTitle")}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {t("heroSubtitle")}
      </p>
    </div>
  )
}
