import { cn } from "@/lib/utils"

export function SkeletonLine({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none bg-muted/30",
        className
      )}
      aria-hidden
    />
  )
}

export function SkeletonBlock({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none border border-border bg-muted/10",
        className
      )}
      aria-hidden
    >
      {children}
    </div>
  )
}
