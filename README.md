# timbafulbo

Next.js app with Prisma + PostgreSQL.

## Better Auth (Google OAuth only)

This project is configured for Better Auth using Google OAuth (no email/password flow).

### Environment variables

For the full list (local, Vercel, GitHub Actions), copy [.env.example](.env.example) to `.env` and fill it in:

```bash
cp .env.example .env
```

Auth-specific variables you must set locally:

```env
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="<generate-with: openssl rand -base64 32>"
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"
```

For Vercel and GitHub Actions, see [Production deploy (Vercel + Supabase)](#production-deploy-vercel--supabase) below.

### Google Cloud OAuth callback URL

In your Google Cloud OAuth app, add this authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

### Auth routes and pages

- API handler: `app/api/auth/[...all]/route.ts`
- Better Auth config: `lib/auth.ts`
- Better Auth client: `lib/auth-client.ts`
- Sign in: use Google from the home page (`app/page.tsx`), which also shows the next upcoming matches from the database.

## Prisma workflow (safe local first)

This project is configured to avoid accidental remote migrations.

### 1) Local development database

Set `DATABASE_URL` in `.env` to your local PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/timbafulbo?schema=public"
```

Start from the template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2) Validate and generate client

```bash
pnpm prisma:validate
pnpm prisma:generate
```

### 3) Create/apply local migrations

Create and apply migration to your local DB:

```bash
pnpm prisma:migrate:dev -- --name init_worldcup_schema
```

Create migration files without applying:

```bash
pnpm prisma:migrate:create -- --name add_bonus_points
```

### 4) Seed World Cup (`WC`) from football-data.org cache

1. Add `FOOTBALL_DATA_API_TOKEN` to `.env` (same token as in your football-data.org account). See [.env.example](.env.example).

2. Download and cache API responses (writes `prisma/data/football-data/wc-2026.matches.json` and `wc-2026.teams.json`):

```bash
pnpm football-data:refresh:wc
```

3. Load teams and **all** fixtures into the database:

```bash
pnpm prisma:seed
```

**Local wipe:** this seed deletes **all** `Prediction`, `Match`, and `Team` rows before importing (avoids unique conflicts with older manual JSON seeds). Re-run after pulling cache updates.

**Timezone:** kickoffs use API `utcDate` (UTC). Format for users on the client with `Intl` or `date-fns-tz`.

**Undefined teams:** if the API omits a side’s team id (e.g. knockout slots not yet drawn), the seed **skips** that fixture instead of creating placeholder teams. Knockout pairings appear after a full sync or via manual rehearsal scripts.

### 4b) Match sync — incremental and full (production / CI)

The seed wipes and reloads everything; to sync live data from football-data.org without deleting predictions there are two modes (same script):

- **Incremental:** updates **only** match scores and status for matches in the upcoming window (see below).
- **Full (`pnpm football-data:sync:wc:full`):** upserts **all** competition teams and **all** WC matches (includes newly created knockout pairings and schedule/team changes).

- **Requirements in `.env`:** `DATABASE_URL` and `FOOTBALL_DATA_API_TOKEN` (same token as the refresh step).

**Incremental mode**

- Finds matches with `isFinal = false` and `startTime <= now + 2h` (already started/finished or starting soon). If there are none, it exits **without calling the API** (0 requests).
- If there are candidates, it calls `GET /v4/competitions/WC/matches?season=2026`, matches by `footballDataId` (or `externalId` like `fd-<id>`), and updates only when typed API `status`, goals, penalty winner (`penaltyWinner` when applicable), `lastUpdated`, or `isFinal` changed. Each successful update also sets `apiSyncedAt` to the current time (audit: when this app last persisted API-backed fields).

**Full mode**

- Calls `GET .../matches?season=2026` and `GET .../teams?season=2026` in parallel, upserts teams and **all** matches (creates new pairings, updates `stage`, teams, kickoff time, scores). **Does not delete** predictions.

```bash
pnpm prisma:generate   # if you haven't generated the client in this clone yet
pnpm football-data:sync:wc          # incremental (scores, +2h window)
pnpm football-data:sync:wc:full     # full: GET matches + teams, full upsert
# equivalent: WC_SYNC_MODE=full pnpm football-data:sync:wc
```

**GitHub Actions:** the workflow [.github/workflows/sync-wc-scores.yml](.github/workflows/sync-wc-scores.yml) runs every **5 minutes** (incremental) and via `workflow_dispatch`, where you can choose **incremental** or **full** mode. In the repo, add these **repository secrets** (Settings → Secrets and variables → Actions):

- `DATABASE_URL` — Supabase **Session Pooler** URL (port `5432`); IPv4-reachable from GitHub-hosted runners. See [Production deploy (Vercel + Supabase)](#production-deploy-vercel--supabase) for the URL template.
- `FOOTBALL_DATA_API_TOKEN` — football-data.org token.

It does not require Resend or other Next `env.ts` variables: the script reads only `DATABASE_URL` and `FOOTBALL_DATA_API_TOKEN` from `process.env`.

### Predictions and scoring — knockout and penalties

- **Group stage:** you only predict the scoreline (draws can happen without penalties).
- **Knockout (all KO instances):** you can predict a draw in the scoreline. If the predicted result is a draw, the **penalty winner** option appears (home or away).
- **Scoring:** if the real match ends as a draw in the stored scoreline (regular time per the API), points also depend on getting the penalty winner right. **If you predict the draw but miss the penalty winner, you get 0 points** for that match.
- The official winner for drawn KO matches comes from football-data (`score.winner`) once the match is `FINISHED`; incremental sync also updates that field.

### 5) Open Prisma Studio (optional)

```bash
pnpm prisma:studio
```

## Manual full-tournament rehearsal (with friends)

Use this flow to test a full tournament before real WC matches happen. In Cursor, open the **WC manual rehearsal** canvas (`canvases/wc-manual-rehearsal-guide.canvas.tsx`) beside the chat for a step-by-step checklist.

**CLI env files:** `pnpm prisma:seed`, `football-data:*`, and `manual-test:wc:*` load **`.env` only** (via `dotenv/config`), not `.env.local`. Put `DATABASE_URL` and tokens the scripts need in `.env`, or set them in the shell for one-off prod runs. `pnpm dev` uses both `.env` and `.env.local` (`.env.local` wins on conflicts).

### 1) Load current WC fixtures

```bash
pnpm football-data:refresh:wc
pnpm prisma:seed
```

The seed skips API fixtures without both team ids (no placeholder knockout rows). See [§4 Seed World Cup](#4-seed-world-cup-wc-from-football-dataorg-cache) above.

### 2) Rehearsal reset: reopen all matches and set phase kickoffs

```bash
pnpm manual-test:wc:prepare

# optional: wipe all predictions first
pnpm manual-test:wc:prepare -- --clear-predictions
```

**Phase prediction windows** — every match in a stage shares one kickoff (`now + window`). Friends can fill **all** fixtures in that stage before you advance. You close a phase with `finalize-batch --stage …`, not by waiting for kickoff times.

| Stage | Window (from `prepare` or `generate-next-stage`) |
|--------|-----------------------------------------------------|
| `GROUP` | 3 days |
| `ROUND_OF_32` | 2 days |
| `ROUND_OF_16` | 2 days |
| `QUARTER_FINALS` | 2 days |
| `SEMI_FINALS` | 2 days |
| `THIRD_PLACE` | 2 days |
| `FINAL` | 2 days |

Defaults live in `REHEARSAL_PHASE_WINDOW_MINUTES` in [`scripts/manual-testing/wc-rehearsal-utils.ts`](scripts/manual-testing/wc-rehearsal-utils.ts).

After `prepare`, only group fixtures exist (seed has no playoff placeholders), so every match gets kickoff **now + 3 days**. Knockout stages get **now + 2 days** when you run `generate-next-stage` for that round.

For remote databases (e.g. Supabase), both are required:

- `MANUAL_TEST_ALLOW_REMOTE=true`
- `--allow-remote`

PowerShell example:

```powershell
$env:MANUAL_TEST_ALLOW_REMOTE="true"
pnpm manual-test:wc:prepare -- --allow-remote --clear-predictions
```

This sets every match to `SCHEDULED`, clears scores/final flags, and assigns per-stage kickoffs as in the table above.

### 3) Simulate completed matches in batches

```bash
# finalize next 8 pending matches with deterministic mock results
pnpm manual-test:wc:finalize-batch

# custom batch size and deterministic seed
pnpm manual-test:wc:finalize-batch -- --count 16 --seed 2026

# finalize only pending group-stage matches (ends group phase)
pnpm manual-test:wc:finalize-batch -- --stage GROUP

# finalize only part of a stage
pnpm manual-test:wc:finalize-batch -- --stage GROUP --count 12 --seed 2026
```

PowerShell example for remote DB:

```powershell
$env:MANUAL_TEST_ALLOW_REMOTE="true"
pnpm manual-test:wc:finalize-batch -- --allow-remote --stage GROUP
```

Repeat **finalize** for the matches you want to close (by stage or in batches). Leaderboards use the same scoring rules as production.

**Suggested prod timeline with friends**

1. `prepare` → everyone predicts **group** (3 days on the clock; you choose when to finalize).
2. `finalize-batch --stage GROUP` → `generate-next-stage --from-stage GROUP` → predict **Round of 32** (2 days from generate).
3. Repeat finalize → generate for each knockout stage (`ROUND_OF_32` → … → `SEMI_FINALS` → `THIRD_PLACE` / `FINAL`).

Re-run `prepare` on prod only if you need to reset kickoffs/scores for every match already in the DB (it does not remove tournaments or users).

### 4) Playoff rehearsal — mock knockout bracket (scripts only)

For a **dry run**, after the **group stage** is fully final you can **create the next knockout round** in the database with deterministic mock data (not FIFA standings). Rows use `externalId` values like `manual-wc-2026-ROUND_OF_32-01`.

- **From `GROUP`:** picks 32 real teams (excludes placeholder `TBD…` codes), shuffles with `--seed`, pairs them into **Round of 32**.
- **From each knockout stage:** pairs **winners** of the previous round (ordered by kickoff / id).
- **From `SEMI_FINALS`:** creates **both** `FINAL` and `THIRD_PLACE` in one run (winners → final, losers → third place).

```bash
# After all group matches are final:
pnpm manual-test:wc:generate-next-stage -- --from-stage GROUP

# Predict the new round, then finalize it (all pending in that stage, or use --count)
pnpm manual-test:wc:finalize-batch -- --stage ROUND_OF_32

# Next rounds:
pnpm manual-test:wc:generate-next-stage -- --from-stage ROUND_OF_32
pnpm manual-test:wc:finalize-batch -- --stage ROUND_OF_16
pnpm manual-test:wc:generate-next-stage -- --from-stage ROUND_OF_16
pnpm manual-test:wc:finalize-batch -- --stage QUARTER_FINALS
pnpm manual-test:wc:generate-next-stage -- --from-stage QUARTER_FINALS
pnpm manual-test:wc:finalize-batch -- --stage SEMI_FINALS
pnpm manual-test:wc:generate-next-stage -- --from-stage SEMI_FINALS
pnpm manual-test:wc:finalize-batch -- --stage THIRD_PLACE
pnpm manual-test:wc:finalize-batch -- --stage FINAL
```

Optional flag (same remote guards as other manual scripts): `--seed 2026` (shuffle for mock Round of 32). Edit `REHEARSAL_PHASE_WINDOW_MINUTES` in `wc-rehearsal-utils.ts` to change phase lengths.

**Production:** when the real World Cup is running, new knockout fixtures come from **football-data.org** via **`pnpm football-data:sync:wc:full`** (or GitHub Actions **full** mode). The app does not call the API at request time.

**Note:** If your DB still has **pending API knockout** rows from `pnpm prisma:seed`, you may see **duplicate** knockout slots after generating manual rows. For a clean rehearsal DB, start from seed and remove conflicting KO rows, or reset the DB.

PowerShell example for remote DB:

```powershell
$env:MANUAL_TEST_ALLOW_REMOTE="true"
pnpm manual-test:wc:generate-next-stage -- --allow-remote --from-stage GROUP --seed 2026
```

### Safety

These manual-test scripts only run when one of these conditions is true:

- `DATABASE_URL` looks local (`localhost`, `127.0.0.1`, docker host names), or
- both `MANUAL_TEST_ALLOW_REMOTE=true` and `--allow-remote` are provided.

## Production deploy (Vercel + Supabase)

This section is the single source of truth for which env vars belong where. Annotations also live in [.env.example](.env.example).

### Supabase: which connection string to use where

Supabase exposes three connection strings. Pick the right one per scope:

| Scope | Supabase string | Port | Why |
| --- | --- | --- | --- |
| Vercel runtime (Next.js app) | **Transaction Pooler** | `6543` | Serverless-friendly. Append `?pgbouncer=true&sslmode=require`. |
| GitHub Actions (migrations + WC sync) | **Session Pooler** | `5432` | IPv4-reachable from GitHub-hosted runners; supports prepared statements (Prisma migrations). |
| Direct (`db.<ref>.supabase.co:5432`) | not used | — | IPv6-only without Supabase's paid IPv4 add-on; will fail with `P1001` from GitHub Actions. |

URL templates:

```text
# Transaction Pooler (for DATABASE_URL on Vercel)
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

# Session Pooler (for REMOTE_DATABASE_URL in GH Actions, and DATABASE_URL in the WC sync action)
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

URL-encode the password if it contains special characters.

### Vercel — Project Settings → Environment Variables

Add these to **Production** (and **Preview** if you want previews to talk to Supabase):

**Required:**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **Transaction Pooler** URL (port 6543, `pgbouncer=true&sslmode=require`). |
| `BETTER_AUTH_URL` | Public origin, no trailing slash, e.g. `https://timbafulbo.vercel.app` or your custom domain. |
| `BETTER_AUTH_SECRET` | Fresh value, do not reuse local. Generate with `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client secret. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Dashboard → Project Settings → API). Required for tournament chat Realtime. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase **Publishable key** (Dashboard → API Keys → Publishable key). Do not use the legacy anon key. |

**Optional (only set when you actually need them):**

| Variable | When to set |
| --- | --- |
| `RESEND_API_KEY` | When you want email invites enabled. Without it, invite emails are skipped (rows still created; share code/link manually). |
| `INVITE_FROM_EMAIL` | Together with `RESEND_API_KEY`. Defaults to `timbafulbo <onboarding@resend.dev>` for UI display. |
| `APP_BASE_URL` | Only if it needs to differ from `BETTER_AUTH_URL`. Falls back to `BETTER_AUTH_URL` automatically. |

Do NOT put these in Vercel:

- `REMOTE_DATABASE_URL` — only used by the migration workflow.
- `ALLOW_REMOTE_MIGRATION` — only used by the migration workflow.
- `FOOTBALL_DATA_API_TOKEN` — only used by scripts/CI, not by the Next.js runtime.

After adding env vars, redeploy so the new values take effect. Also remember to add `https://<your-prod-domain>/api/auth/callback/google` to your Google OAuth client's authorized redirect URIs.

### GitHub Actions secrets

Two workflows already exist:

- `.github/workflows/prisma-migrate-deploy.yml` — applies pending migrations on `push: main` and `workflow_dispatch`. Runs in the `production` GitHub Environment.
- `.github/workflows/sync-wc-scores.yml` — runs the football-data sync every 5 minutes (incremental) and on demand (full).

Configure secrets like this:

1. **Repository secrets** (Settings → Secrets and variables → Actions → Repository secrets):
   - `DATABASE_URL` → Supabase **Session Pooler** URL (port 5432). Used by the WC sync workflow.
   - `FOOTBALL_DATA_API_TOKEN` → football-data.org API token.

2. **Environment `production`** (Settings → Environments → New environment → `production`):
   - Add secret `REMOTE_DATABASE_URL` → Supabase **Session Pooler** URL (port 5432).
   - (Strongly recommended) Add yourself as a required reviewer under Environment protection rules so each migration run pauses for one click of approval.

The migrate workflow sets `ALLOW_REMOTE_MIGRATION=true` itself; you do not add that as a secret.

### Bootstrap order (first deploy)

The first time you point at Supabase, do this manually before the auto-migrate workflow takes over:

1. Apply migrations from your machine (using the Session Pooler URL):

   ```powershell
   $env:REMOTE_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
   $env:ALLOW_REMOTE_MIGRATION="true"
   pnpm prisma:migrate:deploy
   pnpm prisma:migrate:status
   ```

2. Seed teams + fixtures into Supabase **once** (the seed wipes Predictions/Matches/Teams — never run it against prod again):

   ```powershell
   pnpm football-data:refresh:wc
   $env:DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
   pnpm prisma:seed
   ```

   Restore your local `DATABASE_URL` afterwards (open a fresh terminal, or unset it).

3. Push to `main` (or click Redeploy on Vercel). From this point on, the migrate workflow handles further schema changes.

### Daily flow after deploy

- `git push origin main` → Vercel rebuilds the app, GitHub Actions runs `prisma migrate deploy` against Supabase (gated by your reviewer rule).
- The WC sync workflow ticks every 5 minutes against Supabase using the Session Pooler URL.
- You keep running `pnpm prisma:migrate:dev` only against your local DB; remote deploys never touch the dev path.

### Tournament chat (Supabase Realtime)

Per-tournament chat appears on **Clasificaciones** and **Mis ligas** (not on Partidos). Live updates use Supabase Realtime; messages are read and written via Better Auth server actions.

**Local `.env`:**

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<supabase-publishable-key>"
```

Copy the **Publishable key** from Supabase Dashboard → **API Keys** (tab “Publishable and secret API keys”). The legacy anon key is not used.

After the first deploy, enable Realtime for `"TournamentChatMessage"` and run the SQL in [docs/SUPABASE_REALTIME.md](docs/SUPABASE_REALTIME.md).

## Why these scripts are safe

- `pnpm prisma:migrate:dev` is blocked unless `DATABASE_URL` looks local (`localhost`, `127.0.0.1`, docker host names).
- `pnpm prisma:migrate:deploy` uses `REMOTE_DATABASE_URL` when present (recommended), is blocked on local URLs, and also requires `ALLOW_REMOTE_MIGRATION=true`.
- This prevents accidentally running the wrong migration flow against Supabase/production.

## Useful commands

```bash
pnpm prisma:format
pnpm prisma:migrate:status
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:seed
pnpm football-data:sync:wc
pnpm football-data:sync:wc:full
```
