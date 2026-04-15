# 🔴 ACTION REQUIRED: Run Database Migration 003

**What:** Add `active` column to positions table for pause/resume functionality

**When:** Before deploying v0.6.0

**How:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `003_add_positions_active_column.sql`
3. Paste and run it
4. Verify success: `SELECT active FROM positions LIMIT 1;` should return TRUE

**What this does:**
- Adds `active BOOLEAN DEFAULT TRUE` to positions table
- Creates index for query performance
- All existing positions become active=TRUE automatically
- Enables pause/resume functionality matching strategies

**Safe to run:**
- ✅ Non-destructive (only adds column)
- ✅ No data loss
- ✅ All existing positions stay active
- ✅ Backwards compatible (defaults to TRUE)

**After running:**
- Delete this file
- Positions will have pause/resume toggle in UI
- monitor.py will respect paused positions
