# Technical Architecture

**Deep dive into technical decisions and implementation details.**

---

## 🏗️ **System Architecture**

```
┌──────────────────────────────────────────────────────┐
│                    USERS                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Android  │  │   iOS    │  │ Desktop  │           │
│  │  Chrome  │  │  Safari  │  │  Chrome  │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │                  │
│       └─────────────┼─────────────┘                  │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│              FRONTEND (PWA)                          │
│  ┌────────────────────────────────────────────────┐ │
│  │  React 18 + React Router                      │ │
│  │  - Login/Signup                               │ │
│  │  - Dashboard                                  │ │
│  │  - Strategy Scanner                           │ │
│  │  - Position List                              │ │
│  │  - Position Detail (with charts)              │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Service Worker                               │ │
│  │  - Cache static assets                        │ │
│  │  - Receive push notifications                 │ │
│  │  - Background sync (future)                   │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  TradingView Lightweight Charts               │ │
│  │  - Relative performance charts                │ │
│  │  - Premium decay charts                       │ │
│  │  - Strategy preview charts                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Hosted on: GitHub Pages or Vercel                  │
└──────────────┬───────────────────────────────────────┘
               │ HTTPS
               │ Supabase JS SDK
               ▼
┌──────────────────────────────────────────────────────┐
│              SUPABASE CLOUD                          │
│  ┌────────────────────────────────────────────────┐ │
│  │  Auth (Built-in)                              │ │
│  │  - Email/Password authentication              │ │
│  │  - JWT session management                     │ │
│  │  - User management                            │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                          │ │
│  │  - positions table                            │ │
│  │  - strategies table                           │ │
│  │  - push_subscriptions table                   │ │
│  │  - notifications table                        │ │
│  │  - Row-Level Security (RLS)                   │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Realtime                                     │ │
│  │  - Live position updates                      │ │
│  │  - Multi-tab sync                             │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  REST API (Auto-generated)                    │ │
│  │  - CRUD operations                            │ │
│  │  - Filtered by RLS                            │ │
│  └────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────┘
               ▲
               │ Service Role API Key
               │ (Full access - bypasses RLS)
               │
┌──────────────┴───────────────────────────────────────┐
│          GITHUB ACTIONS (Cron Job)                   │
│  ┌────────────────────────────────────────────────┐ │
│  │  Schedule:                                     │ │
│  │  - 9:00 AM ET  (13:00 UTC)                    │ │
│  │  - 12:00 PM ET (16:00 UTC)                    │ │
│  │  - 3:00 PM ET  (19:00 UTC)                    │ │
│  │  - Mon-Fri only                               │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Node.js Script (check-signals.js)            │ │
│  │                                                │ │
│  │  FOR EACH user:                               │ │
│  │    1. Fetch active strategies                 │ │
│  │    2. Get historical prices (Yahoo Finance)   │ │
│  │    3. Calculate signals (BUY/SELL)            │ │
│  │    4. Fetch open positions                    │ │
│  │    5. Get current prices                      │ │
│  │    6. Update position.current_* fields        │ │
│  │    7. Check exit thresholds                   │ │
│  │    8. Send push notifications if triggered    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Dependencies:                                       │
│  - @supabase/supabase-js (database client)          │
│  - web-push (send notifications)                    │
│  - node-fetch (Yahoo Finance API)                   │
└──────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│          YAHOO FINANCE API (Public)                  │
│  - Historical prices                                 │
│  - Current stock prices                              │
│  - Option chains (bid/ask/IV)                        │
│  - Free, no API key needed                           │
└──────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│          WEB PUSH SERVICES                           │
│  - FCM (Android Chrome)                              │
│  - Apple Push (iOS Safari 16.4+)                     │
│  - Mozilla Push (Firefox)                            │
└──────────────────────────────────────────────────────┘
```

---

## 🔑 **Key Technical Decisions**

### **1. Why PWA Instead of Native Apps?**

**Pros:**
- ✅ Single codebase (React) for iOS + Android + Desktop
- ✅ Instant deployment (no app store approval)
- ✅ Free hosting (GitHub Pages / Vercel)
- ✅ Auto-updates (no user action needed)
- ✅ Works offline with service worker
- ✅ Installable ("Add to Home Screen")

**Cons:**
- ⚠️ iOS requires "Add to Home Screen" for push notifications
- ⚠️ Slightly less native feel than Swift/Kotlin
- ⚠️ Limited access to device APIs

**Decision:** PWA is perfect for MVP. Can always build native wrapper later using same backend.

---

### **2. Why Supabase Instead of Firebase?**

**Comparison:**

