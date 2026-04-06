# Supabase Ping — Keep Your Free-Tier Project Alive

## 1. Create the `ping` RPC function in Supabase

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
CREATE OR REPLACE FUNCTION ping()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'pong'::text;
$$;
```

## 2. Add GitHub Secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret Name         | Value                                      |
|---------------------|--------------------------------------------|
| `SUPABASE_URL`      | Your Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key              |

You can find both in **Supabase Dashboard → Settings → API**.

## 3. That's it

The GitHub Action (`.github/workflows/ping-supabase.yml`) runs every 4 days
and calls the `ping()` function, keeping your DB active.

You can also trigger it manually from **GitHub → Actions → Ping Supabase → Run workflow**.
