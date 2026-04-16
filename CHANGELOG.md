# Changelog

All notable changes to Rotation Tracker will be documented in this file.

## [0.10.1] - 2026-04-16

### Fixed
- **Strategy Color Semantics** - Inverted spread colors to match user intent
  - Negative spread (underperforming) = GREEN ✅ (good for entry opportunity)
  - Positive spread (outperforming) = GRAY (still waiting)
  - Removed misleading directional arrows that suggested "down = bad"
  - Now consistent with mean reversion strategy: underperformance = entry signal

### Changed
- **Strategy Spread Display** - Cleaner, more intuitive visual feedback
  - Scanner cards show green when stock underperforms benchmark (entry opportunity)
  - Detail view shows subtle color even before threshold hit
  - Removed confusing ↑/↓ arrows that conflicted with color semantics
  - Visual feedback now aligns with trading intent: "negative spread = good"

## [0.10.0] - 2026-04-16

### Fixed
- **Covered Call Premium Colors** - Inverted colors to match user's position
  - Premium decrease (cheaper to buy back) = GREEN ✅ (good for seller)
  - Premium increase (more expensive to buy back) = RED ❌ (bad for seller)
  - Industry standard: Options sellers want lower premiums
  
### Changed
- **Covered Call Display** - Improved UX for sold options
  - Changed label from "Premium:" to "Cost to Close:" (clearer intent)
  - Shows current cost with directional arrow (↑ ↓)
  - Entry premium shown as reference "(entry: $X.XX)"
  - Colors now match seller's perspective (down = good, up = bad)

- **Stock vs Strike Price Warnings** - Added assignment risk indicators
  - ✓ Safe OTM (green) - Stock > 10% below strike (safe)
  - ⚡ Near Strike (yellow) - Stock within 5% of strike (watch it)
  - ⚠️ ITM - Assignment Risk (red) - Stock above strike (danger)
  - Helps users monitor covered call positions proactively

- **Directional Arrows** - Added visual momentum indicators
  - All spread values show ↑ (up) or ↓ (down) arrows
  - Premium changes show direction + magnitude
  - Easier to see trends at a glance

- **Signal Badge Consistency** - Standardized across app
  - Stock rotation exit: "🔔 EXIT SIGNAL" (was "✓ SWAP SIGNAL")
  - Scanner entry: "🔔 ENTRY SIGNAL" (was "🎯 ENTRY SIGNAL")
  - Covered call buyback: "🔔 BUYBACK SIGNAL" (was "🟢 BUYBACK NOW!")
  - Consistent bell emoji for all alert types

- **Scanner Entry Display** - Improved distance-to-signal feedback
  - Shows "Almost There: X.X% away" when close (80%+ progress)
  - Shows "Entry Target: ✓ Hit!" when signal fires
  - Better progress indication than just raw spread value

### Technical
- Colors now match financial position semantics (long vs short)
- Premium change calculation inverted for sold options
- Added stock price moneyness calculation and warning classes
- Consistent signal terminology across all pages

## [0.9.0] - 2026-04-16

### Fixed
- **Extended Hours Data in Charts** - Charts now display pre-market and after-hours trading data
  - Edge function includes extended hours when fetching intraday data (`includePrePost=true`)
  - Populates `postMarketPrice` and `preMarketPrice` in meta from last array values
  - Session detection using `currentTradingPeriod` (pre/regular/post)
  - Charts automatically show all market hours (4:00 AM - 8:00 PM ET) for same-day positions
  - After-hours price movements now visible in relative performance calculations
  
- **Timestamp Alignment Across Tickers** - Fixed spread calculation for mismatched data points
  - Changed from index-based to timestamp-based matching using Map lookup
  - Handles cases where stock has more data than benchmark (e.g., NFLX 889 points vs VGT 638 points)
  - Only calculates spread when both tickers have data at exact same timestamp
  - Prevents chart from cutting off early when benchmark has fewer data points
  - Applies to both RelativePerformanceChart and StrategyComparisonChart

- **Universal Timezone Display** - Charts now correctly show local time for all users worldwide
  - Created smart time formatters that adapt based on data range
  - Intraday (< 2 days): Shows time only → "4:00 PM"
  - Multi-day intraday (2-60 days): Shows date + time → "Apr 16, 4:00 PM"
  - Long-term daily (60+ days): Shows date only → "Apr 16"
  - Very long-term (> 365 days): Adds year → "Apr 16, 2026"
  - Works correctly for users in any timezone (EDT, GMT, JST, etc.)
  - Both x-axis labels and crosshair tooltips use consistent formatting

