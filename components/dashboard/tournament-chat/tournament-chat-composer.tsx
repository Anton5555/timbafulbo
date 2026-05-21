"use client"

import { useState } from "react"
import { PaperPlaneRightIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { sendTournamentChatMessage } from "@/app/(authed)/dashboard/chat/actions"
import { Button } from "@/components/ui/button"
import { useIsDesktopSm } from "@/hooks/use-media-query"
import { TOURNAMENT_CHAT_MAX_BODY_LENGTH } from "@/lib/tournament-chat-validation"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"
import { cn } from "@/lib/utils"

export function TournamentChatComposer({
  tournamentId,
  onSent,
  disabled,
}: {
  tournamentId: string
  onSent: (message: TournamentChatMessageRow) => void
  disabled?: boolean
}) {
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const isDesktop = useIsDesktopSm()

  async function submitMessage() {
    if (busy || disabled || body.trim().length === 0) return

    setBusy(true)
    const res = await sendTournamentChatMessage({ tournamentId, body })
    setBusy(false)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    setBody("")
    onSent(res.message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submitMessage()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void submitMessage()
    }
  }

  return (
    <form
      className="flex flex-col gap-2 border-t border-border bg-muted/10 p-3"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <label htmlFor={`chat-body-${tournamentId}`} className="sr-only">
        Mensaje del chat
      </label>
      <textarea
        id={`chat-body-${tournamentId}`}
        name="body"
        rows={2}
        maxLength={TOURNAMENT_CHAT_MAX_BODY_LENGTH}
        value={body}
        disabled={busy || disabled}
        placeholder="Escribí un mensaje…"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[4.5rem] w-full resize-none rounded-none border border-input bg-background px-2.5 py-2 text-xs outline-none",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {body.length}/{TOURNAMENT_CHAT_MAX_BODY_LENGTH}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={busy || disabled || body.trim().length === 0}
          className="rounded-none font-black tracking-[0.15em] uppercase"
        >
          <PaperPlaneRightIcon className="size-4" weight="duotone" aria-hidden />
          {busy ? "Enviando…" : isDesktop ? "Enviar ↵" : "Enviar"}
        </Button>
      </div>
    </form>
  )
}
