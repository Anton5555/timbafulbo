"use client"

import { FloatingChatWidget } from "@/components/dashboard/tournament-chat/floating-chat-widget"
import { usePeriodicRefresh } from "@/components/dashboard/use-periodic-refresh"
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
  usePeriodicRefresh()

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
