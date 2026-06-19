"use client"

import { GoogleLogoIcon } from "@phosphor-icons/react"
import { Link, useRouter, routing } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
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
  const t = useTranslations("join")
  const locale = useLocale() as (typeof routing.locales)[number]
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (view.kind === "public_join_failed") {
    return (
      <MessageCard title={t("joinFailed")}>
        <p className="mt-2 text-sm text-muted-foreground">{view.error}</p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/">{t("backHome")}</Link>
        </Button>
        <Button asChild variant="outline" className="mt-3 w-full rounded-none font-black uppercase tracking-widest">
          <Link href="/dashboard">{t("goDashboard")}</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "public_code") {
    const { tournamentName, inviteCode } = view
    const joinPath = buildTournamentInvitePath(inviteCode, locale)

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
        setErr(signInError.message ?? t("signInError"))
      }
      setBusy(false)
    }

    return (
      <MessageCard title={tournamentName}>
        <p className="mt-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("tournamentInvite")}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("code")}{" "}
          <span className="font-bold text-foreground tabular-nums">{inviteCode}</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{t("publicCodeHint")}</p>
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="default"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-none font-black uppercase tracking-widest"
            onClick={() => void signInGoogle()}
          >
            <GoogleLogoIcon className="size-5" weight="bold" aria-hidden />
            {t("signInGoogle")}
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
      <MessageCard title={t("invalidLink")}>
        <p className="mt-2 text-sm text-muted-foreground">{t("invalidLinkBody")}</p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "revoked") {
    return (
      <MessageCard title={t("revoked")}>
        <p className="mt-2 text-sm text-muted-foreground">{t("revokedBody")}</p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/dashboard">{t("goDashboard")}</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "accepted") {
    return (
      <MessageCard title={t("alreadyIn")}>
        <p className="mt-2 text-sm text-muted-foreground">{t("acceptedBody")}</p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/dashboard">{t("goDashboard")}</Link>
        </Button>
      </MessageCard>
    )
  }

  if (view.kind === "expired") {
    return (
      <MessageCard title={t("expired")}>
        <p className="mt-2 text-sm text-muted-foreground">{t("expiredBody")}</p>
        <Button asChild className="mt-6 rounded-none font-black uppercase tracking-widest">
          <Link href="/">{t("backHome")}</Link>
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
        {t("leagueInvite")}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("invitedEmail")}{" "}
        <span className="font-bold text-foreground">{inviteEmail}</span>
      </p>

      {!sessionEmail ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">{t("inviteSignInHint")}</p>
          <Button
            type="button"
            variant="default"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-none font-black uppercase tracking-widest"
            onClick={() => void signInGoogle()}
          >
            <GoogleLogoIcon className="size-5" weight="bold" aria-hidden />
            {t("enterGoogle")}
          </Button>
        </div>
      ) : sessionEmail !== inviteEmail ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-destructive">
            {t.rich("wrongAccount", {
              sessionEmail: () => <strong>{sessionEmail}</strong>,
              inviteEmail: () => <strong>{inviteEmail}</strong>,
            })}
          </p>
          <Button
            type="button"
            variant="outline"
            className="inline-flex w-full items-center justify-center gap-2 rounded-none font-black uppercase tracking-widest"
            disabled={busy}
            onClick={() => void signInGoogle()}
          >
            {t("switchAccount")}
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
            {busy ? t("joining") : t("acceptInvite")}
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
