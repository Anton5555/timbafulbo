import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    REMOTE_DATABASE_URL: z.url().optional(),
    ALLOW_REMOTE_MIGRATION: z.enum(["true", "false"]).default("false"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /** football-data.org API token (`X-Auth-Token`). Used by sync scripts and /api/internal/sync-scores. */
    FOOTBALL_DATA_API_TOKEN: z.string().optional(),
    /** Bearer secret for cron-triggered score sync (`/api/internal/sync-scores`). */
    SYNC_SCORES_SECRET: z.string().min(16),
    /**
     * Resend API key. Optional: when unset, invitation emails are skipped
     * (the action still creates `Invitation` rows; share the code/link manually).
     */
    RESEND_API_KEY: z.string().min(1).optional(),
    /**
     * Verified Resend sender, e.g. `timbafulbo <invites@domain.com>`.
     * Defaults to the Resend sandbox label so the UI always has something to show.
     */
    INVITE_FROM_EMAIL: z
      .string()
      .min(1)
      .default("timbafulbo <onboarding@resend.dev>"),
    /** Absolute base URL for email links (fallback: BETTER_AUTH_URL). */
    APP_BASE_URL: z.url(),
  },

  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REMOTE_DATABASE_URL: process.env.REMOTE_DATABASE_URL,
    ALLOW_REMOTE_MIGRATION: process.env.ALLOW_REMOTE_MIGRATION,
    NODE_ENV: process.env.NODE_ENV,
    FOOTBALL_DATA_API_TOKEN: process.env.FOOTBALL_DATA_API_TOKEN,
    SYNC_SCORES_SECRET: process.env.SYNC_SCORES_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    INVITE_FROM_EMAIL: process.env.INVITE_FROM_EMAIL,
    APP_BASE_URL: process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
})