### Added
- **Smart Chart Formatters** - `src/lib/chartFormatters.js`
  - `createSmartTimeFormatter()` - Adapts tooltip format to data range
  - `createSmartTickFormatter()` - Adapts axis label format to data range
  - Automatically detects time span and chooses appropriate format
  - Applied to all chart components (RelativePerformanceChart, StrategyComparisonChart, PremiumDecayChart)

### Changed
- **Spread Calculation** - `src/lib/calculations.js` refactored for accuracy
  - Now uses Map-based timestamp matching instead of array indices
  - Skips stock data points where benchmark has no matching timestamp
  - More robust handling of misaligned data from Yahoo Finance

### Technical
- Edge function extended hours logic: extracts last timestamp/close from arrays when `includePrePost=true`
- Timestamp matching prevents assumption that `stockData[i]` matches `benchData[i]`
- All Unix timestamps remain in UTC (seconds since epoch) throughout pipeline
- Formatters use `toLocaleTimeString()` and `toLocaleDateString()` for automatic timezone conversion

## [0.8.0] - 2026-04-16

### Added
- **Real-Time Dashboard Price Displays** - Dashboard and Scanner now show live market data
  - Current prices for stock rotation positions (stock vs benchmark)
  - Current spread calculations with exit/entry thresholds
  - Option premium data for covered calls with bid/ask spreads
  - Signal badges indicating when positions meet action criteria (SWAP/ENTRY/BUYBACK signals)
  - Global timestamp bar with freshness indicator (green <2min, yellow 2-5min, red >5min)
  - Manual refresh button to force update all data

- **Intelligent Price Caching** - sessionStorage-based caching for optimal performance
  - 5-minute TTL per ticker with individual timestamps
  - Automatic cache invalidation for stale data
  - Cache persists across page navigation (not F5)
  - Detail pages update cache when fetching chart data
  - Separate timestamp tracking for Positions and Scanner pages

### Changed
- **Signal Terminology** - Consistent naming across app
  - Strategy/Scanner cards: "🎯 ENTRY SIGNAL" (when to enter position)
  - Position cards (stock rotation): "✓ SWAP SIGNAL" (when to rotate back)
  - Position cards (covered calls): "🟢 BUYBACK NOW!" (early close opportunity)

### Technical
- Created `src/lib/priceCache.js` - centralized cache utilities
- Enhanced edge function calls with batch fetching for efficiency
- Historical price caching for scanner lookback calculations
- Per-page cache key tracking to prevent cross-page timestamp pollution

## [0.7.0] - 2026-04-16

### Added
- **Scanner Status Filter** - Added status filter (All/Active/Paused) to Strategy Scanner page
  - Matches position dashboard functionality for consistency
  - Allows quick filtering of active vs paused strategies

### Changed
- **Chart Hover Improvements** - Enhanced all chart components with better crosshair behavior
  - Y-axis label now shows the actual graph value (not mouse position)
  - Purple label background makes hover values stand out
  - Applies to Strategy Comparison, Relative Performance, and Premium Decay charts
  
- **Simplified Dashboard Cards** - Removed pause/activate buttons from card views
  - Buttons remain available in detail pages for position/strategy management
  - Cleaner card layout focuses on key information
  - Color/opacity still indicates active vs paused status
  
- **Scanner Card Cleanup** - Removed status badge from strategy cards
  - Status is clear from filter selection and card styling
  - Reduced visual clutter
  
- **Filter Reorganization**
  - **Positions Dashboard:** Swapped filter order - Status filter now Row 1, Type filter Row 2
  - **Strategy Scanner:** Status filter added as Row 1
  - More logical hierarchy with status as primary filter
  
- **Settings Notifications Rewrite** - Completely rewrote Notifications section for clarity
  - Added monitoring schedule details (3x daily: 9:30am, 12:30pm, 3:30pm ET)
  - Clearer explanations of what triggers each alert type
  - Better descriptions of strategy entry, position exit, and covered call buyback signals
  - Note about each device needing its own notification subscription
  - Moved schedule info from Scanner page banner to Settings

### Removed
- Pause/activate buttons from Dashboard position cards
- Pause/activate buttons from Scanner strategy cards
- Status badge from Scanner strategy cards
- Schedule banner from Scanner page (moved to Settings)

## [0.6.3] - 2026-04-15

