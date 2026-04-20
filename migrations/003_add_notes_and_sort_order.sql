-- Add notes and sort_order columns for user annotations and manual ordering

-- Add notes column to positions (for account names, trade notes, etc.)
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS notes TEXT CHECK (LENGTH(notes) <= 100);

-- Add manual sort order to positions (for drag-drop custom ordering)
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Add notes column to strategies
ALTER TABLE strategies
ADD COLUMN IF NOT EXISTS notes TEXT CHECK (LENGTH(notes) <= 100);

-- Add manual sort order to strategies
ALTER TABLE strategies
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Add helpful comments for documentation
COMMENT ON COLUMN positions.notes IS 'Optional user notes (max 100 chars), e.g., account name, trade rationale';
COMMENT ON COLUMN positions.sort_order IS 'Manual sort order for drag-drop (lower = higher priority), NULL = auto-sort by urgency';
COMMENT ON COLUMN strategies.notes IS 'Optional user notes (max 100 chars), e.g., account name, strategy notes';
COMMENT ON COLUMN strategies.sort_order IS 'Manual sort order for drag-drop (lower = higher priority), NULL = auto-sort by urgency';
