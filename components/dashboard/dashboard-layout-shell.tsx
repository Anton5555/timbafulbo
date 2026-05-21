"use client"

import { FloatingChatWidget } from "@/components/dashboard/tournament-chat/floating-chat-widget"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"

export function DashboardLayoutShell({
  children,
  tournaments,
  initialChatMessages,
}: {
  children: React.ReactNode
  tournaments: { id: string; name: string }[]
  initialChatMessages: TournamentChatMessageRow[]
}) {
  return (
    <>
      {children}
      <FloatingChatWidget
        tournaments={tournaments}
        initialMessages={initialChatMessages}
      />
    </>
  )
}
