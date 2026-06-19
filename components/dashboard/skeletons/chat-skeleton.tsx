"use client"

import { useTranslations } from "next-intl"

import { SkeletonBlock, SkeletonLine } from "./primitives"

export function ChatTabSkeleton() {
  const t = useTranslations("chat")

  return (
    <div
      className="flex min-h-[min(70vh,32rem)] flex-col border border-border"
      aria-busy="true"
      aria-label={t("loadingAria")}
    >
      <div className="flex flex-col gap-2.5 border-b border-border bg-muted/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-9 w-full sm:w-72" />
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <div className="flex justify-start">
          <SkeletonLine className="h-12 w-48 rounded-md" />
        </div>
        <div className="flex justify-end">
          <SkeletonLine className="h-10 w-40 rounded-md" />
        </div>
        <div className="flex justify-start">
          <SkeletonLine className="h-14 w-56 rounded-md" />
        </div>
        <div className="flex justify-end">
          <SkeletonLine className="h-10 w-32 rounded-md" />
        </div>
      </div>

      <SkeletonBlock className="border-x-0 border-b-0 border-t border-border px-3 py-3">
        <SkeletonLine className="h-10 w-full" />
      </SkeletonBlock>
    </div>
  )
}
