-- Create option_price_snapshots table for tracking historical option premiums
-- Yahoo Finance doesn't provide historical option data, so we collect it ourselves

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

-- Index for efficient queries by position
CREATE INDEX idx_option_snapshots_position_id ON option_price_snapshots(position_id);

-- Index for time-based queries
CREATE INDEX idx_option_snapshots_timestamp ON option_price_snapshots(timestamp DESC);

-- Composite index for position + time range queries (most common)
CREATE INDEX idx_option_snapshots_position_timestamp ON option_price_snapshots(position_id, timestamp DESC);

-- Enable RLS
ALTER TABLE option_price_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see snapshots for their own positions
CREATE POLICY "Users can view their own position snapshots"
  ON option_price_snapshots
  FOR SELECT
  USING (
    position_id IN (
      SELECT id FROM positions WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Only system/service role can insert snapshots (GitHub Action)
-- Users cannot manually insert snapshots
CREATE POLICY "Service role can insert snapshots"
  ON option_price_snapshots
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Cascade deletes are automatic, but explicit policy for clarity
-- Snapshots deleted when parent position is deleted (CASCADE handles this)
