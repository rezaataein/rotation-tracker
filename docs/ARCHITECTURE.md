# Rotation Tracker - Architecture Decisions

## Database Schema

### Positions Table
- Stores both stock rotation and covered call positions
- `status` field: only `'open'` (in DB) or deleted (not in DB)
- No "closed" or "archived" status - deletion is permanent

### Option Price Snapshots Table
```sql
CREATE TABLE option_price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  bid decimal NOT NULL,
  ask decimal NOT NULL,
  last_price decimal,
  volume integer,
  open_interest integer,
  created_at timestamptz DEFAULT now()
);
```

**Purpose:** Track historical option premiums over time (Yahoo Finance doesn't provide this)

**Note:** Only for covered calls. Stock rotation uses Yahoo's built-in historical data.

## Price Monitoring Architecture

### Data Collection (GitHub Actions Cron Job)
- Runs periodically (e.g., every 15 minutes during market hours)
- Fetches all `open` positions from database
- For each position:
  - **Stock Rotation:** Fetch current stock + benchmark prices, check spread vs threshold
  - **Covered Call:** Fetch current option bid/ask/OI, insert into `option_price_snapshots`, check vs alert_target
- Checks if alerts should trigger
- Sends notifications (Telegram/email) if thresholds met

### Expiration Handling
- GitHub Action checks `expiration < today` for covered calls
- Does NOT auto-delete or change status
- Dashboard detects expired positions client-side and shows visual alert
- User must manually delete expired positions

### Chart Data Sources
- **Stock Rotation Chart:** Fetches from Yahoo Finance v8/chart API (real-time historical data)
- **Covered Call Chart:** Fetches from `option_price_snapshots` table (our collected history)

## Key Principles
1. **Deletion is permanent** - No soft deletes, no archiving
2. **CASCADE deletes** - Deleting position auto-deletes related snapshots
3. **GitHub Action is source of truth** - All monitoring/alerting happens there
4. **Client-side expiration warnings** - Dashboard shows alerts, user takes action
