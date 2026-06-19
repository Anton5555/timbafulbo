"use client"

import type { MatchStage } from "@/generated/prisma/client"
import { useLocale, useTranslations } from "next-intl"
import { useMemo } from "react"

export function useMatchLabels() {
  const locale = useLocale()
  const t = useTranslations("matches")

  const dateHeadingFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [locale]
  )

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [locale]
  )

  const shortDateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale]
  )

  const predictionCloseTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [locale]
  )

  function stageLabel(stage: MatchStage, group?: string | null): string {
    if (stage === "GROUP" && group) {
      return t("groupLabel", { letter: group })
    }
    return t(`stages.${stage}`)
  }

  return {
    t,
    locale,
    dateHeadingFmt,
    timeFmt,
    shortDateFmt,
    predictionCloseTimeFmt,
    stageLabel,
  }
}
