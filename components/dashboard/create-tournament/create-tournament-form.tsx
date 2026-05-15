"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { SoccerBallIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { createTournament } from "@/app/(authed)/dashboard/tournament-actions"
import { SwitchField } from "@/components/forms/fields/switch-field"
import { PointsStepperField } from "@/components/forms/fields/points-stepper-field"
import { TextField } from "@/components/forms/fields/text-field"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import {
  createTournamentInputSchema,
  type CreateTournamentInput,
} from "@/lib/create-tournament-schema"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { DEFAULT_RULES } from "@/lib/tournament-rules"

type CreateTournamentFormProps = {
  /** Reserved for when email invites are re-enabled. */
  currentUserEmail: string | null
  /** Reserved for when email invites are re-enabled. */
  inviteFromEmail: string
  onSuccess: () => void
}

export function CreateTournamentForm({ onSuccess }: CreateTournamentFormProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const form = useForm<CreateTournamentInput>({
    resolver: standardSchemaResolver(createTournamentInputSchema),
    defaultValues: {
      name: "",
      rules: {
        exactScorePoints: DEFAULT_RULES.exactScorePoints,
        resultPoints: DEFAULT_RULES.resultPoints,
        knockoutMultiplier: DEFAULT_RULES.knockoutMultiplier,
      },
      invitees: [],
    },
    mode: "onTouched",
  })

  const nameValue = useWatch({ control: form.control, name: "name" }) ?? ""

  async function onSubmit(data: CreateTournamentInput) {
    setBusy(true)
    const payload: CreateTournamentInput = {
      ...data,
      invitees: [],
    }
    const res = await createTournament(payload)
    setBusy(false)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    const parts = [`Torneo creado · código ${res.inviteCode}`]
    toast.success(parts.join(" · "))
    onSuccess()
    const qs = new URLSearchParams()
    qs.set("tournament", res.tournamentId)
    router.push(`${DASHBOARD_SECTION_PATH.leagues}?${qs.toString()}`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-[clamp(0.75rem,2.25vh,1.75rem)]"
      >
        <section className="flex flex-col gap-[clamp(0.5rem,1.25vh,0.75rem)]">
          <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
            [01] · Identidad
          </p>
          <TextField
            control={form.control}
            name="name"
            label="Nombre del grupo"
            placeholder="La Copa de los Pibes 2026"
            disabled={busy}
            inputClassName="h-10"
          />
          <p className="text-[10px] leading-snug text-muted-foreground">
            <span className="font-bold tracking-widest text-foreground/80 uppercase">
              Código auto:
            </span>{" "}
            se genera al crear (formato{" "}
            <span className="font-black text-foreground">TMB-XXXX</span>) y aparece
            en el toast y en{" "}
            <span className="font-bold text-foreground">Mis ligas</span>.
          </p>
        </section>

        <section className="flex flex-col gap-[clamp(0.5rem,1.5vh,1rem)] rounded-none border border-dashed border-border bg-muted/10 p-3">
          <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
            [02] · Reglas de la timba
          </p>
          <PointsStepperField
            control={form.control}
            name="rules.exactScorePoints"
            label="Pleno exacto"
            suffix="pts"
            disabled={busy}
          />
          <PointsStepperField
            control={form.control}
            name="rules.resultPoints"
            label="Resultado (sin pleno)"
            suffix="pts"
            disabled={busy}
          />
          <SwitchField
            control={form.control}
            name="rules.knockoutMultiplier"
            label="Bonus de fase (×2 en semis, 3er puesto y final)"
            description="Multiplica los puntos de esos partidos."
            disabled={busy}
            trueValue={2}
            falseValue={1}
          />
        </section>

        {/*
        [03] · Invitar amigos — UI en pausa (invitaciones por correo / Resend).
        Cuando se reactive, restaurar esta sección y enlazar con InviteesField / mailer.

        <section className="relative flex flex-col gap-3 overflow-hidden rounded-none border border-dashed border-border bg-muted/15 p-3">
          ...
        </section>
        */}

        <Button
          type="submit"
          disabled={busy || !nameValue.trim()}
          className="h-11 w-full rounded-none font-black tracking-[0.2em] uppercase"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <SoccerBallIcon
                className="size-5 shrink-0 motion-safe:animate-spin"
                weight="duotone"
                aria-hidden
              />
              <span>Lanzando…</span>
            </span>
          ) : (
            <span>Lanzar torneo</span>
          )}
        </Button>
      </form>
    </Form>
  )
}
