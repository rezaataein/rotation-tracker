# GitHub Secrets Setup

The monitoring workflow requires GitHub secrets/variables to be configured.

## Required Configuration

### 1. Variables (already configured ✓)

The workflow reuses existing variables from the deploy workflow:

- **VITE_SUPABASE_URL** - Already set (public, not secret)
  - Used by both frontend build and monitoring script
  - Should already exist from initial setup

### 2. Secrets (needs to be added)

**SUPABASE_SERVICE_KEY** ⚠️
- Your Supabase service role key (SECRET!)
- This key bypasses Row-Level Security
- Get from: Supabase Dashboard → Settings → API → `service_role` key

**VAPID_PUBLIC_KEY** ⚠️
- Web Push VAPID public key
- Generated via: `npx web-push generate-vapid-keys`
- Format: `BDx...` (base64 encoded)

**VAPID_PRIVATE_KEY** ⚠️
- Web Push VAPID private key
- Generated via: `npx web-push generate-vapid-keys`
- Format: `Abc...` (base64 encoded)
- KEEP SECRET - used to sign push notifications

**VAPID_CLAIMS_EMAIL** ⚠️
- Contact email for push service
- Format: your email address (e.g., `notifications@yourdomain.com`)
- Used by browser push services to contact you if issues arise

## How to Add Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the secret:
   - Name: `SUPABASE_SERVICE_KEY`
   - Value: `eyJhbGc...` (paste your service role key)
   - Click **Add secret**

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
