"use client"

import { useEffect, useState } from "react"
import { useQueryState } from "nuqs"

import { getTournamentChatMessages } from "@/app/(authed)/dashboard/chat/actions"
import { TournamentChatPanel } from "@/components/dashboard/tournament-chat/tournament-chat-panel"
import { dashboardTournamentParser } from "@/components/dashboard/tournament-search-params"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LeaderboardRow } from "@/lib/dashboard-data"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"

export function LeaderboardsTab({
  tournaments,
  leaderboardsByTournamentId,
  initialChatMessages,
}: {
  tournaments: { id: string; name: string }[]
  leaderboardsByTournamentId: Record<string, LeaderboardRow[]>
  initialChatMessages: TournamentChatMessageRow[]
}) {
  const [tournamentId, setTournamentId] = useQueryState(
    "tournament",
    dashboardTournamentParser.withOptions({
      shallow: false,
      history: "replace",
    })
  )

  const [chatMessages, setChatMessages] =
    useState<TournamentChatMessageRow[]>(initialChatMessages)
  const [chatLoading, setChatLoading] = useState(false)

  const activeTournament = tournaments.find((t) => t.id === tournamentId)
  const rows = tournamentId
    ? (leaderboardsByTournamentId[tournamentId] ?? [])
    : []

  useEffect(() => {
    if (!tournamentId) return

    let cancelled = false

    void (async () => {
      setChatLoading(true)
      const res = await getTournamentChatMessages(tournamentId)
      if (cancelled) return
      setChatLoading(false)
      if (res.ok) {
        setChatMessages(res.messages)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tournamentId])

  if (tournaments.length === 0) {
    return (
      <div className="border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No tenés torneos para ver clasificaciones. Creá uno o unite con un
          código de invitación.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Filtrar por torneo
        </span>
        <Select
          value={tournamentId ?? ""}
          onValueChange={(v) => {
            void setTournamentId(v)
          }}
        >
          <SelectTrigger size="sm" className="w-full min-w-0 sm:w-72">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
          {rows.length === 0 ? (
            <div className="border border-border bg-muted/10 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no hay puntos registrados en este torneo (o no hay
                partidos finalizados con pronósticos).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[280px] border-collapse text-left text-xs uppercase">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 font-bold tracking-widest text-muted-foreground sm:px-4">
                      #
                    </th>
                    <th className="px-3 py-2 font-bold tracking-widest text-muted-foreground sm:px-4">
                      Jugador
                    </th>
                    <th className="px-3 py-2 text-right font-bold tracking-widest text-muted-foreground sm:px-4">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.userId}
                      className="border-b border-border/80 odd:bg-muted/15 hover:bg-muted/35"
                    >
                      <td className="px-3 py-2.5 font-bold tabular-nums sm:px-4">
                        {index + 1}
                      </td>
                      <td className="max-w-48 truncate px-3 py-2.5 font-medium sm:max-w-none sm:px-4">
                        {row.displayName}
                      </td>
                      <td className="px-3 py-2.5 text-right text-base font-black tabular-nums text-primary sm:px-4 sm:text-lg">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeTournament && tournamentId ? (
          <TournamentChatPanel
            key={tournamentId}
            tournamentId={tournamentId}
            tournamentName={activeTournament.name}
            messages={chatMessages}
            onMessagesChange={setChatMessages}
            className={chatLoading ? "opacity-60" : undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
