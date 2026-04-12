-- ============================================================================
-- ROTATION TRACKER - DATABASE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to create all tables and policies
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTION (needed by triggers later)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ============================================================================
-- 2. STRATEGIES TABLE (must come before positions because of foreign key)
-- ============================================================================

CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,

  -- Strategy metadata
  name TEXT NOT NULL,
  type TEXT DEFAULT 'stock_rotation' CHECK (type IN ('stock_rotation', 'covered_call_scan')),

  -- Stock rotation config
  ticker TEXT NOT NULL,
  benchmark TEXT,
  lookback_days INTEGER,
  entry_threshold DECIMAL(5, 4),
  exit_threshold DECIMAL(5, 4),

  -- Covered call scan config
  min_premium_pct DECIMAL(5, 2),
  target_delta_min DECIMAL(3, 2),
  target_delta_max DECIMAL(3, 2),

  -- Status
  active BOOLEAN DEFAULT true,

  -- Last check info
  last_checked_at TIMESTAMPTZ,
  last_signal_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_strategies_active ON strategies(active);
CREATE INDEX idx_strategies_type ON strategies(type);

-- Apply trigger to strategies
CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 3. POSITIONS TABLE
-- ============================================================================

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  strategy_id UUID REFERENCES strategies,

  -- Position metadata
  type TEXT NOT NULL CHECK (type IN ('stock_rotation', 'covered_call')),
  ticker TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),

  -- Stock rotation fields
  benchmark TEXT,
  entry_stock_price DECIMAL(10, 2),
  entry_bench_price DECIMAL(10, 2),
  exit_threshold DECIMAL(5, 4),

  -- Covered call fields
  strike DECIMAL(10, 2),
  expiration DATE,
  entry_premium DECIMAL(10, 2),
  alert_target DECIMAL(10, 2),

  -- Current prices (updated by cron)
  current_stock_price DECIMAL(10, 2),
  current_bench_price DECIMAL(10, 2),
  current_bid DECIMAL(10, 2),
  current_ask DECIMAL(10, 2),
  current_mid DECIMAL(10, 2),
  current_last DECIMAL(10, 2),
  spread_pct DECIMAL(5, 2),

  -- Calculated fields (updated by cron)
  current_pnl DECIMAL(10, 2),
  current_pnl_pct DECIMAL(5, 2),
  current_outperformance DECIMAL(5, 4),
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

-- Apply trigger to positions
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 4. PUSH SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate subscriptions
  UNIQUE(user_id, endpoint)
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);


-- ============================================================================
-- 5. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,

  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'OPTION_ALERT', 'INFO')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,

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
-- 6. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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


-- ============================================================================
-- DONE!
-- ============================================================================
-- You should now have:
-- ✅ 4 tables (positions, strategies, push_subscriptions, notifications)
-- ✅ All indexes created
-- ✅ RLS enabled with user-specific policies
-- ✅ Auto-update triggers for updated_at fields
-- ============================================================================
