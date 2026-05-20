"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/env"

let supabaseInstance: SupabaseClient | null = null

/**
 * Browser Supabase client for Realtime subscriptions only.
 * Mutations and reads use Better Auth–protected server actions.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    )
  }

  supabaseInstance = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
      },
      global: {
        headers: {
          "X-Client-Info": "timba-mundial@client",
        },
      },
    }
  )

  return supabaseInstance
}