| Feature | Supabase | Firebase |
|---------|----------|----------|
| Database | PostgreSQL (relational) | Firestore (NoSQL) |
| Free Storage | 500MB | 1GB |
| Free Bandwidth | 1GB | 50K reads/day |
| Auth | Built-in | Built-in |
| RLS | ✅ Database-level | Client-side rules |
| SQL Queries | ✅ Full PostgreSQL | ❌ Limited |
| Real-time | ✅ | ✅ |
| Admin Dashboard | ✅ Full SQL access | Limited |

**Decision:** Supabase wins for trading data (relational, better free tier, SQL queries).

---

### **3. Why GitHub Actions Instead of Dedicated Backend?**

**Comparison:**

| Option | Cost | Complexity | Reliability |
|--------|------|------------|-------------|
| GitHub Actions | $0 | Low | High |
| Vercel Cron | $0 | Low | High |
| Railway.app | $5/mo | Low | High |
| GCP VM (existing) | $5-10/mo | Medium | High |
| AWS Lambda | ~$1/mo | Medium | High |

**Decision:** GitHub Actions is free, simple, and reliable. Easy to migrate later.

---

### **4. Why Yahoo Finance Instead of Paid APIs?**

**Comparison:**

| API | Cost | Data Quality | Reliability |
|-----|------|--------------|-------------|
| Yahoo Finance | Free | Good | High |
| Alpha Vantage | Free tier limited | Excellent | Medium |
| IEX Cloud | $9/mo | Excellent | High |
| Polygon.io | $29/mo | Excellent | Very High |

**Decision:** Yahoo Finance is free and sufficient for MVP. Can upgrade later.

---

### **5. Why No Historical Data Storage?**

**Option A: Store Daily Snapshots**
```sql
CREATE TABLE price_history (
  position_id UUID,
  date DATE,
  stock_price DECIMAL,
  bench_price DECIMAL,
  ...
);
-- Cron saves daily snapshot
```

**Pros:**
- Faster chart rendering
- Don't rely on Yahoo Finance availability

**Cons:**
- ❌ Database grows quickly (365 rows/position/year)
- ❌ More complex cron logic
- ❌ Can't change chart timeframes easily
- ❌ Data staleness if cron fails

**Option B: Fetch On-Demand in Frontend (CHOSEN)**
```javascript
// When user opens position card
fetchHistoricalPrices(ticker, from_date, to_date)
  .then(renderChart)
```

**Pros:**
- ✅ Minimal database size
- ✅ Always fresh data
- ✅ Flexible timeframes
- ✅ Simple cron logic

**Cons:**
- Slight delay when opening chart (1-2 sec)

**Decision:** On-demand is better. Users don't open charts constantly, and fresh data is worth the delay.

---

## 📊 **Data Flow Examples**

### **Flow 1: User Adds Position (with Validation)**

```
User fills form (ticker, benchmark, prices, etc.)
  ↓
User clicks "Add Position"
  ↓
Frontend: Show loading state
  ↓
Frontend validates ticker with Yahoo Finance API:
  - GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL
  - Timeout: 10 seconds
  ↓
IF ticker not found (404 or empty result):
  ├─ Show inline error below ticker field (red)
  ├─ Red border + shake animation
  ├─ Auto-focus ticker input
  └─ Block position creation
  ↓
ELSE IF network error / timeout / rate limit:
  ├─ Show system error banner at top (yellow)
  ├─ Auto-scroll modal to top
  ├─ User can dismiss and retry
  └─ Block position creation
  ↓
ELSE ticker valid:
  ├─ For stock rotation: also validate benchmark
  └─ Continue to save
  ↓
Save to Supabase positions table
  ↓
Close modal, show position on dashboard
  ↓
Total time: 1-3 seconds (depending on network)
```

**Error Messages:**
- Field errors: "Ticker 'ZZZZZ' not found. Please verify the symbol is correct."
- System errors: "Request timed out. Yahoo Finance is slow to respond. Please try again."

**Why pre-validate?**
- ✅ No garbage data in database
- ✅ Immediate user feedback
- ✅ Prevents typos (APPL vs AAPL)
- ✅ Simpler cron job (all tickers guaranteed valid)

---

### **Flow 2: User Views Dashboard (with Caching)**

