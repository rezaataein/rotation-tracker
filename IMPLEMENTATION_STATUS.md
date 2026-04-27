# Implementation Status

## ✅ Completed

### Database
- ✅ Migration file created: `migrations/003_add_notes_and_sort_order.sql`
- ✅ Notes column (TEXT, 100 char limit) on positions + strategies
- ✅ Sort_order column (INTEGER, nullable) on positions + strategies

### Edit Modals
- ✅ EditPosition.jsx - Notes textarea field added
- ✅ EditStrategy.jsx - Notes textarea field added
- ✅ Character counter (X/100)
- ✅ Smart placeholder text

### Dashboard (Positions)
- ✅ Drag-and-drop sorting with @dnd-kit
- ✅ Drag handle (⋮⋮) on cards
- ✅ Urgency-based auto-sorting
- ✅ Manual sort_order persists to database
- ✅ Notes display on cards (responsive truncation)
- ✅ Auto-sort reset button (↺ Auto-sort) — appears when any card is pinned
- ✅ CSS for drag handle, notes, sort-reset-bar

### Scanner (Strategies)
- ✅ Drag-and-drop sorting (same pattern as Dashboard)
- ✅ Drag handle (⋮⋮) on strategy cards
- ✅ Urgency-based auto-sorting (most negative spread = most urgent)
- ✅ Manual sort_order persists to database
- ✅ Notes display on strategy cards
- ✅ Auto-sort reset button (↺ Auto-sort) — appears when any card is pinned

### Trading Days Fix (v1.1.0)
- ✅ lookback_days correctly means TRADING days everywhere (matching vgt-backtest engine)
- ✅ Scanner: 2x calendar buffer fetch, takes validCloses[-lookback] for exact Nth trading day
- ✅ StrategyComparisonChart: same buffer + sliceToLastNTradingDays() for correct chart period
- ✅ monitor.py: 2x calendar buffer fixes "Insufficient historical data" for lookbacks ≥ ~55
- ✅ UI labels updated to "trading days" (AddStrategy, EditStrategy, StrategyDetail, Scanner cards)
- ✅ AddStrategy hint note: "e.g. 45 ≈ 9 calendar weeks. Matches the backtesting engine."
- ✅ dateUtils: tradingDaysToCalendarDays() helper added

### Dependencies
- ✅ @dnd-kit/core installed
- ✅ @dnd-kit/sortable installed
- ✅ @dnd-kit/utilities installed

## 🎯 Known Issues

- useEffect dependency warnings for urgency calculation (filteredPositions/strategies changes trigger resort)
- No loading state during drag-drop database update
- No error toast if drag-drop update fails (just console.error)

These can be improved in a future update.
