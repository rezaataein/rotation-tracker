# GitHub Secrets Setup

The monitoring workflow requires these secrets to be configured in your GitHub repository.

## Required Secrets

1. **SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://clovfqalpjdienqsfgdz.supabase.co`
   - Get from: Supabase Dashboard → Settings → API

2. **SUPABASE_SERVICE_KEY**
   - Your Supabase service role key (⚠️ SECRET!)
   - This key bypasses Row-Level Security
   - Get from: Supabase Dashboard → Settings → API → `service_role` key

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Click **Add secret**
5. Repeat for `SUPABASE_SERVICE_KEY`

## Verify Secrets

After adding secrets, you can:
1. Go to **Actions** tab
2. Click **Monitor Positions & Strategies** workflow
3. Click **Run workflow** (manual trigger)
4. Check the logs to verify it connects successfully

## Security Notes

- Never commit these values to `.env` file
- Service role key should only be used in GitHub Actions (server-side)
- Frontend should only use the `anon` key (stored in `VITE_SUPABASE_ANON_KEY`)