### Fixed
- **PWA Icon Not Updating** - Converted custom SVG icon to PNG format
  - iOS and Android PWAs prefer PNG over SVG for home screen icons
  - Old placeholder PNG files (from April 12) were still being used
  - Converted icon.svg to icon-192.png (192x192) and icon-512.png (512x512)
  - Users must uninstall and reinstall PWA to see new icon
  
### Technical
- Used rsvg-convert to generate PNGs from SVG source
- Maintained both SVG (for web) and PNG (for PWA) formats
- Icon files now dated April 15 (current custom design)

## [0.6.2] - 2026-04-15

### Changed
- **App Icon & Branding** - Custom rotation-themed icon design
  - New icon: Red/green rotation arrows with blue upward trending chart
  - White background with vivid accent colors (matches ticker comparison style)
  - Red arrow (top): counter-clockwise rotation
  - Green arrow (bottom): clockwise rotation  
  - Blue chart line: upward trend matching ticker comparison line style
  - SVG format (scales perfectly, no PNG conversion needed)
  - Favicon and apple-touch-icon use SVG directly
  - Icon displayed in Settings About section for branding
  - Icon appears on: Login page, PWA home screen, browser tabs, push notifications
  
### Technical
- Created `public/icons/icon.svg` - source design file
- Updated `vite.config.js` - theme color #2563eb (blue), SVG as primary icon with `sizes: "any"`
- Updated `index.html` - favicon, apple-touch-icon use SVG, theme color #2563eb
- Icon colors: Red #dc2626, Green #16a34a, Blue #2563eb on white #ffffff
- Follows ticker comparison design pattern (simple, clean, vivid colors)

## [0.6.1] - 2026-04-15

### Fixed
- **Position "How it works" Guide Notes** - Now reflect active/paused status
  - Stock rotation: Shows pause message when paused, monitoring message when active
  - Covered call: Shows pause message when paused, monitoring message when active
  - Background color changes: Green when active, gray when paused
  - Matches strategy detail page pattern exactly

## [0.6.0] - 2026-04-15

### Added
- **Position Pause/Resume Functionality** - Matching strategy pattern
  - Added `active` boolean column to positions table (default TRUE)
  - Pause/resume toggle button on position cards (⏸️ Pause / ▶️ Activate)
  - Status badge on position detail pages (Active / Paused)
  - Paused positions visually grayed out (opacity 0.6, gray background)
  - Two-row independent filtering on Dashboard:
    - Row 1: Type filter (All | Stock Rotation | Covered Calls)
    - Row 2: Status filter (All | Active | Paused)
  - Both filters work independently for maximum flexibility

### Changed
- **Backend Monitoring** - Only checks active positions
  - monitor.py updated to query `.eq('active', True)`
  - Paused positions skip monitoring completely
  - No notifications sent for paused positions
  - Console messages updated: "open" → "active"
  
- **Position Creation** - New positions default to active=TRUE
  - Explicit `active: true` in AddPosition component
  - Start monitoring immediately after creation
  
- **Dashboard Filtering** - Enhanced with dual filters
  - Renamed `filter` to `typeFilter` for clarity
  - Added `statusFilter` (all | active | paused)
  - Combined filtering logic: both filters apply simultaneously
  - Status filter row styled slightly smaller (secondary filter)

### Technical
- **Database Migration 003:** `ALTER TABLE positions ADD COLUMN active BOOLEAN DEFAULT TRUE`
- Created index: `idx_positions_active` for query performance
- Updated DATABASE_SCHEMA.md with new column
- Position detail pages now match strategy detail pages (status badge + pause button)
- CSS matches strategies: `.toggle-button`, `.inactive` card styling

### UX Improvement
- **Solves notification spam:** Users were getting 15+ notifications/week for same position
- **User control:** Explicit choice when to monitor (like "I see the signal but waiting for tax reasons")
- **Consistent pattern:** Positions and strategies now have identical pause/resume UX
- **Flexible filtering:** Find exactly what you want (e.g., "active covered calls only")

## [0.5.7] - 2026-04-15

### Fixed
- **Notification Click 404 Error** - Critical fix for notification URLs
  - Added `/rotation-tracker/` base path to all notification URLs in monitor.py
  - Fixed BUY signal route: `/scanner/{id}` → `/rotation-tracker/strategy/{id}` (correct route)
  - Fixed SELL signal route: `/position/{id}` → `/rotation-tracker/position/{id}`
  - Fixed OPTION_ALERT route: `/position/{id}` → `/rotation-tracker/position/{id}`
  - Fixed default URL: `/` → `/rotation-tracker/`
  - Fixed icon paths to include base path
  - Notifications now correctly navigate to intended page instead of 404

