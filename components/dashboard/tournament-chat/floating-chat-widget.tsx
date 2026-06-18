"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChatsCircleIcon, XIcon } from "@phosphor-icons/react"

import { TournamentChatView } from "@/components/dashboard/tournament-chat/tournament-chat-view"
import { Button } from "@/components/ui/button"
import { useIsDesktopSm } from "@/hooks/use-media-query"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { cn } from "@/lib/utils"

export function FloatingChatWidget({
  tournaments,
  initialMessages,
}: {
  tournaments: { id: string; name: string }[]
  initialMessages: TournamentChatMessageRow[]
}) {
  const isDesktop = useIsDesktopSm()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (
    !isDesktop ||
    tournaments.length === 0 ||
    pathname === DASHBOARD_SECTION_PATH.chat
  ) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          className={cn(
            "pointer-events-auto flex w-[min(100vw-2rem,22rem)] flex-col sm:w-96",
            "border border-border bg-card shadow-lg shadow-black/20"
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
              Chat del torneo
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-none"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <XIcon className="size-4" aria-hidden />
            </Button>
          </div>
          <TournamentChatView
            tournaments={tournaments}
            initialMessages={initialMessages}
            showTournamentFilter
            panelClassName="h-[min(26rem,58vh)] min-h-0 border-0"
          />
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className={cn(
          "pointer-events-auto size-14 rounded-full border-2 border-primary/30 p-0 shadow-lg shadow-black/25",
          open && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat del torneo"}
        aria-expanded={open}
      >
        <ChatsCircleIcon className="size-7" weight="duotone" aria-hidden />
      </Button>
    </div>
  )
}
