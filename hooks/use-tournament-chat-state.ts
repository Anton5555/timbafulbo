"use client"

import { useEffect, useState } from "react"
import { useQueryState } from "nuqs"

import { getTournamentChatMessages } from "@/app/[locale]/(authed)/dashboard/chat/actions"
import { dashboardTournamentParser } from "@/components/dashboard/tournament-search-params"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"

export function useTournamentChatState(
  tournaments: { id: string; name: string }[],
  initialMessages: TournamentChatMessageRow[]
) {
  const [tournamentId, setTournamentId] = useQueryState(
    "tournament",
    dashboardTournamentParser.withOptions({
      shallow: false,
      history: "replace",
    })
  )

  const [messages, setMessages] =
    useState<TournamentChatMessageRow[]>(initialMessages)
  const [loading, setLoading] = useState(false)

  const activeTournament = tournaments.find((t) => t.id === tournamentId)

  useEffect(() => {
    if (!tournamentId) {
      return
    }

    let cancelled = false

    void (async () => {
      setLoading(true)
      const res = await getTournamentChatMessages(tournamentId)
      if (cancelled) return
      setLoading(false)
      if (res.ok) {
        setMessages(res.messages)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tournamentId])

  return {
    tournamentId,
    setTournamentId,
    activeTournament,
    messages,
    setMessages,
    loading,
    hasTournaments: tournaments.length > 0,
  }
}
