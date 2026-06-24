"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  TeamResultHistoryItem,
  TeamResultOutcome,
} from "@/lib/team-results-history"
import { useMatchLabels } from "@/hooks/use-match-labels"
import { useIsDesktopSm } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

const OUTCOME_LETTER: Record<TeamResultOutcome, string> = {
  W: "G",
  D: "E",
  L: "P",
}

type TeamHistoryVariant = "tooltip" | "panel"

function TeamHistoryRow({
  item,
  variant,
}: {
  item: TeamResultHistoryItem
  variant: TeamHistoryVariant
}) {
  const t = useTranslations("teamHistory")
  const { stageLabel } = useMatchLabels()

  const outcomeAria =
    item.outcome === "W"
      ? t("won")
      : item.outcome === "D"
        ? t("drew")
        : t("lost")

  return (
    <div className="flex items-center gap-2 text-[10px] leading-tight">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-none text-[9px] font-black tabular-nums",
          variant === "tooltip" && item.outcome === "W" && "bg-background/20 text-background",
          variant === "tooltip" && item.outcome === "D" && "bg-background/10 text-background/80",
          variant === "tooltip" && item.outcome === "L" && "bg-background/5 text-background/60",
          variant === "panel" && item.outcome === "W" && "bg-primary/15 text-primary",
          variant === "panel" && item.outcome === "D" && "bg-muted text-muted-foreground",
          variant === "panel" && item.outcome === "L" && "bg-muted/50 text-muted-foreground/70",
        )}
        aria-label={outcomeAria}
      >
        {OUTCOME_LETTER[item.outcome]}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold tracking-tight uppercase">
        {item.opponent.name}
      </span>
      <span className="shrink-0 font-black tabular-nums">
        {item.teamScore}-{item.opponentScore}
      </span>
      <span
        className={cn(
          "shrink-0 text-[8px] font-bold tracking-widest uppercase",
          variant === "tooltip" && "hidden text-background/60 sm:inline",
          variant === "panel" && "text-muted-foreground",
        )}
      >
        {stageLabel(item.stage)}
      </span>
    </div>
  )
}

export function TeamHistoryTooltipContent({
  teamName,
  history,
  variant = "tooltip",
  showTitle = true,
}: {
  teamName: string
  history: TeamResultHistoryItem[]
  variant?: TeamHistoryVariant
  showTitle?: boolean
}) {
  const t = useTranslations("teamHistory")

  if (history.length === 0) {
    return (
      <p
        className={cn(
          "px-3 py-2 text-center text-[10px] font-bold tracking-widest uppercase",
          variant === "panel" && "text-muted-foreground",
        )}
      >
        {t("noMatches")}
      </p>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        variant === "tooltip" && "max-w-64 px-2.5 py-2",
        variant === "panel" && "gap-2",
      )}
    >
      {showTitle ? (
        <p
          className={cn(
            "text-[9px] font-black tracking-[0.15em] uppercase",
            variant === "tooltip" && "text-background/70",
            variant === "panel" && "text-muted-foreground",
          )}
        >
          {t("title", { team: teamName })}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        {history.map((item) => (
          <TeamHistoryRow
            key={`${item.startTime}-${item.opponent.code}`}
            item={item}
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}

export function TeamHistoryHybridTooltip({
  teamName,
  history,
  open,
  onOpenChange,
  trigger,
}: {
  teamName: string
  history: TeamResultHistoryItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
}) {
  const t = useTranslations("teamHistory")
  const isDesktop = useIsDesktopSm()

  if (isDesktop) {
    return (
      <Tooltip open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 p-0 text-left">
          <TeamHistoryTooltipContent
            teamName={teamName}
            history={history}
            variant="tooltip"
          />
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="flex max-h-[min(70svh,100dvh)] flex-col gap-0 border-border bg-background p-0">
        <DrawerHeader className="shrink-0 border-b border-dashed border-border px-4 pt-2 pb-3 text-left">
          <DrawerTitle className="text-[10px] font-black tracking-[0.25em] text-muted-foreground uppercase">
            {t("title", { team: teamName })}
          </DrawerTitle>
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4",
            "supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <TeamHistoryTooltipContent
            teamName={teamName}
            history={history}
            variant="panel"
            showTitle={false}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
