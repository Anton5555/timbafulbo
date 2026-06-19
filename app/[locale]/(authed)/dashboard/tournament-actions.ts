"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { nanoid } from "nanoid"
import { z } from "zod"

import { Prisma } from "@/generated/prisma/client"

import { actionError, actionErrorFromZod } from "@/lib/action-errors"
import { auth } from "@/lib/auth"
import {
  createTournamentInputSchema,
  inviteToTournamentInputSchema,
  INVITATION_EXPIRY_DAYS,
  normalizeInviteEmails,
} from "@/lib/create-tournament-schema"
import { env } from "@/env"
import { generateUniqueInviteCode } from "@/lib/invite-code"
import { sendInvitationEmail } from "@/lib/mailer"
import { prisma } from "@/lib/prisma"

export type CreateTournamentResult =
  | {
      ok: true
      tournamentId: string
      inviteCode: string
      sent: number
      failed: string[]
    }
  | { ok: false; error: string }

async function uniqueInvitationToken(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 16; i++) {
    const candidate = nanoid(32)
    const clash = await tx.invitation.findUnique({
      where: { token: candidate },
      select: { id: true },
    })
    if (!clash) return candidate
  }
  throw new Error("INVITE_TOKEN")
}

const tournamentIdSchema = z.string().trim().min(1).max(40)

export async function createTournament(
  input: unknown
): Promise<CreateTournamentResult> {
  const parsed = createTournamentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: await actionErrorFromZod(parsed.error) }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id
  const ownerEmail = session.user.email ?? null

  const { name, rules } = parsed.data
  const normalizedInvitees = normalizeInviteEmails(
    parsed.data.invitees,
    ownerEmail
  )

  let tournamentId = ""
  let inviteCode = ""
  let tournamentName = ""
  let invitationRows: { email: string; token: string }[] = []

  try {
    const result = await prisma.$transaction(async (tx) => {
      inviteCode = await generateUniqueInviteCode(async (code) => {
        const existing = await tx.tournament.findUnique({
          where: { inviteCode: code },
          select: { id: true },
        })
        return existing !== null
      })

      const tournament = await tx.tournament.create({
        data: {
          name: name.trim(),
          ownerId: userId,
          inviteCode,
          rules: rules as Prisma.InputJsonValue,
        },
        select: { id: true, name: true },
      })

      tournamentId = tournament.id
      tournamentName = tournament.name

      await tx.membership.create({
        data: {
          userId,
          tournamentId: tournament.id,
          role: "ADMIN",
        },
      })

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

      const rows: { email: string; token: string }[] = []

      for (const email of normalizedInvitees) {
        const token = await uniqueInvitationToken(tx)
        await tx.invitation.create({
          data: {
            tournamentId: tournament.id,
            email,
            token,
            invitedById: userId,
            expiresAt,
          },
        })
        rows.push({ email, token })
      }

      return rows
    })

    invitationRows = result
  } catch (e) {
    console.error(e)
    return { ok: false, error: await actionError("createTournamentFailed") }
  }

  const baseUrl = env.APP_BASE_URL.replace(/\/$/, "")
  const inviterName =
    session.user.name?.trim() || session.user.email || "Un jugador"

  const failed: string[] = []

  await Promise.all(
    invitationRows.map(async (row) => {
      try {
        await sendInvitationEmail({
          to: row.email,
          tournamentName,
          inviterName,
          joinUrl: `${baseUrl}/join/${row.token}`,
        })
      } catch {
        failed.push(row.email)
      }
    })
  )

  revalidatePath("/dashboard")

  return {
    ok: true,
    tournamentId,
    inviteCode,
    sent: invitationRows.length - failed.length,
    failed,
  }
}

export type InviteToTournamentResult =
  | {
      ok: true
      sent: number
      failed: string[]
      skipped: string[]
    }
  | { ok: false; error: string }

