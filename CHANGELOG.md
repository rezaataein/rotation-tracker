# Changelog

All notable changes to Rotation Tracker will be documented in this file.

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

