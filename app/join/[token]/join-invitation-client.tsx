"use client"

import { GoogleLogoIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { buildTournamentInvitePath } from "@/lib/invite-url"
import { authClient } from "@/lib/auth-client"

import { acceptInvitation } from "./actions"

export type JoinInvitationView =
  | { kind: "not_found" }
  | { kind: "revoked" }
  | { kind: "accepted" }
  | { kind: "expired" }
  | {
      kind: "pending"
      tournamentName: string
      inviteEmail: string
      sessionEmail: string | null
    }
  | { kind: "public_code"; tournamentName: string; inviteCode: string }
  | { kind: "public_join_failed"; error: string }

export function JoinInvitationClient({
  token,
  view,
}: {
  token: string
  view: JoinInvitationView
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (view.kind === "public_join_failed") {
    return (
      <MessageCard title="No pudimos unirte">
        <p className="mt-2 text-sm text-muted-foreground">{view.error}</p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Button asChild variant="outline" className="mt-3 w-full rounded-none font-black uppercase tracking-widest">
          <Link href="/dashboard">Ir al panel</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "public_code") {
    const { tournamentName, inviteCode } = view
    const joinPath = buildTournamentInvitePath(inviteCode)

    async function signInGoogle() {
      setBusy(true)
      setErr(null)
      const origin = window.location.origin
      const callbackURL = `${origin}${joinPath}`
      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      })
      if (signInError) {
        setErr(signInError.message ?? "No se pudo iniciar sesión con Google.")
      }
      setBusy(false)
    }

    return (
      <MessageCard title={tournamentName}>
        <p className="mt-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Invitación al torneo
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Código:{" "}
          <span className="font-bold text-foreground tabular-nums">{inviteCode}</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Entrá con Google para sumarte a la liga. Si ya tenés cuenta, vas a entrar directo.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="default"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-none font-black uppercase tracking-widest"
            onClick={() => void signInGoogle()}
          >
            <GoogleLogoIcon className="size-5" weight="bold" aria-hidden />
            Ingresar con Google
          </Button>
        </div>
        {err ? (
          <p className="mt-4 text-center text-xs font-medium text-destructive">{err}</p>
        ) : null}
      </MessageCard>
    )
  }

  if (view.kind === "not_found") {
    return (
      <MessageCard title="Enlace no válido">
        <p className="mt-2 text-sm text-muted-foreground">
          No encontramos una invitación ni un torneo con este enlace.
        </p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "revoked") {
    return (
      <MessageCard title="Invitación revocada">
        <p className="mt-2 text-sm text-muted-foreground">
          El administrador canceló esta invitación.
        </p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/dashboard">Ir al panel</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "accepted") {
    return (
      <MessageCard title="Ya estás dentro">
        <p className="mt-2 text-sm text-muted-foreground">
          Esta invitación ya fue usada.
        </p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/dashboard">Ir al panel</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "expired") {
    return (
      <MessageCard title="Invitación expirada">
        <p className="mt-2 text-sm text-muted-foreground">
          Pedile al administrador que te envíe una nueva.
        </p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </MessageCard>
    )
  }

  const { tournamentName, inviteEmail, sessionEmail } = view

  async function signInGoogle() {
    setBusy(true)
    setErr(null)
    const origin = window.location.origin
    const callbackURL = `${origin}/join/${encodeURIComponent(token)}`
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
    })
    setBusy(false)
  }

  async function onAccept() {
    setBusy(true)
    setErr(null)
    const res = await acceptInvitation(token)
    setBusy(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    const qs = new URLSearchParams()
    qs.set("tournament", res.tournamentId)
    router.push(`${DASHBOARD_SECTION_PATH.leagues}?${qs.toString()}`)
    router.refresh()
  }

  return (
    <MessageCard title={tournamentName}>
      <p className="mt-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        Invitación a la liga
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Correo invitado:{" "}
        <span className="font-bold text-foreground">{inviteEmail}</span>
      </p>

      {!sessionEmail ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Entrá con Google usando la misma cuenta que recibió el correo.
          </p>
          <Button
            type="button"
            variant="default"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-none font-black uppercase tracking-widest"
            onClick={() => void signInGoogle()}
          >
            <GoogleLogoIcon className="size-5" weight="bold" aria-hidden />
            Entrar con Google
          </Button>
        </div>
      ) : sessionEmail !== inviteEmail ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-destructive">
            Estás conectado como <strong>{sessionEmail}</strong>, pero esta invitación es para{" "}
            <strong>{inviteEmail}</strong>.
          </p>
          <Button
            type="button"
            variant="outline"
            className="inline-flex w-full items-center justify-center gap-2 rounded-none font-black uppercase tracking-widest"
            disabled={busy}
            onClick={() => void signInGoogle()}
          >
            Cambiar de cuenta
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="default"
            disabled={busy}
            className="h-12 w-full rounded-none font-black uppercase tracking-widest"
            onClick={() => void onAccept()}
          >
            {busy ? "Uniendo…" : "Aceptar invitación"}
          </Button>
        </div>
      )}

      {err ? (
        <p className="mt-4 text-center text-xs font-medium text-destructive">{err}</p>
      ) : null}
    </MessageCard>
  )
}

function MessageCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md border border-border bg-card p-6 shadow-2xl">
      <h1 className="text-lg font-black uppercase tracking-tighter text-primary">{title}</h1>
      {children}
    </div>
  )
}
