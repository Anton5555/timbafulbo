import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { joinTournamentByInviteCode } from "@/app/(authed)/dashboard/tournament-actions"
import { JoinInvitationClient } from "@/app/join/[token]/join-invitation-client"
import type { JoinInvitationView } from "@/app/join/[token]/join-invitation-client"
import { auth } from "@/lib/auth"
import { DASHBOARD_SECTION_PATH } from "@/lib/dashboard-routes"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Invitación",
}

export default async function JoinInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const trimmed = token.trim()

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? null
  const userId = session?.user?.id ?? null

  const inv = await prisma.invitation.findUnique({
    where: { token: trimmed },
    select: {
      email: true,
      status: true,
      expiresAt: true,
      tournament: { select: { name: true } },
    },
  })

  let view: JoinInvitationView

  if (inv) {
    if (inv.status === "REVOKED") {
      view = { kind: "revoked" }
    } else if (inv.status === "ACCEPTED") {
      view = { kind: "accepted" }
    } else if (
      // eslint-disable-next-line react-hooks/purity -- expiration threshold during RSC render
      inv.expiresAt.getTime() < Date.now()
    ) {
      view = { kind: "expired" }
    } else {
      view = {
        kind: "pending",
        tournamentName: inv.tournament.name,
        inviteEmail: inv.email,
        sessionEmail,
      }
    }
  } else {
    const code = trimmed.replace(/\s+/g, "").toUpperCase()
    const tournament =
      code.length > 0
        ? await prisma.tournament.findUnique({
            where: { inviteCode: code },
            select: { id: true, name: true, inviteCode: true },
          })
        : null

    if (!tournament) {
      view = { kind: "not_found" }
    } else if (userId) {
      const res = await joinTournamentByInviteCode(tournament.inviteCode, {
        revalidate: false,
      })
      if (res.ok) {
        redirect(
          `${DASHBOARD_SECTION_PATH.leagues}?tournament=${encodeURIComponent(res.tournamentId)}`
        )
      }
      view = { kind: "public_join_failed", error: res.error }
    } else {
      view = {
        kind: "public_code",
        tournamentName: tournament.name,
        inviteCode: tournament.inviteCode,
      }
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-background font-mono">
      <div
        className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.55_0.12_150/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.12_150/0.06)_1px,transparent_1px)] bg-size-[14px_24px]"
        aria-hidden
      />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <JoinInvitationClient token={trimmed} view={view} />
      </div>
    </div>
  )
}
