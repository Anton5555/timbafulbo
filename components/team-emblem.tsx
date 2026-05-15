import { flagCdnW80PngUrlFromTeamCode } from "@/lib/flagcdn"

type TeamEmblemProps = {
  name: string
  code: string
  size?: "sm" | "md"
}

export function TeamEmblem({ name, code, size = "md" }: TeamEmblemProps) {
  const box =
    size === "sm" ? "h-8 w-11" : "h-10 w-14 sm:h-12 sm:w-16"
  const text =
    size === "sm"
      ? "text-[10px] font-bold sm:text-xs"
      : "text-xs font-bold sm:text-sm"
  const label = (code.trim().slice(0, 3).toUpperCase() || "?").slice(0, 3)
  const flagSrc = flagCdnW80PngUrlFromTeamCode(code)

  if (!flagSrc) {
    return (
      <div
        className={`${box} flex items-center justify-center rounded-md border-b-2 border-black/10 bg-muted/30 ${text} tabular-nums text-muted-foreground`}
        aria-hidden
      >
        {label}
      </div>
    )
  }

  return (
    <div className="group relative">
      <div
        className={`${box} relative overflow-hidden rounded-md border-b-2 border-black/20 bg-muted shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md`}
      >
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-white/10 via-transparent to-black/5"
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- FlagCDN static asset */}
        <img
          src={flagSrc}
          alt={name}
          className="h-full w-full object-cover"
          width={80}
          height={60}
          loading="lazy"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-black/10 ring-inset"
          aria-hidden
        />
      </div>
    </div>
  )
}
