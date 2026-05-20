"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import { ChatsCircleIcon } from "@phosphor-icons/react"

import {
  useTournamentChatStream,
  type TournamentChatStreamEvent,
} from "@/hooks/use-tournament-chat-stream"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"
import { cn } from "@/lib/utils"

import { TournamentChatComposer } from "./tournament-chat-composer"
import { TournamentChatMessageList } from "./tournament-chat-message-list"

export function TournamentChatPanel({
  tournamentId,
  tournamentName,
  messages,
  onMessagesChange,
  className,
}: {
  tournamentId: string
  tournamentName: string
  messages: TournamentChatMessageRow[]
  onMessagesChange: Dispatch<SetStateAction<TournamentChatMessageRow[]>>
  className?: string
}) {
  const handleStreamEvent = useCallback(
    (event: TournamentChatStreamEvent) => {
      if (event.type === "refresh") {
        onMessagesChange(event.messages)
        return
      }
      onMessagesChange((prev) => prev.filter((m) => m.id !== event.messageId))
    },
    [onMessagesChange]
  )

  const { isConnected } = useTournamentChatStream(
    tournamentId,
    handleStreamEvent,
    true
  )

  function handleSent(message: TournamentChatMessageRow) {
    onMessagesChange((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }

  function handleDeleted(messageId: string) {
    onMessagesChange((prev) => prev.filter((m) => m.id !== messageId))
  }

  return (
    <section
      className={cn(
        "flex min-h-[20rem] flex-col border border-border bg-card lg:min-h-[24rem]",
        className
      )}
      aria-label={`Chat de ${tournamentName}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <ChatsCircleIcon
            className="size-4 shrink-0 text-primary"
            weight="duotone"
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="truncate text-[10px] font-black tracking-[0.2em] text-primary uppercase">
              Chat
            </h3>
            <p className="truncate text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              {tournamentName}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] font-bold tracking-widest uppercase",
            isConnected ? "text-primary" : "text-muted-foreground"
          )}
          title={isConnected ? "Conectado en tiempo real" : "Reconectando…"}
        >
          {isConnected ? "En vivo" : "…"}
        </span>
      </header>

      <TournamentChatMessageList
        messages={messages}
        onDeleted={handleDeleted}
      />

      <TournamentChatComposer
        tournamentId={tournamentId}
        onSent={handleSent}
      />
    </section>
  )
}
