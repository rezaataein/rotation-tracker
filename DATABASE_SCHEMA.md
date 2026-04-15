# Database Schema

**Complete PostgreSQL schema for Supabase.**

---

## 🗄️ **Tables Overview**

1. **positions** - Active positions (hard deleted when closed)
2. **strategies** - Saved scanners for auto-monitoring
3. **push_subscriptions** - Web push endpoints
4. **notifications** - Notification history (optional)
5. **option_price_snapshots** - Historical option premium data (for covered calls)

---

## 📋 **Complete SQL Schema**

Copy this into Supabase SQL Editor and run:

```sql
-- ============================================================================
-- 1. POSITIONS TABLE
-- ============================================================================

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES strategies,  -- Links to strategy that generated this
  
  -- Position metadata
  type TEXT NOT NULL CHECK (type IN ('stock_rotation', 'covered_call')),
  ticker TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status = 'open'),  -- Only 'open' - positions are hard deleted when closed
  
  -- Stock rotation fields
  benchmark TEXT,
  entry_stock_price DECIMAL(10, 2),
  entry_bench_price DECIMAL(10, 2),
  exit_threshold DECIMAL(5, 4),  -- e.g., 0.06 for 6%
  
  -- Covered call fields
  strike DECIMAL(10, 2),
  expiration DATE,
  entry_premium DECIMAL(10, 2),
  alert_target DECIMAL(10, 2),  -- Price to alert at
  
  -- Current prices (updated by cron)
  current_stock_price DECIMAL(10, 2),
  current_bench_price DECIMAL(10, 2),
  current_bid DECIMAL(10, 2),  -- Options: current bid
  current_ask DECIMAL(10, 2),  -- Options: current ask
  current_mid DECIMAL(10, 2),  -- Options: (bid+ask)/2
  current_last DECIMAL(10, 2), -- Options: last trade price
  spread_pct DECIMAL(5, 2),    -- Options: (ask-bid)/mid %
  
  -- Calculated fields (updated by cron)
  current_pnl DECIMAL(10, 2),
  current_pnl_pct DECIMAL(5, 2),
  current_outperformance DECIMAL(5, 4),  -- Stock return - bench return
  days_held INTEGER,
  
  -- Exit details (when closed)
  exit_stock_price DECIMAL(10, 2),
  exit_bench_price DECIMAL(10, 2),
  exit_option_price DECIMAL(10, 2),
  exit_date DATE,
  exit_pnl DECIMAL(10, 2),
  exit_pnl_pct DECIMAL(5, 2),
  
  -- Timestamps
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_type ON positions(type);
CREATE INDEX idx_positions_strategy_id ON positions(strategy_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_positions_updated_at 
  BEFORE UPDATE ON positions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. STRATEGIES TABLE
-- ============================================================================

CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Strategy metadata
  name TEXT NOT NULL,  -- e.g., "NVDA vs VGT 45d -12%"
  type TEXT DEFAULT 'stock_rotation' CHECK (type IN ('stock_rotation', 'covered_call_scan')),
  
  -- Stock rotation config (ENTRY signals only)
  ticker TEXT NOT NULL,
  benchmark TEXT,  -- NULL for covered call scans
  lookback_days INTEGER,  -- e.g., 45
  entry_threshold DECIMAL(5, 4),  -- e.g., -0.12 for -12% underperformance to trigger BUY signal
  
  -- Covered call scan config
  min_premium_pct DECIMAL(5, 2),  -- e.g., 1.0 for 1%
  target_delta_min DECIMAL(3, 2), -- e.g., 0.20
  target_delta_max DECIMAL(3, 2), -- e.g., 0.40
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Last check info
  last_checked_at TIMESTAMPTZ,
  last_signal_date DATE,  -- When it last generated a signal
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_strategies_active ON strategies(active);
CREATE INDEX idx_strategies_type ON strategies(type);

-- Updated timestamp trigger
CREATE TRIGGER update_strategies_updated_at 
  BEFORE UPDATE ON strategies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 3. PUSH SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,  -- Encryption key
  auth TEXT NOT NULL,    -- Auth secret
  
  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate subscriptions
  UNIQUE(user_id, endpoint)
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);


-- ============================================================================
-- 4. NOTIFICATIONS TABLE (Optional - for history)
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'OPTION_ALERT', 'INFO')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,  -- Extra data (position_id, strategy_id, etc.)
  
  -- Status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Link to position/strategy
  position_id UUID REFERENCES positions,
  strategy_id UUID REFERENCES strategies
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_type ON notifications(type);


-- ============================================================================
-- 5. OPTION PRICE SNAPSHOTS TABLE
-- ============================================================================
-- Historical option premium data collected by GitHub Actions cron
-- Yahoo Finance doesn't provide historical option data, so we collect it ourselves

CREATE TABLE option_price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  
  -- Snapshot data
  timestamp TIMESTAMPTZ NOT NULL,
  bid DECIMAL(10, 2) NOT NULL,
  ask DECIMAL(10, 2) NOT NULL,
  last_price DECIMAL(10, 2),
  volume INTEGER,
  open_interest INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_option_snapshots_position_id ON option_price_snapshots(position_id);
CREATE INDEX idx_option_snapshots_timestamp ON option_price_snapshots(timestamp DESC);
CREATE INDEX idx_option_snapshots_position_timestamp ON option_price_snapshots(position_id, timestamp DESC);


-- ============================================================================
-- 6. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_price_snapshots ENABLE ROW LEVEL SECURITY;

-- Positions policies
CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  USING (auth.uid() = user_id);

-- Strategies policies
CREATE POLICY "Users can view own strategies"
  ON strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON strategies FOR DELETE
  USING (auth.uid() = user_id);

-- Push subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Option snapshots policies
CREATE POLICY "Users can view snapshots for own positions"
  ON option_price_snapshots FOR SELECT
  USING (
    position_id IN (
      SELECT id FROM positions WHERE user_id = auth.uid()
    )
  );

-- Service role can insert snapshots (GitHub Actions cron)
CREATE POLICY "Service role can insert snapshots"
  ON option_price_snapshots FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate days held
CREATE OR REPLACE FUNCTION calculate_days_held(entry_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(DAY FROM (CURRENT_DATE - entry_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to get active positions count for user
CREATE OR REPLACE FUNCTION get_user_active_positions_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM positions WHERE user_id = user_uuid AND status = 'open');
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 8. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample strategy (replace user_id with your actual user ID)
/*
INSERT INTO strategies (user_id, name, ticker, benchmark, lookback_days, entry_threshold)
VALUES (
  'YOUR_USER_ID_HERE',
  'NVDA vs VGT 45d -12%',
  'NVDA',
  'VGT',
  45,
  -0.12
);

-- Insert sample position
INSERT INTO positions (
  user_id,
  type,
  ticker,
  benchmark,
  entry_stock_price,
  entry_bench_price,
  exit_threshold,
  entry_date
)
VALUES (
  'YOUR_USER_ID_HERE',
  'stock_rotation',
  'NVDA',
  'VGT',
  735.50,
  515.80,
  0.06,
  '2026-03-01'
);
*/


-- ============================================================================
-- 9. USEFUL QUERIES FOR ADMIN
-- ============================================================================

-- View all users and their position counts
/*
SELECT 
  u.email,
  COUNT(DISTINCT CASE WHEN p.status = 'open' THEN p.id END) as open_positions,
  COUNT(DISTINCT CASE WHEN p.status = 'closed' THEN p.id END) as closed_positions,
  COUNT(DISTINCT s.id) as strategies
FROM auth.users u
LEFT JOIN positions p ON u.id = p.user_id
LEFT JOIN strategies s ON u.id = s.user_id
GROUP BY u.id, u.email
ORDER BY open_positions DESC;
*/

-- View all open positions with current performance
/*
SELECT 
  u.email,
  p.ticker,
  p.benchmark,
  p.entry_date,
  p.days_held,
  p.current_outperformance,
  p.exit_threshold,
  CASE 
    WHEN p.current_outperformance >= p.exit_threshold THEN '🟢 READY'
    WHEN p.current_outperformance >= 0 THEN '🟡 CLOSE'
    ELSE '🔴 HOLDING'
  END as status
FROM positions p
JOIN auth.users u ON p.user_id = u.id
WHERE p.status = 'open' AND p.type = 'stock_rotation'
ORDER BY p.current_outperformance DESC;
*/

-- View active strategies
/*
SELECT 
  u.email,
  s.name,
  s.ticker,
  s.benchmark,
  s.last_checked_at,
  s.last_signal_date
FROM strategies s
JOIN auth.users u ON s.user_id = u.id
WHERE s.active = true
ORDER BY s.last_checked_at DESC;
*/
```

