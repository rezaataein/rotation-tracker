# Changelog

All notable changes to Rotation Tracker will be documented in this file.

## [0.3.3] - 2026-04-14

### Added
- **Settings Page** - Complete user settings interface
  - User profile section (email, user ID)
  - Trading signal alerts toggle (placeholder for Phase 4 web push)
  - Sign out functionality
  - About section with app version and description
  - Mobile-responsive design with toggle switch component
  
- **Position Detail "How it works" Sections**
  - Stock Rotation: Explains SWAP alerts when exit threshold is hit
  - Covered Call: Explains BUYBACK alerts when premium drops to target
  - Green background styling for active monitoring status

### Changed
- **Signal Terminology Throughout App** - Clarified and standardized alert types
  - Stock rotation entry: "Entry signal" (when ticker underperforms benchmark)
  - Stock rotation exit: "SWAP signal" (when position hits exit threshold - time to rotate back)
  - Covered call: "BUYBACK alert" (when premium drops to buyback target)
  - Updated all UI text, documentation, and examples to use consistent terminology
  
- **StrategyDetail "How it works"** - Expanded to explain both signal types
  - Active strategies: Lists entry and swap signals in bulleted format
  - Paused strategies: Simplified message about resuming monitoring
  
- **Settings Notifications Section** - Comprehensive signal coverage
  - Label: "Trading Signal Alerts" (not just BUY signals)
  - Description: Covers all three alert types (entry, swap, buyback)
  - Coming Soon note: Lists all signal types with explanations

### Fixed
- **DATABASE_SCHEMA.md** - Removed 'closed' status
  - Positions are hard deleted (not soft deleted/archived)
  - Status check now: `CHECK (status = 'open')` (was incorrectly `CHECK (status IN ('open', 'closed'))`)
  - Added comment: "Only 'open' - positions are hard deleted when closed"

### Technical
- Updated all documentation files:
  - README.md: Signal terminology, push notification examples, feature status
  - ARCHITECTURE.md: Notification payload examples, alert descriptions
  - DATABASE_SCHEMA.md: Position status constraint, table overview
  - .dev/PROJECT_SUMMARY.md: Signal references throughout
- Version displayed in Settings page About section

## [0.3.2] - 2026-04-13

### Added
- **Supabase Edge Function Source Code** - Added to version control
  - `supabase/functions/fetch-quotes/index.ts` - Main Edge Function
  - `supabase/functions/README.md` - Deployment documentation
  - Ticker validation, historical prices, and options chain fetching
  - Cookie/crumb authentication for Yahoo Finance options API

### Changed
- **DATABASE_SCHEMA.md** - Added option_price_snapshots table (from migration 002)
  - Documents historical option premium collection
  - RLS policies for user access and service role inserts
  - Follows industry standard: schema doc = current state after migrations

### Technical
- Edge function now version controlled for deployment automation
- Supports `supabase functions deploy fetch-quotes` command

## [0.3.1] - 2026-04-13

### Added
- **Shared DetailPageLayout Component** - Unified layout wrapper for all detail pages
  - Consistent header with back button, title, and badge
  - Error banner support with dismiss functionality
  - Sticky action buttons at bottom
  - Used by Position and Strategy detail pages
  
- **Shared MetricCards Components** - Reusable metric display components
  - `CurrentPricesCard` - Stock and benchmark price display
  - `SpreadCard` - Spread value with threshold indicator (supports >= and <= logic)
  - `PremiumCard` - Option premium with alert threshold
  - `StockAndOptionCard` - Stock price and bid/ask display
  - Ensures identical rendering across all detail pages

- **Shared DetailContent.css** - Consistent styling for detail page content sections
  - Chart section, metrics row, config section styles
  - 2-column responsive grid for metrics cards
  - Mobile-first with single-column breakpoint at 640px

### Changed
- **Position Detail Pages Refactored** - Eliminated wrapper components
  - Stock Rotation and Covered Call content now inline JSX (matches Strategy pattern)
  - Removed `StockRotationDetail` and `CoveredCallDetail` wrapper components
  - All three detail views now use identical DOM structure
  
- **Chart Touch Behavior** - Improved mobile experience
  - Disabled panning and zooming on touch
  - Enabled crosshair on touch for price inspection
  - Applied to all three chart components (RelativePerformanceChart, PremiumDecayChart, StrategyComparisonChart)

### Fixed
- **Position Detail Layout Bug** - Fixed narrow single-column rendering
  - Added `text-align: left` to `.detail-page` to override `#root`'s `text-align: center`
  - Metrics cards now display in proper 2-column grid (matching Strategy layout)
  - Chart now fills full width (800px container) on all detail pages
  - All three detail views now visually identical in layout

### Technical
- Deleted `src/pages/PositionDetail.css` and `src/pages/StrategyDetail.css`
- Created `src/styles/DetailContent.css` for shared content styling
- Created `src/components/MetricCards.jsx` for reusable metric components
- Documented layout fix in memory system for future reference

## [0.3.0] - 2026-04-13

### Added
- **Strategy Scanner** - Full MVP implementation
  - List all stock rotation strategies
  - Create new strategies with ticker, benchmark, lookback period, and entry threshold
  - Toggle strategies active/inactive
  - Click strategy cards to view details
  - Strategy detail page with configuration, current prices, and performance chart
  - Delete strategies with confirmation dialog
  
- **Strategy Performance Chart** - Visual spread tracking
  - Shows relative performance (spread) over lookback period
  - Displays entry threshold as dashed green line
  - Real-time BUY signal indicator when threshold is met
  - Current prices and spread calculation displayed in metrics cards
  
- **ConfirmDialog Component** - Reusable confirmation modal
  - Replaces browser `confirm()` and `alert()` dialogs
  - Professional UI with consistent styling
  - Used for delete confirmations across positions and strategies
  
- **Shared Calculation Library** - `src/lib/calculations.js`
  - Extracted relative performance calculation to shared utility
  - Used by both position and strategy charts
  - Ensures consistency in spread calculations

### Changed
- **Positions now refresh** after adding new position (matches strategy behavior)
- **RefreshKey pattern** consistently applied to both Dashboard and Scanner
- **FAB button behavior** - context-aware based on current route
  - Dashboard: Add Position
  - Scanner: Add Strategy
  - Hidden on detail pages and settings
- **Error handling** - Replaced all `confirm()` and `alert()` with proper UI components
  - Error banners for failures
  - Confirmation dialogs for destructive actions

### Technical
- Refactored duplicate calculation logic into shared utility function
- Updated documentation in ARCHITECTURE.md
- Added memory records for consistent patterns (refreshKey, no browser dialogs)

## [0.2.3] - Previous Version
- Position tracking and detail pages
- Dashboard with filters
- Bottom navigation
- Basic position management

