"use client"

import {
  CheckIcon,
  CopySimpleIcon,
  PlusCircleIcon,
  ShareNetworkIcon,
  SoccerBallIcon,
  TrashIcon,
  TrophyIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useOptimistic, useState, useTransition } from "react"
import { toast } from "sonner"

import { copyPredictionsFromLeague } from "@/app/(authed)/dashboard/prediction-actions"
import {
  deleteTournament,
  joinTournamentByInviteCode,
} from "@/app/(authed)/dashboard/tournament-actions"
import { CreateTournamentResponsiveShell } from "@/components/dashboard/create-tournament/responsive-shell"
import { TournamentRulesSummary } from "@/components/dashboard/tournament-rules-summary"
import { CreateTournamentTrigger } from "@/components/dashboard/create-tournament/create-tournament-trigger"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsDesktopSm } from "@/hooks/use-media-query"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { buildTournamentInvitePath } from "@/lib/invite-url"

import type { MyTournamentRow, TournamentWinner } from "@/lib/dashboard-data"

function formatLeagueWinnerBadge(winner: TournamentWinner): string | null {
  if (!winner.isComplete || winner.winners.length === 0) return null

  if (winner.winners.length === 1) {
    return `Finalizado — Ganador: ${winner.winners[0].displayName}`
  }

  const names = winner.winners.map((w) => w.displayName).join(", ")
  return `Finalizado — Empate: ${names}`
}

function roleLabel(role: MyTournamentRow["role"]): string {
  switch (role) {
    case "ADMIN":
      return "Administrador"
    case "MEMBER":
      return "Miembro"
    default:
      return role
  }
}

