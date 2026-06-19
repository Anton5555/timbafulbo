"use client"

import { useTranslations } from "next-intl"

import { SkeletonBlock, SkeletonLine } from "./primitives"

function MatchTicketSkeleton() {
  return (
    <SkeletonBlock className="relative px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <SkeletonLine className="size-10 rounded-full" />
          <SkeletonLine className="h-3 w-16" />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 px-2">
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-6 w-14" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <SkeletonLine className="size-10 rounded-full" />
          <SkeletonLine className="h-3 w-16" />
        </div>
      </div>
    </SkeletonBlock>
  )
}

export function MatchesTabSkeleton() {
  const t = useTranslations("matches")

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("loadingAria")}>
      <SkeletonBlock className="space-y-4 px-3 py-3 sm:px-4">
        <SkeletonLine className="h-3 w-28" />
        <div className="flex flex-wrap gap-2">
          <SkeletonLine className="h-8 w-24" />
          <SkeletonLine className="h-8 w-24" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SkeletonLine className="h-3 w-10" />
          <SkeletonLine className="h-9 w-full max-w-md" />
        </div>
      </SkeletonBlock>

      <SkeletonLine className="h-3 w-64 max-w-full" />

      <div className="flex flex-col gap-3">
        <SkeletonLine className="h-4 w-32" />
        <MatchTicketSkeleton />
        <MatchTicketSkeleton />
        <MatchTicketSkeleton />
      </div>
    </div>
  )
}
