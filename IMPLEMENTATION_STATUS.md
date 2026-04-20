# Notes & Drag-Drop Implementation Status

## ✅ Completed

### Database
- ✅ Migration file created: `supabase/migrations/20260420_add_notes_and_sort_order.sql`
- ✅ Notes column (TEXT, 100 char limit)
- ✅ Sort_order column (INTEGER, nullable)

### Edit Modals
- ✅ EditPosition.jsx - Notes textarea field added
- ✅ EditStrategy.jsx - Notes textarea field added
- ✅ Character counter (X/100)
- ✅ Smart placeholder text

### Dashboard (Positions)
- ✅ Drag-and-drop sorting with @dnd-kit
- ✅ Drag handle (⋮⋮) on cards  
- ✅ Urgency-based auto-sorting
- ✅ Notes display on cards
- ✅ Smart truncation (responsive)
- ✅ CSS for drag handle and notes

### Dependencies
- ✅ @dnd-kit/core installed
- ✅ @dnd-kit/sortable installed
- ✅ @dnd-kit/utilities installed

## ⚠️ TODO - Scanner Page

The Scanner page (strategies) needs the same treatment as Dashboard:

1. **Add imports** (same as Dashboard)
   ```javascript
   import { DndContext, ... } from '@dnd-kit/core';
   import { SortableContext, useSortable, ... } from '@dnd-kit/sortable';
   ```

2. **Add state & sensors**
   ```javascript
   const [sortedStrategies, setSortedStrategies] = useState([]);
   const sensors = useSensors(...);
   ```

3. **Add urgency calculation**
   ```javascript
   const calculateUrgency = (strategy) => {
     const spread = calculateSpread(strategy);
     if (spread === null) return Infinity;
     return spread; // More negative = more urgent (ascending)
   };
   ```

4. **Add sorting logic**
   ```javascript
   useEffect(() => {
     const sorted = [...filteredStrategies].sort((a, b) => {
       // Manual order first
       if (a.sort_order !== null && b.sort_order !== null) {
         return a.sort_order - b.sort_order;
       }
       // Then urgency
       return calculateUrgency(a) - calculateUrgency(b);
     });
     setSortedStrategies(sorted);
   }, [filteredStrategies, priceData, historicalData]);
   ```

5. **Add drag handler**
   ```javascript
   const handleDragEnd = async (event) => {
     // Same as Dashboard but update 'strategies' table
   };
   ```

6. **Wrap strategy list in DndContext**
   - Replace `filteredStrategies.map` with `sortedStrategies.map`
   - Wrap in `<DndContext><SortableContext>...</SortableContext></DndContext>`
   - Create SortableCard component inside map (same pattern as Dashboard)

7. **Add drag handle & notes display**
   - Add ⋮⋮ button with useSortable
   - Add notes div if strategy.notes exists

8. **Add CSS**
   - Same drag-handle and position-notes styles as Dashboard.css
   - Add to Scanner.css

## 🗄️ Database Migration

**IMPORTANT:** Run this SQL in Supabase dashboard:

```sql
-- See: migrations/003_add_notes_and_sort_order.sql

ALTER TABLE positions
ADD COLUMN IF NOT EXISTS notes TEXT CHECK (LENGTH(notes) <= 100),
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

ALTER TABLE strategies
ADD COLUMN IF NOT EXISTS notes TEXT CHECK (LENGTH(notes) <= 100),
ADD COLUMN IF NOT EXISTS sort_order INTEGER;
```

## 📝 Testing Checklist

After completing Scanner:

- [ ] Run database migration
- [ ] Test adding notes to position (Dashboard)
- [ ] Test adding notes to strategy (Scanner)
- [ ] Test drag-drop reordering positions
- [ ] Test drag-drop reordering strategies
- [ ] Verify urgency sorting (most urgent at top)
- [ ] Verify notes truncation on mobile
- [ ] Verify manual order persists after refresh

## 🎯 Known Issues

- useEffect dependency warnings for urgency calculation (filteredPositions/strategies changes trigger resort)
- No loading state during drag-drop database update
- No error toast if drag-drop update fails (just console.error)

These can be improved in a future update.