function CopyPredictionsFromLeagueDialog({
  targetLeague,
  sourceLeagues,
  open,
  onOpenChange,
  onCopied,
}: {
  targetLeague: MyTournamentRow
  sourceLeagues: MyTournamentRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopied: () => void
}) {
  const [sourceId, setSourceId] = useState(() => sourceLeagues[0]?.id ?? "")
  const [busy, setBusy] = useState(false)

  const effectiveSourceId =
    sourceLeagues.some((l) => l.id === sourceId) ? sourceId : sourceLeagues[0]?.id ?? ""

  async function handleCopy() {
    if (!effectiveSourceId) {
      toast.error("Elegí una liga de origen.")
      return
    }

    setBusy(true)
    const res = await copyPredictionsFromLeague({
      sourceTournamentId: effectiveSourceId,
      targetTournamentId: targetLeague.id,
    })
    setBusy(false)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    const parts: string[] = []
    if (res.copied > 0) {
      parts.push(`Copiados ${res.copied}`)
    } else {
      parts.push("Sin partidos abiertos para copiar")
    }
    if (res.skippedLocked > 0) {
      parts.push(`Omitidos ${res.skippedLocked} (cerrados)`)
    }
    if (res.bonusCopied > 0) {
      parts.push(`Bonus ${res.bonusCopied}`)
    }

    toast.success(parts.join(" · "))
    onOpenChange(false)
    onCopied()
  }

  return (
    <CreateTournamentResponsiveShell
      open={open}
      onOpenChange={onOpenChange}
      title="Copiar pronósticos"
      description={`Destino: ${targetLeague.name}`}
      footer={
        <Button
          type="button"
          variant="default"
          disabled={busy || sourceLeagues.length === 0}
          className="h-12 w-full rounded-none font-black tracking-[0.2em] uppercase"
          onClick={() => void handleCopy()}
        >
          {busy ? (
            <>
              <SoccerBallIcon
                className="size-4 animate-spin"
                weight="duotone"
                aria-hidden
              />
              Copiando…
            </>
          ) : (
            "Copiar"
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor={`copy-source-${targetLeague.id}`}
            className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
          >
            Copiar desde
          </Label>
          <Select
            value={effectiveSourceId}
            onValueChange={setSourceId}
            disabled={busy || sourceLeagues.length === 0}
          >
            <SelectTrigger
              id={`copy-source-${targetLeague.id}`}
              className="w-full rounded-none border-border bg-background font-bold"
            >
              <SelectValue placeholder="Elegí una liga" />
            </SelectTrigger>
            <SelectContent>
              {sourceLeagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-dashed border-border bg-muted/20 px-3 py-3">
          <p className="border-l-2 border-primary pl-2 text-[10px] leading-relaxed font-bold tracking-wide text-muted-foreground uppercase">
            <span className="text-primary">{">"}</span> Solo se copian partidos
            aún abiertos. Sobrescribe pronósticos ya cargados en esta liga.
          </p>
        </div>
      </div>
    </CreateTournamentResponsiveShell>
  )
}

function LeagueCard({
  league,
  winner,
  deletePending,
  onDeleteConfirmed,
  canCopyPredictions,
  sourceLeagues,
  onPredictionsCopied,
}: {
  league: MyTournamentRow
  winner: TournamentWinner
  deletePending: boolean
  onDeleteConfirmed: () => void
  canCopyPredictions: boolean
  sourceLeagues: MyTournamentRow[]
  onPredictionsCopied: () => void
}) {
  const isDesktop = useIsDesktopSm()
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)

  function getInviteUrl(): string {
    const path = buildTournamentInvitePath(league.inviteCode)
    return `${window.location.origin}${path}`
  }

  async function copyInviteUrl(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(getInviteUrl())
      return true
    } catch {
      return false
    }
  }

  async function handleSharePrimaryClick() {
    if (isDesktop) {
      const ok = await copyInviteUrl()
      if (ok) {
        setCopied(true)
        toast.success("Link del torneo copiado.")
        window.setTimeout(() => setCopied(false), 2000)
        return
      }
      toast.error("No se pudo copiar. Revisá los permisos del portapapeles.")
      return
    }
    setShareOpen(true)
  }

  async function handleDrawerCopyLink() {
    setShareBusy(true)
    const ok = await copyInviteUrl()
    setShareBusy(false)
    if (ok) {
      toast.success("Link copiado.")
      setShareOpen(false)
      return
    }
    toast.error("No se pudo copiar.")
  }

  async function handleDrawerNativeShare() {
    const url = getInviteUrl()
    const title = `timbafulbo · ${league.name}`
    const text = `Entrá al torneo «${league.name}» en timbafulbo.`

    if (typeof navigator.share !== "function") {
      const ok = await copyInviteUrl()
      if (ok) {
        toast.success("Link copiado (compartir no disponible en este dispositivo).")
        setShareOpen(false)
      } else {
        toast.error("No se pudo compartir ni copiar.")
      }
      return
    }

    setShareBusy(true)
    try {
      await navigator.share({ title, text, url })
      setShareOpen(false)
    } catch (err: unknown) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : ""
      if (name === "AbortError") {
        setShareBusy(false)
        return
      }
      const ok = await copyInviteUrl()
      if (ok) {
        toast.success("Link copiado.")
        setShareOpen(false)
      } else {
        toast.error("No se pudo compartir. Probá de nuevo.")
      }
    } finally {
      setShareBusy(false)
    }
  }

  function onConfirmDelete() {
    setConfirming(false)
    onDeleteConfirmed()
  }

  const winnerBadgeText = formatLeagueWinnerBadge(winner)

  return (
    <Card size="sm" className="border-border bg-card">
      <CardHeader className="border-b border-dashed border-border pb-3">
        <CardTitle className="text-xs font-black tracking-tight uppercase">
          {league.name}
        </CardTitle>
        <CardDescription className="text-[10px] font-bold tracking-widest uppercase">
          {roleLabel(league.role)}
        </CardDescription>
        {winnerBadgeText ? (
          <div className="mt-2 flex items-start gap-2 border border-primary/30 bg-primary/10 px-2 py-1.5">
            <TrophyIcon
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              weight="duotone"
              aria-hidden
            />
            <p className="text-[10px] font-bold leading-snug tracking-wide text-primary uppercase">
              {winnerBadgeText}
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pt-3">
        <TournamentRulesSummary rules={league.rules} variant="inline" />

        <div className="mt-3 flex flex-col gap-1">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Código de invitación
          </span>
          <code className="border border-border bg-muted/40 px-2 py-1.5 text-center text-sm font-bold tracking-wider uppercase tabular-nums">
            {league.inviteCode}
          </code>
        </div>

        {canCopyPredictions ? (
          <div className="mt-4 border-t border-dashed border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-none font-black tracking-[0.15em] uppercase"
              onClick={() => setCopyOpen(true)}
              aria-label={`Copiar pronósticos a ${league.name} desde otra liga`}
            >
              <CopySimpleIcon className="size-4" weight="duotone" aria-hidden />
              Copiar pronósticos desde…
            </Button>
            <CopyPredictionsFromLeagueDialog
              targetLeague={league}
              sourceLeagues={sourceLeagues}
              open={copyOpen}
              onOpenChange={setCopyOpen}
              onCopied={onPredictionsCopied}
            />
          </div>
        ) : null}

        {league.isOwner ? (
          <div className="mt-4 space-y-3 border-t border-dashed border-border pt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full rounded-none font-black tracking-[0.15em] uppercase"
              onClick={() => void handleSharePrimaryClick()}
              aria-label={
                copied
                  ? "Link copiado"
                  : isDesktop
                    ? "Copiar link del torneo"
                    : "Abrir opciones para compartir torneo"
              }
            >
              {copied ? (
                <CheckIcon className="size-4" weight="duotone" aria-hidden />
              ) : (
                <ShareNetworkIcon className="size-4" weight="duotone" aria-hidden />
              )}
              {copied ? "Copiado" : "Compartir torneo"}
            </Button>

            <Drawer open={shareOpen} onOpenChange={setShareOpen}>
              <DrawerContent className="rounded-none border-border bg-background">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
                    Compartir torneo
                  </DrawerTitle>
                  <DrawerDescription className="text-xs font-normal normal-case">
                    {league.name} · {league.inviteCode}
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter className="gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="w-full rounded-none font-black tracking-[0.15em] uppercase"
                    disabled={shareBusy}
                    onClick={() => void handleDrawerCopyLink()}
                  >
                    Copiar link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-none font-black tracking-[0.15em] uppercase"
                    disabled={shareBusy}
                    onClick={() => void handleDrawerNativeShare()}
                  >
                    Compartir…
                  </Button>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-none font-black tracking-[0.15em] uppercase"
                    >
                      Cerrar
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            {/*
            Invitaciones por correo (Resend) — en pausa. Ver InviteToTournamentTrigger / tournament-actions.

            <div className="rounded-none border border-dashed border-border bg-muted/15 px-3 py-3">
              <Button type="button" variant="secondary" size="sm" disabled className="w-full ...">
                Invitaciones por correo en preparación
              </Button>
            </div>
            */}

            {confirming ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold leading-relaxed tracking-wide text-muted-foreground uppercase">
                  Se van a borrar invitaciones, predicciones, puntajes y todos los miembros de esta liga. Esta acción no se puede deshacer.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deletePending}
                    className="rounded-none font-black tracking-[0.15em] uppercase"
                    onClick={() => setConfirming(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletePending}
                    className="rounded-none font-black tracking-[0.15em] uppercase"
                    onClick={() => void onConfirmDelete()}
                  >
                    {deletePending ? "Eliminando…" : "Eliminar definitivamente"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full rounded-none font-black tracking-[0.15em] uppercase"
                onClick={() => setConfirming(true)}
                aria-label={`Eliminar torneo ${league.name}`}
              >
                <TrashIcon className="size-4" weight="duotone" aria-hidden />
                Eliminar torneo
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function JoinLeagueByCodeBlock() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      toast.error("Ingresá el código de la liga.")
      return
    }

    setBusy(true)
    const res = await joinTournamentByInviteCode(trimmed)
    setBusy(false)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    if (res.alreadyMember) {
      toast.info(`Ya estás en «${res.tournamentName}».`)
    } else {
      toast.success(`Te uniste a «${res.tournamentName}».`)
    }

    setCode("")
    const qs = new URLSearchParams()
    qs.set("tournament", res.tournamentId)
    router.push(`${DASHBOARD_SECTION_PATH.leagues}?${qs.toString()}`)
    router.refresh()
  }

  return (
    <div className="rounded-none border border-dashed border-border bg-muted/10 px-4 py-4 sm:px-5">
      <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
        Unirme con código
      </p>
      <p className="mt-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        Pegá el código que te pasó el administrador (ej. TMB-XXXX).
      </p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
        onSubmit={(e) => void onSubmit(e)}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label
            htmlFor="join-league-code"
            className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
          >
            Código de la liga
          </Label>
          <Input
            id="join-league-code"
            name="inviteCode"
            autoComplete="off"
            spellCheck={false}
            placeholder="TMB-XXXX"
            value={code}
            disabled={busy}
            onChange={(e) => setCode(e.target.value)}
            className="h-11 rounded-none border-border bg-background font-bold tracking-wider uppercase md:h-10"
          />
        </div>
        <Button
          type="submit"
          variant="default"
          disabled={busy || !code.trim()}
          className="h-11 shrink-0 rounded-none font-black tracking-[0.15em] uppercase sm:h-10 sm:min-w-36"
        >
          {busy ? "Uniendo…" : "Unirme"}
        </Button>
      </form>
    </div>
  )
}

export function MyLeaguesTab({
  leagues,
  winnerByTournamentId,
  currentUserEmail,
  inviteFromEmail,
}: {
  leagues: MyTournamentRow[]
  winnerByTournamentId: Record<string, TournamentWinner>
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
  const router = useRouter()
  const [deletePending, startDeleteTransition] = useTransition()
  const [optimisticLeagues, removeLeagueOptimistic] = useOptimistic(
    leagues,
    (state, removedId: string) => state.filter((l) => l.id !== removedId)
  )

  function handleDeleteLeague(leagueId: string) {
    startDeleteTransition(async () => {
      removeLeagueOptimistic(leagueId)
      const res = await deleteTournament(leagueId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Torneo eliminado.")
      router.refresh()
    })
  }

  const listEmpty = optimisticLeagues.length === 0
  const canCopyPredictions = optimisticLeagues.length > 1

  function handlePredictionsCopied() {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Mis ligas
        </h2>
        <CreateTournamentTrigger
          currentUserEmail={currentUserEmail}
          inviteFromEmail={inviteFromEmail}
        >
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-none font-black tracking-[0.15em] uppercase"
          >
            <PlusCircleIcon className="size-4" weight="duotone" aria-hidden />
            Crear torneo
          </Button>
        </CreateTournamentTrigger>
      </div>

      <JoinLeagueByCodeBlock />

      {listEmpty ? (
        <div className="border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-bold tracking-wide uppercase">
            No estás en ninguna liga todavía
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Unite con el código de arriba, con el link que te compartan o creá tu propio torneo.
          </p>
          <CreateTournamentTrigger
            currentUserEmail={currentUserEmail}
            inviteFromEmail={inviteFromEmail}
          >
            <Button
              type="button"
              variant="default"
              className="mt-6 h-12 rounded-none font-black tracking-[0.15em] uppercase"
            >
              <PlusCircleIcon className="size-5" weight="duotone" aria-hidden />
              Lanzá tu primer torneo
            </Button>
          </CreateTournamentTrigger>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {optimisticLeagues.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              winner={
                winnerByTournamentId[league.id] ?? {
                  isComplete: false,
                  winners: [],
                }
              }
              deletePending={deletePending}
              onDeleteConfirmed={() => handleDeleteLeague(league.id)}
              canCopyPredictions={canCopyPredictions}
              sourceLeagues={optimisticLeagues.filter((l) => l.id !== league.id)}
              onPredictionsCopied={handlePredictionsCopied}
            />
          ))}
        </div>
      )}
    </div>
  )
}
