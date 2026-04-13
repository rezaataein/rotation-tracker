# Monitoring Scripts

Python scripts for automated position and strategy monitoring.

## Setup

**1. Fill in environment variables:**

Edit `/rotation-tracker/.env` and add your Supabase service role key:
- Get it from: Supabase Dashboard → Settings → API → `service_role` key
- Paste into `SUPABASE_SERVICE_KEY=...`

**2. Create virtual environment:**

```bash
# From rotation-tracker root
python3 -m venv venv
source venv/bin/activate
```

**3. Install dependencies:**

```bash
pip install -r .github/scripts/requirements.txt
```

## Testing Locally

**Test mode (dry run with fake notifications):**

```bash
# Make sure venv is activated
source venv/bin/activate

# Load env vars and run
export $(grep -v '^#' .env | xargs) && python .github/scripts/monitor.py --test
```

**Production mode:**

```bash
export $(grep -v '^#' .env | xargs) && python .github/scripts/monitor.py
```

## What It Does

1. **Strategy Scanner** - Checks active strategies for entry signals
2. **Stock Rotation Monitor** - Checks positions for exit signals, updates prices
3. **Covered Call Monitor** - Fetches option prices, saves snapshots, checks alerts
4. **Notifications** - Sends push notifications when thresholds hit

## GitHub Actions

The workflow `.github/workflows/monitor-positions.yml` runs this script 3x daily:
- 9:30 AM ET - Market open
- 12:30 PM ET - Midday
- 3:30 PM ET - Before close

Environment variables are loaded from GitHub Secrets (not from .env file).