```
User opens Dashboard
  ↓
Component mounts, reads positions from Supabase DB
  ↓
Collect all required tickers:
  - Stock rotation: [stock, benchmark] pairs
  - Covered calls: [stock, option data]
  - Total: ~10-40 tickers typically
  ↓
Check sessionStorage cache for each ticker:
  ├─ Cached & fresh (<5 min) → Add to cachedData
  └─ Missing or stale (>5 min) → Add to staleTickers
  ↓
Render cards immediately with:
  - Static DB data (ticker, config, status)
  - Cached prices if available
  - "Loading..." for stale/missing tickers
  ↓
Batch fetch stale tickers (if any):
  - Stock quotes: fetchQuotes([...staleTickers]) → ONE API call
  - Options: fetchOptions(ticker, expiration) → Per covered call
  ↓
Update sessionStorage with fresh data + timestamps
  ↓
Update cards sequentially (top to bottom):
  - Calculate spreads
  - Determine signal status (ENTRY/SWAP/BUYBACK)
  - Re-render with live data + signal badges
  ↓
Update global timestamp (shows oldest ticker time)
  ↓
Total time: 0 sec (all cached) to 3 sec (cold load)
```

### **Flow 3: User Views Position Detail**

```
User taps NVDA position card
  ↓
Frontend fetches position from Supabase
  ↓
Frontend requests historical prices:
  - fetchMultipleHistoricalPrices(['NVDA', 'VGT'], entry_date, today)
  ↓
Extract current prices from historical response:
  - stockData.meta.regularMarketPrice
  - benchData.meta.regularMarketPrice
  ↓
Update sessionStorage cache with fresh prices:
  - updateCacheTickers({ 'NVDA': {...}, 'VGT': {...} })
  ↓
Calculate spread: stock_return - bench_return for each day
  ↓
Render TradingView chart with:
  - Green line: current spread
  - Yellow dash: exit threshold
  - Entry marker
  ↓
Display to user (<2 sec total)
  ↓
User navigates back to Dashboard:
  → NVDA & VGT prices now cached and fresh
  → Dashboard loads instantly with cached data
```

### **Flow 4: Cron Checks Positions**

```
GitHub Actions triggers (9am ET)
  ↓
Script starts: check-signals.js
  ↓
Fetch all users from Supabase
  ↓
FOR EACH user:
  ├─ Fetch open positions
  │   ↓
  │  FOR EACH position:
  │    ├─ Get current stock price (Yahoo)
  │    ├─ Get current benchmark price (Yahoo)
  │    ├─ Calculate outperformance
  │    ├─ Update position.current_* fields
  │    ├─ IF outperformance >= exit_threshold:
  │    │   └─ Send push: "NVDA ready to swap +12.5%"
  │    └─ IF type == 'covered_call':
  │        ├─ Get option chain (Yahoo)
  │        ├─ Extract bid/ask
  │        ├─ Calculate spread
  │        ├─ Update position.current_bid/ask/mid
  │        └─ IF mid <= alert_target:
  │            └─ Send push: "ETHA call at buyback target"
  │
  └─ Fetch active strategies
      ↓
     FOR EACH strategy:
       ├─ Get historical prices (lookback_days)
       ├─ Calculate relative performance
       ├─ IF underperformance <= entry_threshold:
       │   ├─ Check if position already exists
       │   └─ IF NOT exists:
       │       └─ Send push: "NVDA entry signal"
       └─ Update strategy.last_checked_at
  ↓
Script completes (5-10 min for 100 users)
```

### **Flow 5: Push Notification**

```
Cron detects signal
  ↓
Fetch user's push subscription from Supabase
  ↓
Prepare notification payload:
  {
    title: "NVDA Ready to Swap",
    body: "+12.5% outperformance vs VGT (time to rotate back)",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { positionId: "abc-123", action: "SELL" }
  }
  ↓
Send via Web Push Protocol to:
  - FCM (Android)
  - Apple Push (iOS)
  - Mozilla Push (Firefox)
  ↓
User's device receives (even if browser closed)
  ↓
Service worker wakes up
  ↓
Shows notification
  ↓
User taps notification
  ↓
Browser opens to position detail page
```

---

## 🔒 **Security Architecture**

### **Authentication Flow**

```
User enters email/password
  ↓
Frontend calls supabase.auth.signUp()
  ↓
Supabase:
  - Hashes password with bcrypt
  - Creates user in auth.users
  - Sends confirmation email
  - Returns session token (JWT)
  ↓
Frontend saves JWT in localStorage
  ↓
All API calls include JWT in Authorization header
  ↓
Supabase verifies JWT and extracts user_id
  ↓
RLS policies filter data by user_id
```

### **Row-Level Security (RLS)**

```sql
-- Policy example
CREATE POLICY "Users see own positions"
  ON positions FOR SELECT
  USING (auth.uid() = user_id);
```

