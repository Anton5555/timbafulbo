"use client"

import * as React from "react"
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
        title="> NUEVO_TORNEO"
        description="Configurá tu liga y reglas. Después podés invitar gente desde Mis ligas con Compartir torneo o el código TMB-XXXX."
        footer={
          <p className="text-center text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            timbafulbo · Código y link de invitación
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
