import { STAGE_LABEL_ES } from "@/lib/match-stage-labels"
import type {
  TeamResultHistoryItem,
  TeamResultOutcome,
} from "@/lib/team-results-history"
import { cn } from "@/lib/utils"

const OUTCOME_LABEL_ES: Record<TeamResultOutcome, string> = {
  W: "G",
  D: "E",
  L: "P",
}

function TeamHistoryRow({ item }: { item: TeamResultHistoryItem }) {
  const stageLabel = STAGE_LABEL_ES[item.stage]

  return (
    <div className="flex items-center gap-2 text-[10px] leading-tight">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-none text-[9px] font-black tabular-nums",
          item.outcome === "W" && "bg-background/20 text-background",
          item.outcome === "D" && "bg-background/10 text-background/80",
          item.outcome === "L" && "bg-background/5 text-background/60",
        )}
        aria-label={
          item.outcome === "W"
            ? "Ganó"
            : item.outcome === "D"
              ? "Empató"
              : "Perdió"
        }
      >
        {OUTCOME_LABEL_ES[item.outcome]}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold tracking-tight uppercase">
        {item.opponent.name}
      </span>
      <span className="shrink-0 font-black tabular-nums">
        {item.teamScore}-{item.opponentScore}
      </span>
      <span className="hidden shrink-0 text-[8px] font-bold tracking-widest text-background/60 uppercase sm:inline">
        {stageLabel}
      </span>
    </div>
  )
}

export function TeamHistoryTooltipContent({
  teamName,
  history,
}: {
  teamName: string
  history: TeamResultHistoryItem[]
}) {
  if (history.length === 0) {
    return (
      <p className="px-3 py-2 text-center text-[10px] font-bold tracking-widest uppercase">
        Sin partidos jugados aún
      </p>
    )
  }

  return (
    <div className="flex max-w-64 flex-col gap-1.5 px-2.5 py-2">
      <p className="text-[9px] font-black tracking-[0.15em] text-background/70 uppercase">
        Resultados previos · {teamName}
      </p>
      <div className="flex flex-col gap-1">
        {history.map((item) => (
          <TeamHistoryRow
            key={`${item.startTime}-${item.opponent.code}`}
            item={item}
          />
        ))}
      </div>
    </div>
  )
}
