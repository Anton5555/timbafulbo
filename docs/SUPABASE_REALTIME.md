# Supabase Realtime setup (Tournament chat)

After a DB reset or new project, enable Realtime for tournament chat so live updates work on **Clasificaciones** and **Mis ligas**.

## 1. Environment variables

Add to your local `.env` (see `.env.supabase.example`):

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<supabase-publishable-key>"
```

Use the **Publishable key** from Supabase Dashboard → **API Keys** (not the legacy anon key).

The app uses Supabase only for **Realtime subscriptions**. Message reads and writes go through Better Auth–protected server actions.

## 2. Database publications (Realtime)

In **Supabase Dashboard → Database → Publications** (or **Replication**):

- Enable **TournamentChatMessage** for the Realtime publication (e.g. `supabase_realtime`).

If missing, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "TournamentChatMessage";
```

## 3. Table access (GRANT)

So the `anon` Postgres role (used by the publishable key) can receive Realtime events:

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public."TournamentChatMessage" TO anon, authenticated;
NOTIFY pgrst;
```

## 4. RLS policies (optional but recommended)

For Realtime, Supabase needs `SELECT` on the table. A permissive policy for `anon` works for development:

```sql
CREATE POLICY "Allow anon read TournamentChatMessage for realtime"
ON public."TournamentChatMessage"
FOR SELECT
TO anon
USING (true);
```

**Security note:** WebSocket `postgres_changes` payloads may expose row fields to anyone with the publishable key. The UI always refetches messages through authenticated server actions; tighten RLS (e.g. membership-based `USING`) if you need stricter isolation.

## 5. Verify

1. Open **Clasificaciones** or **Mis ligas** for a tournament you belong to.
2. In another browser (or incognito user in the same tournament), send a chat message.
3. The first tab should update without a full page refresh (status shows **En vivo** when connected).

Use a normal browser (e.g. Chrome); embedded IDE browsers can miss WebSocket updates.
