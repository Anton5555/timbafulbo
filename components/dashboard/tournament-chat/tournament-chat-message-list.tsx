"use client"

import { useEffect, useRef } from "react"
import { TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { deleteTournamentChatMessage } from "@/app/(authed)/dashboard/chat/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { shouldShowChatMessageHeader } from "@/lib/tournament-chat-grouping"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"
import { cn } from "@/lib/utils"

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function formatMessageTime(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function TournamentChatMessageList({
  messages,
  onDeleted,
}: {
  messages: TournamentChatMessageRow[]
  onDeleted: (messageId: string) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(messages.length)

  useEffect(() => {
    if (messages.length >= prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no hay mensajes. Sé el primero en escribir.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
      {messages.map((message, index) => {
        const showHeader = shouldShowChatMessageHeader(messages, index)
        return (
          <ChatMessageRow
            key={message.id}
            message={message}
            showHeader={showHeader}
            onDeleted={onDeleted}
          />
        )
      })}
      <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
    </div>
  )
}

function ChatMessageRow({
  message,
  showHeader,
  onDeleted,
}: {
  message: TournamentChatMessageRow
  showHeader: boolean
  onDeleted: (messageId: string) => void
}) {
  async function handleDelete() {
    const res = await deleteTournamentChatMessage(message.id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    onDeleted(message.id)
  }

  return (
    <article
      className={cn(
        "flex gap-2.5",
        showHeader ? "mt-3 first:mt-0" : "mt-1",
        message.isOwn ? "flex-row-reverse text-right" : "flex-row text-left"
      )}
    >
      {showHeader ? (
        <Avatar size="sm" className="size-8 shrink-0 border border-border">
          {message.userImage ? (
            <AvatarImage src={message.userImage} alt={message.userName} />
          ) : null}
          <AvatarFallback className="text-[10px] font-bold uppercase">
            {initialsFromName(message.userName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-8 shrink-0" aria-hidden />
      )}
      <div
        className={cn(
          "min-w-0 max-w-[85%] space-y-1",
          message.isOwn ? "items-end" : "items-start"
        )}
      >
        {showHeader ? (
          <div
            className={cn(
              "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
              message.isOwn && "justify-end"
            )}
          >
            <span className="text-[10px] font-bold tracking-wide text-foreground uppercase">
              {message.isOwn ? "Vos" : message.userName}
            </span>
            <time
              dateTime={message.createdAt}
              className="text-[10px] text-muted-foreground tabular-nums"
            >
              {formatMessageTime(message.createdAt)}
            </time>
          </div>
        ) : null}
        <p
          className={cn(
            "wrap-break-word border border-border px-2.5 py-2 text-xs leading-relaxed",
            message.isOwn
              ? "bg-primary/10 text-foreground"
              : "bg-muted/30 text-foreground",
            !showHeader && "mt-0"
          )}
        >
          {message.body}
        </p>
        {message.canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none px-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase hover:text-destructive"
            onClick={() => void handleDelete()}
            aria-label="Eliminar mensaje"
          >
            <TrashIcon className="size-3.5" aria-hidden />
            Eliminar
          </Button>
        ) : null}
      </div>
    </article>
  )
}