### Technical
- **Root Cause:** monitor.py was sending URLs without GitHub Pages base path
  - Service worker constructed: `https://rezaataei.github.io/position/123` (404!)
  - Now constructs: `https://rezaataei.github.io/rotation-tracker/position/123` ✓
- All three notification types now use correct full paths
- Icon URLs also updated to include base path

## [0.5.6] - 2026-04-15

### Changed
- **Version Display UX** - Following mobile app industry standards
  - Removed floating footer from all pages (cleaner UI, more screen space)
  - Version now shown ONLY in Settings → About section (iOS/Android pattern)
  - Added "Build Date" field to Settings About section
  - No more duplication (was showing in floating footer + Settings)
  - More professional mobile app experience
  
### Fixed
- **About Section Accuracy** - Updated deployment platform
  - Changed "deployed on Vercel" to "deployed on GitHub Pages" (correct)

### Technical
- Deleted AppFooter.jsx and AppFooter.css components
- Removed AppFooter import and usage from App.jsx
- Enhanced Settings About section with build date display
- Follows industry standard: 95% of mobile apps show version only in Settings

## [0.5.5] - 2026-04-15

### Fixed
- **Version Footer Display** - Now visible on all pages
  - Created shared AppFooter component
  - Shows "v{version} • Built {date}" consistently across app
  - Positioned above bottom nav on all pages (Dashboard, Scanner, Settings, Position/Strategy details)
  - Removed duplicate footer from Dashboard.jsx
  
- **Page Refresh 404 Error** - Fixed GitHub Pages SPA routing issue
  - Created 404.html to handle direct navigation/refresh on non-home routes
  - Added redirect logic using sessionStorage to preserve path
  - App now correctly navigates to intended page after redirect
  - Fixes issue where refreshing on /scanner or /position/:id showed 404
  
- **Notification Click Behavior** - Improved PWA/browser tab handling
  - Prioritizes visible clients (PWA or browser tab currently in view)
  - Uses client.navigate() instead of openWindow() when client exists
  - Focuses existing app and navigates to notification target page
  - Better UX: reuses existing app window instead of opening new tabs
  - Still opens new window if no client is running (can't auto-launch PWA)

## [0.5.4] - 2026-04-15

### Fixed
- **Multi-device Notification Toggle UX** - Critical bug fix
  - Toggle now reflects LOCAL browser subscription status (not database)
  - Before: Device B showed toggle ON if Device A had subscription (misleading!)
  - After: Each device shows its own true subscription status
  - User must explicitly enable on each device (expected behavior)
  - Prevents false assumption of receiving notifications when not subscribed
  - Database still stores all subscriptions for multi-device support

## [0.5.3] - 2026-04-15

### Changed
- **Service Worker Logging** - Cleaned up debug logging
  - Removed extensive debug logs from push event handler
  - Removed verbose logging from push subscription flow
  - Kept essential error logging for troubleshooting

### Technical
- **notifications table** - Clarified purpose and retention policy
  - Table stores permanent history/audit log of all sent notifications
  - Rows are never auto-deleted (intentional - it's a log)
  - Used for debugging, analytics, and preventing duplicate alerts
  - Different from push_subscriptions (which gets deleted on toggle OFF)

## [0.5.2] - 2026-04-15

### Fixed
- **Service Worker Registration** - Added manual registration for injectManifest strategy
  - Service worker now properly registers on page load
  - Fixed undefined manifest error in service worker install event
  - Added fallback for empty manifest array
  
- **Push Subscription Delete** - Fixed toggle OFF not removing database row
  - Get subscription endpoint BEFORE unsubscribing
  - Properly deletes row from push_subscriptions table
  - Maintains clean data (no stale subscriptions)

### Changed
- **Settings Page** - Removed User ID display
  - Email is sufficient for user identification
  - Cleaner, less cluttered interface

## [0.5.1] - 2026-04-15

### Fixed
- **Service Worker Build Error** - Added Workbox manifest placeholder
  - Added `self.__WB_MANIFEST` placeholder required by vite-plugin-pwa
  - Updated install event to precache manifest files
  - Fixed build error: "Unable to find a place to inject the manifest"
  
### Changed
- **.env.example** - Removed VAPID private key and claims email
  - Only shows VAPID_PUBLIC_KEY (frontend-safe)
  - Private key and email documented as GitHub Secrets only

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

