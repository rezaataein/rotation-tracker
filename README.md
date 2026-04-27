# Rotation Tracker - Position & Strategy Monitor

**A mobile-first Progressive Web App for tracking stock rotation strategies and options positions.**

🔗 **Live App:** [https://rezaataein.github.io/rotation-tracker/](https://rezaataein.github.io/rotation-tracker/)

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
- Frontend: React + Vite + PWA + TradingView Lightweight Charts
- Backend: Supabase (PostgreSQL + Auth + Real-time)
- Cron: GitHub Actions (scheduled checks 3-4x daily)
- Notifications: Web Push API
- Market Data: Yahoo Finance API
- Hosting: GitHub Pages / Vercel (free)

**Cost:** $0/month (all free tiers)

---

## 📋 **What This App Does**

### **1. Strategy Scanner**
User configures strategy to monitor entry signals:
```
Stock: NVDA
Benchmark: VGT
Lookback: 45 trading days
Entry Signal: -12% underperformance
```

App checks 3x daily (9am, 12pm, 3pm ET):
- If NVDA -12% vs VGT → Send entry signal push notification
- User manually creates position and sets exit threshold (e.g., +6%)
- Cron monitors position exit threshold
- When NVDA +6% vs VGT → Send swap signal push notification

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
- Entry signal → "NVDA ready to enter (underperforming VGT by 12%)"
- Swap signal → "NVDA ready to swap back (outperforming VGT by 6%)"
- Buyback alert → "ETHA call at buyback target ($2.75)"

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
│   PWA (React + Vite)        │
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

## ✅ **Current Implementation Status**

**Completed Features:**
- ✅ User authentication (email/password, signup/login)
- ✅ Add positions with real-time ticker validation (Yahoo Finance)
- ✅ Dashboard with position cards (drag-drop sorting, notes, urgency auto-sort)
- ✅ Filter positions (All / Stock Rotation / Covered Calls / Active / Paused)
- ✅ Bottom navigation (Scanner, Positions, Settings)
- ✅ PWA support (installable, offline-ready)
- ✅ Auto-deployment to GitHub Pages
- ✅ Versioning (package.json + build date)
- ✅ Position detail views with interactive TradingView charts
- ✅ Strategy scanner with strategy management (add/edit/delete/activate)
- ✅ Strategy detail view with performance charts and signal indicators
- ✅ Shared component architecture (DetailPageLayout, MetricCards)
- ✅ Professional confirmation dialogs (no browser alerts/confirms)
- ✅ Consistent refresh pattern across all list views
- ✅ Edit position/strategy functionality with chart refresh
- ✅ Settings page (user profile, notifications toggle, logout, about)
- ✅ GitHub Actions cron job (3x daily price updates + signals)
- ✅ Web push notifications (entry/swap/buyback signals)
- ✅ Lookback period correctly uses trading days (matches backtesting engine)
- ✅ Auto-sort reset button on Dashboard and Scanner

---

## 🚀 **Getting Started**

See `.dev/IMPLEMENTATION.md` for detailed step-by-step build instructions.

**Quick Start:**
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## 📚 **Documentation**

- `README.md` - This file (overview)
- `.dev/IMPLEMENTATION.md` - Step-by-step build guide (local only)
- `.dev/VERSIONING.md` - Versioning strategy (local only)
- `ARCHITECTURE.md` - Technical decisions & details
- `DATABASE_SCHEMA.md` - Complete database structure

---

## 🔢 **Versioning**

This project uses **semantic versioning**:
- MINOR bump (X.Y.0) for new features
- PATCH bump (X.Y.Z) for bug fixes
- Version displayed in Settings → About section
- Commit messages include version (e.g., "v1.1.0 - Add feature")

**Why:** Easy debugging, deployment tracking, user verification

Current version: **1.1.0**

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

**Why Vite instead of create-react-app?**
- ✅ 10x faster dev server
- ✅ Smaller production bundles
- ✅ Modern tooling (CRA is deprecated)
- ✅ Better developer experience

---

**Built with ❤️ for smarter position tracking**
