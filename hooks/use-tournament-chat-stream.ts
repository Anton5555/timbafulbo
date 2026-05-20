"use client"

import { useEffect, useRef, useState } from "react"

import { getTournamentChatMessages } from "@/app/(authed)/dashboard/chat/actions"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"

export type TournamentChatStreamEvent =
  | { type: "refresh"; messages: TournamentChatMessageRow[] }
  | { type: "deleted"; messageId: string }

export function useTournamentChatStream(
  tournamentId: string | null,
  onEvent: (event: TournamentChatStreamEvent) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseClient>["channel"]
  > | null>(null)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!enabled || !tournamentId) {
      if (channelRef.current) {
        void channelRef.current.unsubscribe()
        channelRef.current = null
      }
      return
    }

    async function refreshMessages() {
      const res = await getTournamentChatMessages(tournamentId!)
      if (res.ok) {
        onEventRef.current({ type: "refresh", messages: res.messages })
      }
    }

    const channel = getSupabaseClient()
      .channel(`tournament_chat_${tournamentId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "TournamentChatMessage",
          filter: `tournamentId=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id
            if (id) {
              onEventRef.current({ type: "deleted", messageId: id })
            }
            return
          }
          void refreshMessages()
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("[useTournamentChatStream] Subscription error:", err)
        }
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe()
        channelRef.current = null
      }
      queueMicrotask(() => setIsConnected(false))
    }
  }, [enabled, tournamentId])

  return { isConnected }
}