/** Invites emails to an existing tournament (owner only). Renews revoked/expired invitations. */
export async function inviteToTournament(
  input: unknown
): Promise<InviteToTournamentResult> {
  const parsed = inviteToTournamentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: await actionErrorFromZod(parsed.error) }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id
  const ownerEmail = session.user.email ?? null

  const { tournamentId } = parsed.data
  const normalizedInvitees = normalizeInviteEmails(
    parsed.data.invitees,
    ownerEmail
  )

  if (normalizedInvitees.length === 0) {
    if (parsed.data.invitees.length > 0) {
      return { ok: false, error: await actionError("cannotInviteSelf") }
    }
    return { ok: false, error: await actionError("addAtLeastOneEmail") }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, ownerId: true },
  })
  if (!tournament) {
    return { ok: false, error: await actionError("tournamentNotFound") }
  }
  if (tournament.ownerId !== userId) {
    return { ok: false, error: await actionError("noPermission") }
  }

  const tournamentName = tournament.name
  let invitationRows: { email: string; token: string }[] = []
  const skipped: string[] = []

  const nowMs = Date.now()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

      const rows: { email: string; token: string }[] = []

      for (const email of normalizedInvitees) {
        const existing = await tx.invitation.findUnique({
          where: {
            tournamentId_email: {
              tournamentId,
              email,
            },
          },
        })

        if (existing) {
          if (existing.status === "ACCEPTED") {
            skipped.push(email)
            continue
          }
          if (
            existing.status === "PENDING" &&
            existing.expiresAt.getTime() >= nowMs
          ) {
            skipped.push(email)
            continue
          }

          const token = await uniqueInvitationToken(tx)
          await tx.invitation.update({
            where: { id: existing.id },
            data: {
              token,
              status: "PENDING",
              invitedById: userId,
              expiresAt,
              acceptedAt: null,
              acceptedById: null,
            },
          })
          rows.push({ email, token })
          continue
        }

        const token = await uniqueInvitationToken(tx)
        await tx.invitation.create({
          data: {
            tournamentId,
            email,
            token,
            invitedById: userId,
            expiresAt,
          },
        })
        rows.push({ email, token })
      }

      return rows
    })

    invitationRows = result
  } catch (e) {
    console.error(e)
    return {
      ok: false,
      error: await actionError("createInvitationsFailed"),
    }
  }

  if (invitationRows.length === 0) {
    revalidatePath("/dashboard")
    return { ok: true, sent: 0, failed: [], skipped }
  }

  const baseUrl = env.APP_BASE_URL.replace(/\/$/, "")
  const inviterName =
    session.user.name?.trim() || session.user.email || "Un jugador"

  const failed: string[] = []

  await Promise.all(
    invitationRows.map(async (row) => {
      try {
        await sendInvitationEmail({
          to: row.email,
          tournamentName,
          inviterName,
          joinUrl: `${baseUrl}/join/${row.token}`,
        })
      } catch {
        failed.push(row.email)
      }
    })
  )

  revalidatePath("/dashboard")

  return {
    ok: true,
    sent: invitationRows.length - failed.length,
    failed,
    skipped,
  }
}

export type PendingInvitationDTO = {
  id: string
  email: string
  createdAt: string
  expiresAt: string
}

export type GetPendingInvitationsResult =
  | { ok: true; invitations: PendingInvitationDTO[] }
  | { ok: false; error: string }

export async function getPendingInvitationsForTournament(
  rawTournamentId: unknown
): Promise<GetPendingInvitationsResult> {
  const parsed = tournamentIdSchema.safeParse(rawTournamentId)
  if (!parsed.success) {
    return { ok: false, error: await actionError("invalidTournament") }
  }
  const tournamentId = parsed.data

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ownerId: true },
  })
  if (!tournament) {
    return { ok: false, error: await actionError("tournamentNotFound") }
  }
  if (tournament.ownerId !== userId) {
    return { ok: false, error: await actionError("noPermission") }
  }

  const rows = await prisma.invitation.findMany({
    where: {
      tournamentId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  return {
    ok: true,
    invitations: rows.map((r) => ({
      id: r.id,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    })),
  }
}

export type InvitationActionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function resendInvitation(
  invitationId: string
): Promise<InvitationActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id

  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      tournament: { select: { id: true, name: true, ownerId: true } },
    },
  })

  if (!inv) return { ok: false, error: await actionError("invitationNotFound") }
  if (inv.tournament.ownerId !== userId) {
    return { ok: false, error: await actionError("noPermission") }
  }
  if (inv.status !== "PENDING") {
    return { ok: false, error: await actionError("resendPendingOnly") }
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: await actionError("invitationExpired") }
  }

  const baseUrl = env.APP_BASE_URL.replace(/\/$/, "")
  const inviterName =
    session.user.name?.trim() || session.user.email || "Un jugador"

  try {
    await sendInvitationEmail({
      to: inv.email,
      tournamentName: inv.tournament.name,
      inviterName,
      joinUrl: `${baseUrl}/join/${inv.token}`,
    })
  } catch {
    return { ok: false, error: await actionError("sendEmailFailed") }
  }

  return { ok: true }
}

