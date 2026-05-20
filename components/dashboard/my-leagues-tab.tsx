"use client"

import {
  CheckIcon,
  PlusCircleIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useQueryState } from "nuqs"
import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"

import { getTournamentChatMessages } from "@/app/(authed)/dashboard/chat/actions"
import {
  deleteTournament,
  joinTournamentByInviteCode,
} from "@/app/(authed)/dashboard/tournament-actions"
import { TournamentChatPanel } from "@/components/dashboard/tournament-chat/tournament-chat-panel"
import { dashboardTournamentParser } from "@/components/dashboard/tournament-search-params"
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
import { useIsDesktopSm } from "@/hooks/use-media-query"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { buildTournamentInvitePath } from "@/lib/invite-url"

import type { MyTournamentRow } from "@/lib/dashboard-data"
import type { TournamentChatMessageRow } from "@/lib/tournament-chat-data"
import { cn } from "@/lib/utils"

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

function LeagueCard({
  league,
  deletePending,
  isActive,
  onSelect,
  onDeleteConfirmed,
}: {
  league: MyTournamentRow
  deletePending: boolean
  isActive: boolean
  onSelect: () => void
  onDeleteConfirmed: () => void
}) {
  const isDesktop = useIsDesktopSm()
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)

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

  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer border-border bg-card transition-colors",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`Seleccionar liga ${league.name}`}
    >
      <CardHeader className="border-b border-dashed border-border pb-3">
        <CardTitle className="text-xs font-black tracking-tight uppercase">
          {league.name}
        </CardTitle>
        <CardDescription className="text-[10px] font-bold tracking-widest uppercase">
          {roleLabel(league.role)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Código de invitación
          </span>
          <code className="border border-border bg-muted/40 px-2 py-1.5 text-center text-sm font-bold tracking-wider uppercase tabular-nums">
            {league.inviteCode}
          </code>
        </div>

        {league.isOwner ? (
          <div className="mt-4 space-y-3 border-t border-dashed border-border pt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full rounded-none font-black tracking-[0.15em] uppercase"
              onClick={(e) => {
                e.stopPropagation()
                void handleSharePrimaryClick()
              }}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirming(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletePending}
                    className="rounded-none font-black tracking-[0.15em] uppercase"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onConfirmDelete()
                    }}
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
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirming(true)
                }}
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
  tournaments,
  initialChatMessages,
  currentUserEmail,
  inviteFromEmail,
}: {
  leagues: MyTournamentRow[]
  tournaments: { id: string; name: string }[]
  initialChatMessages: TournamentChatMessageRow[]
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
  const router = useRouter()
  const [tournamentId, setTournamentId] = useQueryState(
    "tournament",
    dashboardTournamentParser.withOptions({
      shallow: false,
      history: "replace",
    })
  )
  const [chatMessages, setChatMessages] =
    useState<TournamentChatMessageRow[]>(initialChatMessages)
  const [chatLoading, setChatLoading] = useState(false)
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
  const activeTournament = tournaments.find((t) => t.id === tournamentId)

  useEffect(() => {
    if (!tournamentId) return

    let cancelled = false

    void (async () => {
      setChatLoading(true)
      const res = await getTournamentChatMessages(tournamentId)
      if (cancelled) return
      setChatLoading(false)
      if (res.ok) {
        setChatMessages(res.messages)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tournamentId])

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {optimisticLeagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                isActive={tournamentId === league.id}
                onSelect={() => {
                  void setTournamentId(league.id)
                }}
                deletePending={deletePending}
                onDeleteConfirmed={() => handleDeleteLeague(league.id)}
              />
            ))}
          </div>

          {activeTournament && tournamentId ? (
            <TournamentChatPanel
              key={tournamentId}
              tournamentId={tournamentId}
              tournamentName={activeTournament.name}
              messages={chatMessages}
              onMessagesChange={setChatMessages}
              className={chatLoading ? "opacity-60" : undefined}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
