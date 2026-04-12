# Rotation Tracker - Position & Strategy Monitor

**A mobile-first Progressive Web App for tracking stock rotation strategies and options positions.**

---

## 🎯 **Project Overview**

Multi-user trading position tracker with automated signal monitoring and push notifications.

**Core Features:**
- 📊 Stock rotation strategy scanner (any ticker vs any benchmark)
- 📈 Position tracking with real-time performance
- 📞 Covered call options monitoring
- 🔔 Automated push notifications (3-4x daily checks)
- 📱 Mobile-first PWA (works offline, installable)
- 👥 Multi-user with secure data isolation

**Tech Stack:**
- Frontend: React PWA + TradingView Lightweight Charts
- Backend: Supabase (PostgreSQL + Auth + Real-time)
- Cron: GitHub Actions (scheduled checks 3-4x daily)
- Notifications: Web Push API
- Market Data: Yahoo Finance API
- Hosting: GitHub Pages / Vercel (free)

**Cost:** $0/month (all free tiers)

---

## 📋 **What This App Does**

### **1. Strategy Scanner**
User configures strategy to monitor:
```
Stock: NVDA
Benchmark: VGT
Lookback: 45 days
Entry: -12% underperformance
Exit: +6% outperformance
```

App checks 3x daily (9am, 12pm, 3pm ET):
- If NVDA -12% vs VGT → Send BUY signal push notification
- If user opens position → Track it automatically
- When NVDA +6% vs VGT → Send SELL signal push notification

### **2. Position Tracking**

**Stock Rotation Positions:**
- Saves entry prices (stock + benchmark)
- Shows current outperformance %
- Mini chart of relative performance
- Alert when exit threshold reached

**Covered Call Positions:**
- Saves strike, expiration, entry premium
- Shows current bid/ask spread
- Calculates profit %
- Alert when bid price hits target

### **3. Push Notifications**
- Silent unless action needed
- BUY signal → "NVDA ready to enter"
- SELL signal → "NVDA ready to exit +12.5%"
- Options alert → "ETHA call at target price"

---

## 🏗️ **Architecture**

```
┌─────────────────────────────┐
│   Users (Mobile/Desktop)    │
│   - You (admin)             │
│   - Other users             │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   PWA (React)               │
│   - Position cards w/charts │
│   - Strategy scanner        │
│   - Push notifications      │
│   - Hosted: GitHub Pages    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   Supabase (Free Tier)      │
│   - PostgreSQL database     │
│   - User authentication     │
│   - Row-level security      │
│   - Real-time subscriptions │
└──────────┬──────────────────┘
           ▲
           │
┌──────────┴──────────────────┐
│   GitHub Actions (Cron)     │
│   - Runs 9am, 12pm, 3pm ET  │
│   - Checks all positions    │
│   - Sends push if signal    │
└─────────────────────────────┘
```

---

## 📊 **Data Model**

**Positions Table:**
- Stock rotations (ticker, benchmark, entry prices, thresholds)
- Covered calls (ticker, strike, expiration, premium, alert target)
- Current prices updated by cron
- NO historical price data stored

**Strategies Table:**
- Saved scanners that auto-run
- User can activate/deactivate
- Generates BUY signals when triggered

**Push Subscriptions Table:**
- Web Push endpoints per user
- Used by cron to send notifications

**Security:**
- Row-Level Security (RLS) isolates user data
- Admin can see everything via Supabase dashboard
- Users can only see their own data
- Passwords encrypted (bcrypt) - admin cannot see

---

## 📱 **User Experience**

### **Mobile UI Pattern:**
- Bottom tab navigation (Scanner | Positions | Options | Alerts)
- Card-based position list
- Swipe actions (edit/delete)
- Floating Action Button (+ to add position)
- Status indicators (🔴 underperforming | 🟢 ready to exit)

### **Charts:**
- TradingView Lightweight Charts (35KB)
- Rendered on-demand in frontend
- Historical data fetched from Yahoo Finance when card opens
- Shows relative performance over time
- Entry point + exit threshold markers

---

## 🔐 **Multi-User Security**

**Admin (You):**
- Full access via Supabase dashboard
- Can see all users, all positions
- Can run SQL queries
- Can export data
- **Cannot** see user passwords (encrypted)

**Users:**
- Sign up with email/password
- Each user has unique UUID
- Can only access their own positions (enforced by RLS)
- Cannot see other users' data
- Cannot access database directly

---

## 🚀 **Implementation Plan**

See `IMPLEMENTATION.md` for detailed step-by-step guide.

**Phase 1: MVP**
1. Setup Supabase project
2. Create database schema
3. Setup GitHub Actions
4. Build React PWA shell
5. Implement position tracking
6. Add strategy scanner
7. Setup push notifications
8. Deploy to GitHub Pages

**Phase 2: Polish**
- TradingView charts
- Performance analytics
- Historical trade log
- Export data to CSV

---

## 📚 **Documentation**

- `README.md` - This file (overview)
- `IMPLEMENTATION.md` - Step-by-step build guide
- `ARCHITECTURE.md` - Technical decisions & details
- `DATABASE_SCHEMA.md` - Complete database structure
- `API_REFERENCE.md` - Supabase queries & cron logic
- `UX_MOCKUPS.md` - Screen designs & user flows

---

## 🎓 **Key Decisions Made**

**Why PWA instead of native apps?**
- ✅ Free (no App Store fees)
- ✅ Single codebase (iOS + Android)
- ✅ Instant updates (no app review)
- ✅ Works on desktop too
- ⚠️ iOS requires "Add to Home Screen" for push notifications

**Why Supabase instead of Firebase?**
- ✅ PostgreSQL (better for relational data)
- ✅ More generous free tier
- ✅ Built-in auth + RLS
- ✅ Real-time subscriptions
- ✅ Admin dashboard

**Why GitHub Actions instead of dedicated backend?**
- ✅ Completely free
- ✅ Built-in cron scheduling
- ✅ No infrastructure to manage
- ✅ Can migrate to dedicated backend later if needed

**Why no historical data storage?**
- ✅ Minimal database size
- ✅ Always fresh data from Yahoo Finance
- ✅ Flexible chart timeframes
- ✅ No data staleness issues
- ✅ Charts calculated on-demand in frontend

**Options pricing: Why use bid for wide spreads?**
- Conservative (actual sell price)
- Prevents false alerts on illiquid options
- 10% spread = wide (use bid)
- 5-10% spread = moderate (use mid, warn)
- <5% spread = tight (use mid)

---

## 🔄 **From Existing Project**

This app uses concepts from `schg_rotation` and `covered_calls` but:
- ❌ No Telegram (replaced with push notifications)
- ❌ No Python (cron in JavaScript/TypeScript)
- ❌ No hardcoded Mag 7 (user chooses any tickers)
- ❌ No GCP VM needed (GitHub Actions)
- ✅ Multi-user ready
- ✅ Mobile-first UI
- ✅ Cloud database
- ✅ Completely free

---

## 📞 **Support**

For questions or issues:
1. Check `IMPLEMENTATION.md` for setup steps
2. Check `ARCHITECTURE.md` for technical details
3. Check Supabase dashboard for data issues
4. Check GitHub Actions logs for cron issues

---

**Built with ❤️ for smarter position tracking**