export async function revokeInvitation(
  invitationId: string
): Promise<InvitationActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id

  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      tournament: { select: { ownerId: true } },
    },
  })

  if (!inv) return { ok: false, error: await actionError("invitationNotFound") }
  if (inv.tournament.ownerId !== userId) {
    return { ok: false, error: await actionError("noPermission") }
  }
  if (inv.status !== "PENDING") {
    return { ok: false, error: await actionError("revokePendingOnly") }
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  })

  revalidatePath("/dashboard")
  return { ok: true }
}

const joinByCodeSchema = z.string().trim().min(3).max(40)

export type JoinTournamentByCodeResult =
  | {
      ok: true
      tournamentId: string
      tournamentName: string
      alreadyMember: boolean
    }
  | { ok: false; error: string }

/** Adds the current user as a member using the tournament public code (`inviteCode`). */
export async function joinTournamentByInviteCode(
  rawCode: unknown,
  /** Set `false` when this runs during an RSC render (e.g. `/join/...`); `revalidatePath` is invalid there. */
  options?: { revalidate?: boolean }
): Promise<JoinTournamentByCodeResult> {
  const shouldRevalidate = options?.revalidate !== false
  const parsed = joinByCodeSchema.safeParse(
    typeof rawCode === "string" ? rawCode : ""
  )
  if (!parsed.success) {
    return { ok: false, error: await actionError("invalidJoinCode") }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id
  const userEmail = session.user.email?.trim().toLowerCase() || null

  const code = parsed.data.replace(/\s+/g, "").toUpperCase()
  if (!code) {
    return { ok: false, error: await actionError("invalidJoinCode") }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, ownerId: true },
  })
  if (!tournament) {
    return {
      ok: false,
      error: await actionError("leagueNotFoundByCode"),
    }
  }

  const tournamentId = tournament.id
  const tournamentName = tournament.name

  async function acceptPendingInviteIfAny(): Promise<void> {
    if (!userEmail) return
    const now = new Date()
    await prisma.invitation.updateMany({
      where: {
        tournamentId,
        email: userEmail,
        status: "PENDING",
        expiresAt: { gte: now },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
        acceptedById: userId,
      },
    })
  }

  const existing = await prisma.membership.findUnique({
    where: {
      userId_tournamentId: {
        userId,
        tournamentId,
      },
    },
    select: { id: true },
  })
  if (existing) {
    try {
      await acceptPendingInviteIfAny()
    } catch {
      // no-op: membership already exists, don't block join flow
    }
    if (shouldRevalidate) {
      revalidatePath("/dashboard")
    }
    return {
      ok: true,
      tournamentId,
      tournamentName,
      alreadyMember: true,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          userId,
          tournamentId,
          role: "MEMBER",
        },
      })

      if (userEmail) {
        const now = new Date()
        await tx.invitation.updateMany({
          where: {
            tournamentId,
            email: userEmail,
            status: "PENDING",
            expiresAt: { gte: now },
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: now,
            acceptedById: userId,
          },
        })
      }
    })
  } catch {
    return { ok: false, error: await actionError("joinFailed") }
  }

  if (shouldRevalidate) {
    revalidatePath("/dashboard")
  }
  return {
    ok: true,
    tournamentId,
    tournamentName,
    alreadyMember: false,
  }
}

export type DeleteTournamentResult =
  | { ok: true }
  | { ok: false; error: string }

/** Only the tournament owner can delete it; DB cascades memberships, invitations, and predictions. */
export async function deleteTournament(
  rawId: unknown
): Promise<DeleteTournamentResult> {
  const parsed = tournamentIdSchema.safeParse(rawId)
  if (!parsed.success) {
    return { ok: false, error: await actionError("invalidTournament") }
  }
  const tournamentId = parsed.data

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    return { ok: false, error: await actionError("noSession") }
  }
  const userId = session.user.id

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, ownerId: true },
  })
  if (!tournament) {
    return { ok: false, error: await actionError("tournamentNotFound") }
  }
  if (tournament.ownerId !== userId) {
    return { ok: false, error: await actionError("deleteTournamentForbidden") }
  }

  try {
    await prisma.tournament.delete({
      where: { id: tournamentId },
    })
  } catch {
    return { ok: false, error: await actionError("deleteTournamentFailed") }
  }

  revalidatePath("/dashboard")
  return { ok: true }
}
