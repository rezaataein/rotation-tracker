# Changelog

All notable changes to Rotation Tracker will be documented in this file.

## [0.5.0] - 2026-04-15

### Added
- **Web Push Notifications - Frontend Implementation**
  - Custom service worker (`public/sw.js`) handles push events
  - Push notification handler displays alerts with custom data
  - Notification click opens app to relevant page (position/strategy)
  - Push subscription utility functions (`src/lib/pushNotifications.js`)
  - Settings page notification toggle (fully functional)
  - Permission request flow with error handling
  - Subscription save/remove from Supabase database
  - Browser support detection
  - Loading states and error messages

### Changed
- **Settings Page** - Notifications section now fully functional
  - Toggle enables/disables push notifications
  - Shows subscription status on load
  - Displays success/error states with colored info notes
  - Checks browser support automatically
  
- **PWA Configuration** - Updated to use custom service worker
  - Changed from `generateSW` to `injectManifest` strategy
  - Custom SW handles both caching and push notifications
  - Removed workbox configuration (using custom fetch handler)

### Technical
- VAPID public key configured via `VITE_VAPID_PUBLIC_KEY` env variable
- Service worker supports offline caching and push notifications
- Subscription data (endpoint, p256dh, auth) saved to database
- Added VAPID keys to GitHub Actions workflow environment
- Updated `.github/SETUP_SECRETS.md` documentation

## [0.4.0] - 2026-04-15

### Added
- **Web Push Notifications - Backend Implementation**
  - Added `pywebpush` library to requirements.txt
  - VAPID keys configuration via environment variables
  - Real web push sending in monitor.py (replaces fake notifications)
  - Fetches user push subscriptions from database
  - Sends notifications to all subscribed devices
  - Removes invalid/expired subscriptions automatically
  - Saves notification history to database
  - Validates VAPID configuration on startup

### Changed
- **monitor.py Signals** - All signals now include `user_id`
  - Entry signals (strategies)
  - Swap signals (stock rotation positions)
  - Buyback alerts (covered call positions)
  
- **Notification Content** - Updated terminology
  - Entry Signal: "Ready to enter position"
  - Swap Signal: "Ready to rotate back"
  - Buyback Alert: "Early close opportunity"

### Technical
- VAPID keys stored in GitHub Secrets (PUBLIC_KEY, PRIVATE_KEY, CLAIMS_EMAIL)
- Web push sends to browser's native push service (free, no third-party)
- Handles WebPushException for invalid subscriptions (410, 404)
- Database tables (push_subscriptions, notifications) still need creation

## [0.3.4] - 2026-04-15

### Fixed
- **Covered Call Option Data** - Now correctly displays bid/ask and premium
  - Edge function accepts optional `expirationDate` parameter (YYYY-MM-DD)
  - Filters Yahoo Finance options API to specific expiration date only
  - Reduces data transfer and ensures exact option matching
  - PositionDetail now passes position.expiration to filter options
  - Simplified matching logic (no need to check expiration - already filtered)

### Changed
- **Edge Function API** - Added `expirationDate` optional parameter
  - When provided, adds `&date=UNIX_TIMESTAMP` to Yahoo options URL
  - Returns only options for that specific expiration (not all expirations)
  - More efficient: less data transfer, faster matching
  
- **fetchOptions()** - Now accepts optional `expirationDate` parameter
  - `fetchOptions(ticker, expirationDate)` - second param optional
  - Passes to Edge function for filtering

### Technical
- Updated `supabase/functions/fetch-quotes/index.ts` (requires manual deployment)
- Updated `supabase/functions/README.md` with new parameter documentation
- Created memory file: Edge function deployment workflow reminder

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