**How it works:**
```javascript
// User 1 (UUID: abc-123) queries
const { data } = await supabase
  .from('positions')
  .select('*')

// Supabase automatically adds:
// WHERE user_id = 'abc-123'

// Returns ONLY user 1's positions
```

**Cannot be bypassed:**
- RLS enforced at PostgreSQL level
- Even if user modifies browser code
- Even if user crafts custom API request
- Only service_role key can bypass (cron only)

### **API Keys**

```
┌─────────────────────────────────────┐
│  anon (public) key                  │
│  - Exposed in frontend code         │
│  - RLS enforced                     │
│  - Safe to commit to GitHub         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  service_role key                   │
│  - Used in GitHub Actions           │
│  - Bypasses RLS                     │
│  - Full database access             │
│  - NEVER expose in frontend         │
│  - Store in GitHub Secrets          │
└─────────────────────────────────────┘
```

---

## 🎨 **UI Structure & Navigation**

### **Page Hierarchy**

```
Login/Signup (public)
  ↓
Dashboard (authenticated)
  ├─ Header: User email
  ├─ Filter tabs: All | Stock Rotation | Covered Calls
  ├─ Position cards (filtered list)
  ├─ FAB: + button (opens Add Position modal)
  └─ Bottom navigation (3 tabs):
      ├─ 🔍 Scanner
      ├─ 📊 Positions (active)
      └─ ⚙️ Settings (shows version in About section)
```

### **Navigation Tabs** (Bottom)

**Current:**
- Scanner → Strategy scanner page (not built yet)
- Positions → Dashboard with position list (current page)
- Settings → User settings page (not built yet)

**Removed:**
- Options tab (was redundant - positions already shows all types)
- Use filter tabs instead to separate stock rotation vs covered calls

### **Modals**

**Add Position:**
- Full-screen modal on mobile
- Form with type selector (Stock Rotation | Covered Call)
- Dynamic fields based on type
- Pre-validation with Yahoo Finance before save
- Comprehensive error handling (inline field errors + system error banner)

**Position Detail:** (not built yet)
- Shows chart, current prices, P&L
- Edit/Delete buttons

---

## 💰 **Frontend Price Caching Strategy**

### **Overview**

Dashboard and Scanner pages display real-time prices, spreads, and signals by fetching from Yahoo Finance on the frontend. To optimize performance and reduce API calls, we use intelligent per-ticker caching.

### **Cache Design**

**Storage:** `sessionStorage` (clears on page refresh, persists during navigation)

**Structure:**
```javascript
{
  // Stock quotes
  'NVDA': { 
    price: 850.23, 
    timestamp: 1745684055000,
    source: 'dashboard' | 'detail_page'
  },
  
  // Options data (key: ticker_strike_expiration)
  'AAPL_180_2026-02-21': { 
    stockPrice: 182.50,
    bid: 0.82,
    ask: 0.88,
    mid: 0.85,
    timestamp: 1745684000000,
    source: 'detail_page'
  }
}
```

**TTL:** 5 minutes per ticker (individual timestamps)

### **Why sessionStorage?**

| Behavior | localStorage | sessionStorage ✅ |
|----------|-------------|------------------|
| Page refresh (F5) | Cache persists, need logic to detect refresh | Cleared automatically → always fresh |
| Navigate away & back | Cache persists | Cache persists |
| Close tab & reopen | Stale cache persists | Cleared → fresh data |
| Multiple tabs | Shared cache (confusing) | Independent per tab |

**Decision:** sessionStorage provides "F5 = fresh data" behavior automatically without complex refresh detection logic.

### **Cache Flow**

**Dashboard Load:**
```javascript
1. Check sessionStorage for each required ticker
2. Use cached if <5 min old, otherwise mark stale
3. Render cards with static DB data + "Loading..." for prices
4. Batch fetch stale tickers: fetchQuotes([...staleTickers])
5. Update sessionStorage with fresh data
6. Re-render cards with live prices
```

**Detail Page Visit:**
```javascript
1. Fetch historical data for chart
2. Extract current price from historical response
3. Update sessionStorage for those tickers
4. When user navigates back, Dashboard uses fresh cached data
```

**Partial Cache Refresh:**
```
Dashboard has 10 tickers
- 4 tickers cached fresh (from detail page visit)
- 6 tickers stale (>5 min old)
→ Only fetch 6 stale tickers (saves 4 API calls!)
```

### **API Call Optimization**

**Example: 10 positions (5 stock rotation, 3 covered calls, 2 strategies)**

**Cold Load (no cache):**
- 1x `fetchQuotes([...14 stock tickers])` → ONE call
- 3x `fetchOptions(ticker, expiration)` → THREE calls
- **Total: 4 API calls in ~2-3 seconds**

