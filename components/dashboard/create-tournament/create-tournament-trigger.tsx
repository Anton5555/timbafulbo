"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"

import { CreateTournamentForm } from "@/components/dashboard/create-tournament/create-tournament-form"
import { CreateTournamentResponsiveShell } from "@/components/dashboard/create-tournament/responsive-shell"

export function CreateTournamentTrigger({
  children,
  currentUserEmail,
  inviteFromEmail,
}: {
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
  const t = useTranslations("createTournament")
  const [open, setOpen] = useState(false)
  const [formNonce, setFormNonce] = useState(0)
  const wasOpenRef = useRef(false)

  function handleOpenChange(next: boolean) {
    if (next && !wasOpenRef.current) {
      setFormNonce((n) => n + 1)
    }
    wasOpenRef.current = next
    setOpen(next)
  }

  const trigger = React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e)
      handleOpenChange(true)
    },
  })

  return (
    <>
      {trigger}
      <CreateTournamentResponsiveShell
        open={open}
        onOpenChange={handleOpenChange}
        title={t("triggerTitle")}
        description={t("triggerDescription")}
        footer={
          <p className="text-center text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            {t("triggerFooter")}
          </p>
        }
      >
        <CreateTournamentForm
          key={formNonce}
          currentUserEmail={currentUserEmail}
          inviteFromEmail={inviteFromEmail}
          onSuccess={() => handleOpenChange(false)}
        />
      </CreateTournamentResponsiveShell>
    </>
  )
}
