"use client"

import * as React from "react"
import { useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { CreateTournamentResponsiveShell } from "@/components/dashboard/create-tournament/responsive-shell"
import { InviteToTournamentForm } from "@/components/dashboard/invite-to-tournament/invite-to-tournament-form"

/** Set to `true` when Resend / correo invites are ready again. */
const EMAIL_INVITES_UI_ENABLED = false

export function InviteToTournamentTrigger({
  children,
  tournamentId,
  leagueName,
  currentUserEmail,
  inviteFromEmail,
}: {
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
  tournamentId: string
  leagueName: string
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
  const t = useTranslations("inviteByEmail")
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
      if (EMAIL_INVITES_UI_ENABLED) {
        handleOpenChange(true)
      }
    },
  })

  return (
    <>
      {trigger}
      {EMAIL_INVITES_UI_ENABLED ? (
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
          <InviteToTournamentForm
            key={formNonce}
            tournamentId={tournamentId}
            leagueName={leagueName}
            currentUserEmail={currentUserEmail}
            inviteFromEmail={inviteFromEmail}
            panelOpen={open}
          />
        </CreateTournamentResponsiveShell>
      ) : null}
    </>
  )
}
