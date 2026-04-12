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

### **Flow 1: User Opens Position**

```
User taps NVDA position card
  ↓
Frontend fetches position from Supabase
  ↓
Frontend requests historical prices:
  - fetchYahooHistory('NVDA', entry_date, today)
  - fetchYahooHistory('VGT', entry_date, today)
  ↓
Calculate spread: stock_return - bench_return for each day
  ↓
Render TradingView chart with:
  - Green line: current spread
  - Yellow dash: exit threshold
  - Entry marker
  ↓
Display to user (<2 sec total)
```

### **Flow 2: Cron Checks Positions**

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
  │    │   └─ Send push: "NVDA ready to exit +12.5%"
  │    └─ IF type == 'covered_call':
  │        ├─ Get option chain (Yahoo)
  │        ├─ Extract bid/ask
  │        ├─ Calculate spread
  │        ├─ Update position.current_bid/ask/mid
  │        └─ IF mid <= alert_target:
  │            └─ Send push: "ETHA call at target"
  │
  └─ Fetch active strategies
      ↓
     FOR EACH strategy:
       ├─ Get historical prices (lookback_days)
       ├─ Calculate relative performance
       ├─ IF underperformance <= entry_threshold:
       │   ├─ Check if position already exists
       │   └─ IF NOT exists:
       │       └─ Send push: "NVDA buy signal"
       └─ Update strategy.last_checked_at
  ↓
Script completes (5-10 min for 100 users)
```

### **Flow 3: Push Notification**

```
Cron detects signal
  ↓
Fetch user's push subscription from Supabase
  ↓
Prepare notification payload:
  {
    title: "NVDA Ready to Exit",
    body: "+12.5% outperformance vs VGT",
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
// Cache static assets
workbox.precaching.precacheAndRoute([
  { url: '/index.html', revision: 'v1' },
  { url: '/bundle.js', revision: 'v1' },
  { url: '/styles.css', revision: 'v1' }
]);

// Cache API responses (positions, strategies)
workbox.routing.registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/.*/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 300 // 5 minutes
      })
    ]
  })
);
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
  ├─ Install dependencies
  ├─ Run tests (future)
  ├─ Build React app (npm run build)
  ├─ Deploy to GitHub Pages (gh-pages branch)
  └─ ~2 minutes total
  ↓
GitHub Pages serves static files
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
