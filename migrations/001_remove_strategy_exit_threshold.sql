-- ============================================================================
-- Migration: Remove exit_threshold from strategies table
-- Date: 2026-04-12
-- Reason: Exit thresholds belong to positions, not strategies
--         Strategies only define entry signals
-- ============================================================================

-- Remove exit_threshold column from strategies
ALTER TABLE strategies
  DROP COLUMN IF EXISTS exit_threshold;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Strategies now only define ENTRY conditions
-- Positions define EXIT thresholds (set when position is created)
-- ============================================================================
