"use client"

import { useEffect, useRef } from "react"
import { TrashIcon } from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { deleteTournamentChatMessage } from "@/app/[locale]/(authed)/dashboard/chat/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SkeletonLine } from "@/components/dashboard/skeletons/primitives"
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

const MESSAGE_LIST_SHELL =
  "flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3"

function ChatMessagesSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      className={MESSAGE_LIST_SHELL}
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="mt-auto flex flex-col gap-2">
        <div className="flex gap-2">
          <SkeletonLine className="size-8 shrink-0" />
          <div className="min-w-0 max-w-[75%] space-y-1">
            <SkeletonLine className="h-2.5 w-16" />
            <SkeletonLine className="h-8 w-full max-w-36" />
          </div>
        </div>
        <div className="flex flex-row-reverse gap-2">
          <SkeletonLine className="size-8 shrink-0" />
          <div className="min-w-0 max-w-[75%] space-y-1">
            <SkeletonLine className="ml-auto h-2.5 w-10" />
            <SkeletonLine className="h-7 w-full max-w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonLine className="size-8 shrink-0" />
          <SkeletonLine className="h-7 w-full max-w-32" />
        </div>
      </div>
    </div>
  )
}

export function TournamentChatMessageList({
  messages,
  onDeleted,
  loading = false,
}: {
  messages: TournamentChatMessageRow[]
  onDeleted: (messageId: string) => void
  loading?: boolean
}) {
  const t = useTranslations("chat")
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(messages.length)

  useEffect(() => {
    if (messages.length >= prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  if (loading && messages.length === 0) {
    return <ChatMessagesSkeleton ariaLabel={t("loadingMessages")} />
  }

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          MESSAGE_LIST_SHELL,
          "items-center justify-center text-center"
        )}
      >
        <p className="text-sm text-muted-foreground">
          {t("noMessages")}
        </p>
      </div>
    )
  }

  return (
    <div className={MESSAGE_LIST_SHELL}>
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
  const t = useTranslations("chat")
  const locale = useLocale()

  async function handleDelete() {
    const res = await deleteTournamentChatMessage(message.id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    onDeleted(message.id)
  }

  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(message.createdAt))

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
              {message.isOwn ? t("you") : message.userName}
            </span>
            <time
              dateTime={message.createdAt}
              className="text-[10px] text-muted-foreground tabular-nums"
            >
              {timeLabel}
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
            aria-label={t("deleteMessage")}
          >
            <TrashIcon className="size-3.5" aria-hidden />
            {t("delete")}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
