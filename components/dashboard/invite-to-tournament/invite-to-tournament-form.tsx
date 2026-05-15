"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { EnvelopeSimpleIcon, SoccerBallIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import {
  getPendingInvitationsForTournament,
  inviteToTournament,
  resendInvitation,
  revokeInvitation,
} from "@/app/(authed)/dashboard/tournament-actions"
import { InviteesField } from "@/components/forms/fields/invitees-field"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import {
  inviteEmailsOnlySchema,
  type InviteEmailsOnlyInput,
} from "@/lib/create-tournament-schema"

type PendingRow = {
  id: string
  email: string
  createdAt: string
  expiresAt: string
}

export function InviteToTournamentForm({
  tournamentId,
  leagueName,
  currentUserEmail,
  inviteFromEmail,
  panelOpen,
}: {
  tournamentId: string
  leagueName: string
  currentUserEmail: string | null
  inviteFromEmail: string
  panelOpen: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  /** `undefined` means the list hasn't been loaded for this panel open yet. */
  const [pending, setPending] = useState<PendingRow[] | undefined>(undefined)
  const [actionId, setActionId] = useState<string | null>(null)

  const form = useForm<InviteEmailsOnlyInput>({
    resolver: standardSchemaResolver(inviteEmailsOnlySchema),
    defaultValues: { invitees: [] },
    mode: "onTouched",
  })

  const loadPending = useCallback(async () => {
    const res = await getPendingInvitationsForTournament(tournamentId)
    if (!res.ok) {
      toast.error(res.error)
      setPending([])
      return
    }
    setPending(res.invitations)
  }, [tournamentId])

  useEffect(() => {
    if (!panelOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch al abrir panel; setState ocurre tras await dentro de loadPending
    void loadPending()
  }, [panelOpen, loadPending])

  async function onSubmit(data: InviteEmailsOnlyInput) {
    setBusy(true)
    const res = await inviteToTournament({
      tournamentId,
      invitees: data.invitees,
    })
    setBusy(false)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    const parts: string[] = [`Enviados: ${res.sent}`]
    if (res.failed.length > 0) {
      parts.push(`Fallaron: ${res.failed.join(", ")}`)
    }
    if (res.skipped.length > 0) {
      parts.push(`Sin cambios (pendientes o ya miembro): ${res.skipped.join(", ")}`)
    }
    toast.success(parts.join(" · "))

    form.reset({ invitees: [] })
    await loadPending()
    router.refresh()
  }

  async function onResend(id: string) {
    setActionId(id)
    const res = await resendInvitation(id)
    setActionId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Correo reenviado.")
    await loadPending()
    router.refresh()
  }

  async function onRevoke(id: string) {
    setActionId(id)
    const res = await revokeInvitation(id)
    setActionId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Invitación revocada.")
    await loadPending()
    router.refresh()
  }

  const inviteesValue = useWatch({ control: form.control, name: "invitees" }) ?? []
  const hasInvitees = inviteesValue.length > 0

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-[clamp(0.75rem,2.25vh,1.75rem)]"
      >
        <section className="flex flex-col gap-[clamp(0.5rem,1.25vh,0.75rem)]">
          <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
            [01] · Invitar · {leagueName}
          </p>
          <InviteesField
            control={form.control}
            name="invitees"
            ownerEmail={currentUserEmail}
            disabled={busy}
            inputId={`invite-existing-${tournamentId}`}
          />
          <div
            className="border-l-2 border-primary bg-muted/40 px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
            aria-live="polite"
          >
            <span className="text-foreground/90">{">"}</span> Invitación desde{" "}
            <span className="text-primary">{inviteFromEmail}</span> con link único
            (Resend).
          </div>
        </section>

        <Button
          type="submit"
          disabled={busy || !hasInvitees}
          className="h-11 w-full rounded-none font-black tracking-[0.2em] uppercase"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <SoccerBallIcon
                className="size-5 shrink-0 motion-safe:animate-spin"
                weight="duotone"
                aria-hidden
              />
              <span>Enviando…</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <EnvelopeSimpleIcon className="size-5" weight="duotone" aria-hidden />
              Enviar invitaciones
            </span>
          )}
        </Button>

        <section className="flex flex-col gap-3 border-t border-dashed border-border pt-4">
          <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
            [02] · Invitaciones pendientes
          </p>
          {pending === undefined ? (
            <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              Cargando…
            </p>
          ) : pending.length === 0 ? (
            <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              No hay invitaciones pendientes.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 border border-border bg-muted/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold tracking-wide">
                        {row.email}
                      </p>
                      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                        Vence ·{" "}
                        {new Date(row.expiresAt).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionId !== null}
                        className="rounded-none font-black tracking-[0.12em] uppercase"
                        onClick={() => void onResend(row.id)}
                      >
                        {actionId === row.id ? "…" : "Reenviar"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={actionId !== null}
                        className="rounded-none font-black tracking-[0.12em] uppercase"
                        onClick={() => void onRevoke(row.id)}
                      >
                        {actionId === row.id ? "…" : "Revocar"}
                      </Button>
                    </div>
                  </li>
              ))}
            </ul>
          )}
        </section>
      </form>
    </Form>
  )
}
