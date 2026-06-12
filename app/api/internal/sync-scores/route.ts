import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { syncWcScores } from "@/lib/football-data-sync"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return false

  const token = auth.slice("Bearer ".length).trim()
  const secret = env.SYNC_SCORES_SECRET
  const tokenBuf = Buffer.from(token)
  const secretBuf = Buffer.from(secret)
  if (tokenBuf.length !== secretBuf.length) return false
  return timingSafeEqual(tokenBuf, secretBuf)
}

function parseMode(request: Request): "incremental" | "full" {
  const mode = new URL(request.url).searchParams.get("mode")?.trim().toLowerCase()
  return mode === "full" ? "full" : "incremental"
}

async function handleSync(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const token = env.FOOTBALL_DATA_API_TOKEN?.trim()
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "FOOTBALL_DATA_API_TOKEN is not configured" },
      { status: 500 },
    )
  }

  const mode = parseMode(request)

  try {
    const summary = await syncWcScores(prisma, token, mode)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    console.error("[sync-scores]", error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return handleSync(request)
}

export async function POST(request: Request) {
  return handleSync(request)
}