**Warm Load (partial cache):**
- 8 tickers cached, 6 stale
- 1x `fetchQuotes([...6 stale tickers])` → ONE call
- 2x `fetchOptions(...)` (1 cached)
- **Total: 3 API calls in ~1-2 seconds**

**Hot Load (all cached from detail page visit):**
- All tickers fresh in cache
- **Total: 0 API calls, instant render**

### **Timestamp Display**

**Global indicator showing oldest cached data:**
```jsx
<div className="price-status-bar sticky">
  <span className="timestamp fresh">
    🟢 Last updated at 2:34 PM
  </span>
  <button onClick={refreshAll}>🔄 Refresh</button>
</div>
```

**Color codes:**
- 🟢 Green: <2 min (fresh)
- 🟡 Yellow: 2-5 min (recent)
- 🔴 Red: >5 min (stale, click refresh)

**Shows exact time** (not "2 min ago") to avoid staleness confusion.

---

## 📈 **Performance Optimizations**

### **Frontend**

**Code Splitting:**
```javascript
// Lazy load heavy components
const PositionDetail = lazy(() => import('./pages/PositionDetail'));
const ChartComponent = lazy(() => import('./components/Chart'));
```

**Service Worker Caching:**
```javascript
// vite-plugin-pwa auto-generates service worker with precaching
// Configure in vite.config.js:

import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 300 // 5 minutes
          }
        }
      }
    ]
  }
});
```

**Chart Data Caching:**
```javascript
// Cache Yahoo Finance responses in memory
const priceCache = new Map();

async function fetchHistoricalPrices(ticker, days) {
  const key = `${ticker}-${days}`;
  
  if (priceCache.has(key)) {
    const cached = priceCache.get(key);
    if (Date.now() - cached.timestamp < 300000) { // 5 min
      return cached.data;
    }
  }
  
  const data = await fetchYahoo(ticker, days);
  priceCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### **Backend (Cron)**

**Batch Database Updates:**
```javascript
// Instead of N individual updates
for (const position of positions) {
  await supabase.from('positions').update({ ... }).eq('id', position.id);
}

// Do bulk update
await supabase.from('positions').upsert(
  positions.map(p => ({
    id: p.id,
    current_stock_price: p.price,
    current_outperformance: p.outperformance,
    updated_at: new Date()
  }))
);
```

**Parallel Processing:**
```javascript
// Check all users in parallel
const results = await Promise.all(
  users.map(user => checkUserSignals(user))
);
```

**Smart Caching:**
```javascript
// Cache stock prices across users
const priceCache = {};

async function getStockPrice(ticker) {
  if (priceCache[ticker]) return priceCache[ticker];
  
  const price = await fetchYahoo(ticker);
  priceCache[ticker] = price;
  return price;
}
```

---

## 🚀 **Deployment Pipeline**

```
Developer commits to main branch
  ↓
GitHub Actions: Build & Deploy
  ├─ Install dependencies (npm install)
  ├─ Run tests (future)
  ├─ Build Vite app (npm run build → outputs to dist/)
  ├─ Deploy to GitHub Pages (gh-pages branch)
  └─ ~2 minutes total
  ↓
GitHub Pages serves static files from dist/
  ↓
Users access https://username.github.io/rotation-tracker
  ↓
Service worker caches for offline access
```

**Rollback:** Revert commit, re-deploy previous version

---

## 📊 **Monitoring & Observability**

**What to Monitor:**

1. **Supabase Dashboard:**
   - Database size (approaching 500MB?)
   - API requests (approaching limits?)
   - Auth users (how many signups?)
   - Error logs

2. **GitHub Actions:**
   - Workflow run history
   - Execution time (getting slower?)
   - Error logs
   - Success/failure rate

3. **Browser Console (Users):**
   - JavaScript errors
   - Network failures
   - Push notification status

**Alerts to Set Up (Future):**
- Database > 400MB → Email admin
- Cron failures > 2 consecutive → Email admin
- API errors > 50/day → Email admin

---

## 🔄 **Future Enhancements**

**Phase 2:**
- Native iOS app (React Native)
- Native Android app (React Native)
- Real-time price streaming (WebSocket)
- Portfolio analytics dashboard
- Trade journal export (CSV)
- Custom alert conditions
- Multiple chart timeframes
- Dark mode

**Phase 3:**
- Machine learning signal scoring
- Backtesting framework
- Community strategies (share templates)
- Webhook integrations (Discord, Slack)
- Paper trading mode
- Mobile widgets (iOS 17, Android 13)

---

**This architecture is designed to start small, scale efficiently, and evolve as needed.**