---

## 📊 **Field Explanations**

### **Positions Table**

**Stock Rotation Fields:**
- `entry_stock_price` - Stock price when position opened
- `entry_bench_price` - Benchmark price when position opened
- `current_outperformance` - (stock_return - bench_return) updated by cron
- `exit_threshold` - Exit when outperformance >= this (e.g., 0.06 = 6%)

**Covered Call Fields:**
- `strike` - Option strike price
- `expiration` - Option expiration date
- `entry_premium` - Premium received when sold
- `current_bid/ask/mid` - Updated by cron from option chain
- `alert_target` - Send alert when mid price <= this
- `spread_pct` - (ask - bid) / mid * 100

**Calculated Fields (Auto-updated by Cron):**
- `current_pnl` - Unrealized profit/loss in dollars
- `current_pnl_pct` - Unrealized profit/loss percentage
- `days_held` - Days since entry_date

### **Strategies Table**

**Stock Rotation Strategy:**
- `ticker` - Stock to monitor (e.g., NVDA)
- `benchmark` - Compare against (e.g., VGT)
- `lookback_days` - Period to calculate performance (e.g., 45)
- `entry_threshold` - Trigger BUY signal when underperformance < this (e.g., -0.12 = -12%)
- **Note:** Exit thresholds are NOT in strategies - they're defined per position when opened

