import { SkeletonBlock, SkeletonLine } from "./primitives"

function LeagueCardSkeleton() {
  return (
    <SkeletonBlock className="overflow-hidden">
      <div className="space-y-2 border-b border-dashed border-border px-4 py-3">
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-3 w-24" />
      </div>
      <div className="space-y-3 px-4 py-3">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-10 w-full" />
        <SkeletonLine className="h-9 w-full" />
      </div>
    </SkeletonBlock>
  )
}

export function LeaguesTabSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando ligas">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-9 w-36" />
      </div>

      <SkeletonBlock className="space-y-3 px-4 py-4">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="h-3 w-56 max-w-full" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SkeletonLine className="h-11 flex-1" />
          <SkeletonLine className="h-11 w-full sm:w-36" />
        </div>
      </SkeletonBlock>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <LeagueCardSkeleton />
        <LeagueCardSkeleton />
      </div>
    </div>
  )
}
