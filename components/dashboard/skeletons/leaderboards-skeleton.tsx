import { SkeletonBlock, SkeletonLine } from "./primitives"

export function LeaderboardsTabSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Cargando clasificaciones"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonLine className="h-3 w-32" />
        <SkeletonLine className="h-9 w-full sm:w-72" />
      </div>

      <SkeletonBlock className="h-12 w-full" />

      <SkeletonBlock className="overflow-hidden p-0">
        <div className="flex gap-4 border-b border-border bg-muted/20 px-4 py-2">
          <SkeletonLine className="h-3 w-6" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="ml-auto h-3 w-8" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/80 px-4 py-3 odd:bg-muted/10"
          >
            <SkeletonLine className="h-4 w-6" />
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="ml-auto h-5 w-10" />
          </div>
        ))}
      </SkeletonBlock>
    </div>
  )
}