**Covered Call Scan:**
- `ticker` - Stock to scan options for
- `min_premium_pct` - Minimum premium as % of stock price
- `target_delta_min/max` - Delta range (e.g., 0.20-0.40)

---

## 🔒 **Security Notes**

**Row-Level Security (RLS):**
- All tables have RLS enabled
- Users can only SELECT/INSERT/UPDATE/DELETE their own rows
- `user_id` is auto-filled from `auth.uid()`
- Admin can bypass RLS using service_role key or dashboard

**Cascade Deletion:**
- All foreign keys have `ON DELETE CASCADE`
- When a user is deleted, all their data is automatically removed:
  - All positions deleted
  - All strategies deleted
  - All push subscriptions deleted
  - All notifications deleted
- This ensures no orphaned data and GDPR compliance
- Deletion from Supabase Dashboard → Authentication → Users works seamlessly

**Password Security:**
- Passwords never stored in plain text
- Bcrypt hashing automatic (Supabase Auth)
- Admin cannot see user passwords

**API Keys:**
- `anon` key - Safe to expose in frontend (RLS enforced)
- `service_role` key - NEVER expose (bypasses RLS, used in cron)

---

## 🔄 **Maintenance**

**Backup:**
- Supabase auto-backups on Pro plan
- Free tier: Manual export via Dashboard → Database → Backups

**Migrations:**
- Store schema changes in `migrations/` folder
- Apply via Supabase CLI or SQL Editor

**Monitoring:**
- Dashboard → Database → Size (check storage usage)
- Dashboard → Database → Usage (check query performance)

---

## 📈 **Scaling Considerations**

**Free Tier Limits:**
- 500MB database
- 1GB bandwidth
- 50K monthly active users
- 2GB file storage

**When to Upgrade:**
- Database > 400MB → Consider Pro ($25/mo)
- >1000 active users → Monitor usage
- Need point-in-time recovery → Pro plan

**Optimization:**
- Add indexes on frequently queried columns
- Archive old closed positions
- Use `updated_at` for incremental cron checks
