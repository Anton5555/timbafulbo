"use client"

import { TournamentChatPanel } from "@/components/dashboard/tournament-chat/tournament-chat-panel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTournamentChatState } from "@/hooks/use-tournament-chat-state"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"
import { cn } from "@/lib/utils"

export function TournamentChatView({
  tournaments,
  initialMessages,
  className,
  panelClassName,
  showTournamentFilter = true,
}: {
  tournaments: { id: string; name: string }[]
  initialMessages: TournamentChatMessageRow[]
  className?: string
  panelClassName?: string
  showTournamentFilter?: boolean
}) {
  const {
    tournamentId,
    setTournamentId,
    activeTournament,
    messages,
    setMessages,
    loading,
    hasTournaments,
  } = useTournamentChatState(tournaments, initialMessages)

  if (!hasTournaments) {
    return (
      <div
        className={cn(
          "border border-dashed border-border bg-muted/20 px-4 py-10 text-center",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Unite o creá una liga para usar el chat del torneo.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {showTournamentFilter ? (
        <div className="flex flex-col gap-2.5 border-b border-border bg-muted/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Torneo
          </span>
          <Select
            value={tournamentId ?? ""}
            onValueChange={(v) => {
              void setTournamentId(v)
            }}
          >
            <SelectTrigger size="sm" className="h-9 w-full min-w-0 sm:flex-1">
              <SelectValue placeholder="Elegí un torneo" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {activeTournament && tournamentId ? (
        <TournamentChatPanel
          key={tournamentId}
          tournamentId={tournamentId}
          tournamentName={activeTournament.name}
          messages={messages}
          onMessagesChange={setMessages}
          className={cn(loading && "opacity-60", panelClassName)}
        />
      ) : (
        <div className="border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Elegí un torneo para ver el chat.
          </p>
        </div>
      )}
    </div>
  )
}
