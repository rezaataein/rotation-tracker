#!/usr/bin/env python3
"""
Rotation Tracker - Position & Strategy Monitor
Automated monitoring for stock rotations and covered calls

Runs on GitHub Actions cron schedule (3x daily):
- Checks active strategies for entry signals (BUY alerts)
- Checks open positions for exit signals (SELL alerts)
- Updates current prices in database
- Saves option price snapshots for covered calls
- Sends push notifications when thresholds hit

Usage:
    python monitor.py              # Production mode
    python monitor.py --test       # Test mode (dry run, fake notifications)
"""

import os
import sys
import argparse
import json
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional
import yfinance as yf
from supabase import create_client, Client
from pywebpush import webpush, WebPushException


# ============================================================================
# CONFIGURATION
# ============================================================================

# Supabase connection (uses environment variables)
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')  # Service role key (bypasses RLS)

# VAPID keys for web push (uses environment variables)
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_CLAIMS_EMAIL = os.getenv('VAPID_CLAIMS_EMAIL')
VAPID_CLAIMS = {"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}  # Contact email for push service

# Notification types
NOTIFICATION_TYPES = {
    'BUY': 'Entry signal - ready to open position',
    'SELL': 'Exit signal - ready to close position',
    'OPTION_ALERT': 'Option price hit target',
    'INFO': 'General information'
}


# ============================================================================
# SUPABASE CLIENT
# ============================================================================

def get_supabase_client() -> Client:
    """Initialize Supabase client with service role key"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def validate_vapid_config():
    """Validate VAPID configuration for web push"""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY or not VAPID_CLAIMS_EMAIL:
        raise ValueError("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_CLAIMS_EMAIL must be set in environment")
    return True


# ============================================================================
# YAHOO FINANCE DATA FETCHING
# ============================================================================

def fetch_current_price(ticker: str) -> Optional[float]:
    """Fetch current/latest price for a ticker"""
    try:
        t = yf.Ticker(ticker)
        # Try current price (during market hours)
        price = t.info.get('regularMarketPrice')
        if price is None or price == 0:
            # Fallback to previous close
            price = t.info.get('previousClose')

        if price and price > 0:
            return float(price)

        print(f"⚠️  Warning: Could not fetch price for {ticker}")
        return None

    except Exception as e:
        print(f"❌ Error fetching price for {ticker}: {e}")
        return None


def fetch_historical_prices(ticker: str, lookback_days: int) -> Optional[Dict]:
    """Fetch historical prices for relative performance calculation"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=lookback_days + 10)  # Extra buffer

        t = yf.Ticker(ticker)
        hist = t.history(start=start_date, end=end_date)

        if hist.empty:
            print(f"⚠️  No historical data for {ticker}")
            return None

        return {
            'prices': hist['Close'].to_dict(),
            'latest': float(hist['Close'].iloc[-1]),
            'lookback': float(hist['Close'].iloc[-lookback_days]) if len(hist) >= lookback_days else None
        }

    except Exception as e:
        print(f"❌ Error fetching historical data for {ticker}: {e}")
        return None


def fetch_option_chain(ticker: str, expiration: date) -> Optional[Dict]:
    """Fetch option prices for a specific expiration"""
    try:
        t = yf.Ticker(ticker)

        # Get option chain for specific expiration
        exp_str = expiration.strftime('%Y-%m-%d')
        opts = t.option_chain(exp_str)

        return {
            'calls': opts.calls.to_dict('records'),
            'puts': opts.puts.to_dict('records'),
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        print(f"❌ Error fetching options for {ticker}: {e}")
        return None


def find_option_price(option_chain: Dict, strike: float, option_type: str = 'call') -> Optional[Dict]:
    """Find specific option contract price from chain"""
    try:
        contracts = option_chain['calls'] if option_type == 'call' else option_chain['puts']

        for contract in contracts:
            if abs(contract.get('strike', 0) - strike) < 0.01:  # Match strike
                return {
                    'bid': float(contract.get('bid', 0)),
                    'ask': float(contract.get('ask', 0)),
                    'last': float(contract.get('lastPrice', 0)),
                    'volume': int(contract.get('volume', 0)),
                    'openInterest': int(contract.get('openInterest', 0)),
                    'mid': (float(contract.get('bid', 0)) + float(contract.get('ask', 0))) / 2
                }

        print(f"⚠️  Option contract not found for strike ${strike}")
        return None

    except Exception as e:
        print(f"❌ Error parsing option chain: {e}")
        return None


# ============================================================================
# STRATEGY MONITORING (ENTRY SIGNALS)
# ============================================================================

def calculate_relative_performance(stock_price_now: float, stock_price_then: float,
                                   bench_price_now: float, bench_price_then: float) -> float:
    """Calculate stock outperformance vs benchmark"""
    stock_return = (stock_price_now - stock_price_then) / stock_price_then
    bench_return = (bench_price_now - bench_price_then) / bench_price_then
    return stock_return - bench_return


def check_strategy_signals(supabase: Client, test_mode: bool = False) -> List[Dict]:
    """Check all active strategies for entry signals"""
    print("\n" + "="*60)
    print("🔍 CHECKING STRATEGIES FOR ENTRY SIGNALS")
    print("="*60)

    # Fetch active strategies
    response = supabase.table('strategies').select('*').eq('active', True).execute()
    strategies = response.data

    if not strategies:
        print("No active strategies found")
        return []

    print(f"Found {len(strategies)} active strategy(s)")

    signals = []

    for strategy in strategies:
        strategy_id = strategy['id']
        user_id = strategy['user_id']
        name = strategy['name']
        ticker = strategy['ticker']
        benchmark = strategy['benchmark']
        lookback_days = strategy['lookback_days']
        entry_threshold = float(strategy['entry_threshold'])

        print(f"\n📊 {name}: {ticker} vs {benchmark} ({lookback_days}d, entry @ {entry_threshold*100:.1f}%)")

        # Fetch historical prices
        stock_data = fetch_historical_prices(ticker, lookback_days)
        bench_data = fetch_historical_prices(benchmark, lookback_days)

        if not stock_data or not bench_data:
            print(f"  ❌ Failed to fetch price data")
            continue

        if not stock_data['lookback'] or not bench_data['lookback']:
            print(f"  ⚠️  Insufficient historical data")
            continue

        # Calculate relative performance
        rel_perf = calculate_relative_performance(
            stock_data['latest'], stock_data['lookback'],
            bench_data['latest'], bench_data['lookback']
        )

        print(f"  Current: {ticker}=${stock_data['latest']:.2f}, {benchmark}=${bench_data['latest']:.2f}")
        print(f"  Relative performance: {rel_perf*100:+.2f}%")

        # Check if entry threshold hit (negative threshold = underperformance)
        if rel_perf <= -abs(entry_threshold):
            print(f"  🎯 ENTRY SIGNAL TRIGGERED! ({rel_perf*100:+.2f}% ≤ {-abs(entry_threshold)*100:.1f}%)")

            signal = {
                'type': 'BUY',
                'user_id': user_id,
                'strategy_id': strategy_id,
                'strategy_name': name,
                'ticker': ticker,
                'benchmark': benchmark,
                'relative_performance': rel_perf,
                'entry_threshold': entry_threshold,
                'stock_price': stock_data['latest'],
                'bench_price': bench_data['latest']
            }
            signals.append(signal)

            # Update strategy last_checked
            if not test_mode:
                supabase.table('strategies').update({
                    'last_checked_at': datetime.now().isoformat(),
                    'last_signal_date': date.today().isoformat()
                }).eq('id', strategy_id).execute()
        else:
            print(f"  ⏸️  No signal (need {-abs(entry_threshold)*100:.1f}% underperformance)")

            # Update strategy last_checked (no signal)
            if not test_mode:
                supabase.table('strategies').update({
                    'last_checked_at': datetime.now().isoformat()
                }).eq('id', strategy_id).execute()

    return signals


# ============================================================================
# POSITION MONITORING (EXIT SIGNALS)
# ============================================================================

def check_stock_rotation_positions(supabase: Client, test_mode: bool = False) -> List[Dict]:
    """Check stock rotation positions for exit signals"""
    print("\n" + "="*60)
    print("📈 CHECKING STOCK ROTATION POSITIONS")
    print("="*60)

    # Fetch open stock rotation positions
    response = supabase.table('positions').select('*').eq('status', 'open').eq('type', 'stock_rotation').execute()
    positions = response.data

    if not positions:
        print("No open stock rotation positions")
        return []

    print(f"Found {len(positions)} open position(s)")

    signals = []

    for pos in positions:
        position_id = pos['id']
        user_id = pos['user_id']
        ticker = pos['ticker']
        benchmark = pos['benchmark']
        entry_stock_price = float(pos['entry_stock_price'])
        entry_bench_price = float(pos['entry_bench_price'])
        exit_threshold = float(pos['exit_threshold'])
        entry_date = pos['entry_date']

        print(f"\n📊 {ticker} vs {benchmark} (entry {entry_date})")

        # Fetch current prices
        current_stock_price = fetch_current_price(ticker)
        current_bench_price = fetch_current_price(benchmark)

        if not current_stock_price or not current_bench_price:
            print(f"  ❌ Failed to fetch current prices")
            continue

        # Calculate current outperformance
        current_outperf = calculate_relative_performance(
            current_stock_price, entry_stock_price,
            current_bench_price, entry_bench_price
        )

        # Calculate days held
        entry_dt = datetime.strptime(entry_date, '%Y-%m-%d').date()
        days_held = (date.today() - entry_dt).days

        print(f"  Entry: {ticker}=${entry_stock_price:.2f}, {benchmark}=${entry_bench_price:.2f}")
        print(f"  Current: {ticker}=${current_stock_price:.2f}, {benchmark}=${current_bench_price:.2f}")
        print(f"  Outperformance: {current_outperf*100:+.2f}% (exit @ {exit_threshold*100:+.2f}%)")
        print(f"  Days held: {days_held}")

        # Update current prices in DB
        if not test_mode:
            supabase.table('positions').update({
                'current_stock_price': current_stock_price,
                'current_bench_price': current_bench_price,
                'current_outperformance': current_outperf,
                'days_held': days_held,
                'updated_at': datetime.now().isoformat()
            }).eq('id', position_id).execute()

        # Check if exit threshold hit
        if current_outperf >= exit_threshold:
            print(f"  🎯 EXIT SIGNAL TRIGGERED! ({current_outperf*100:+.2f}% ≥ {exit_threshold*100:+.2f}%)")

            signal = {
                'type': 'SELL',
                'user_id': user_id,
                'position_id': position_id,
                'ticker': ticker,
                'benchmark': benchmark,
                'current_outperformance': current_outperf,
                'exit_threshold': exit_threshold,
                'days_held': days_held,
                'stock_price': current_stock_price,
                'bench_price': current_bench_price
            }
            signals.append(signal)
        else:
            print(f"  ⏸️  No exit signal yet")

    return signals


def check_covered_call_positions(supabase: Client, test_mode: bool = False) -> List[Dict]:
    """Check covered call positions and save option price snapshots"""
    print("\n" + "="*60)
    print("📞 CHECKING COVERED CALL POSITIONS")
    print("="*60)

    # Fetch open covered call positions
    response = supabase.table('positions').select('*').eq('status', 'open').eq('type', 'covered_call').execute()
    positions = response.data

    if not positions:
        print("No open covered call positions")
        return []

    print(f"Found {len(positions)} open position(s)")

    signals = []

    for pos in positions:
        position_id = pos['id']
        user_id = pos['user_id']
        ticker = pos['ticker']
        strike = float(pos['strike'])
        expiration = datetime.strptime(pos['expiration'], '%Y-%m-%d').date()
        entry_premium = float(pos['entry_premium'])
        alert_target = float(pos.get('alert_target', 0)) if pos.get('alert_target') else None
        entry_date = pos['entry_date']

        print(f"\n📊 {ticker} ${strike} call exp {expiration}")

        # Check if expired
        if expiration < date.today():
            print(f"  ⚠️  EXPIRED - manual deletion required")
            continue

        # Fetch option chain
        option_chain = fetch_option_chain(ticker, expiration)

        if not option_chain:
            print(f"  ❌ Failed to fetch option chain")
            continue

        # Find specific contract
        option_price = find_option_price(option_chain, strike, 'call')

        if not option_price:
            print(f"  ❌ Contract not found in chain")
            continue

        bid = option_price['bid']
        ask = option_price['ask']
        mid = option_price['mid']
        last = option_price['last']

        # Calculate spread percentage
        spread_pct = ((ask - bid) / mid * 100) if mid > 0 else 0

        # Calculate P&L
        pnl = entry_premium - mid  # Premium collected - current mid price
        pnl_pct = (pnl / entry_premium * 100) if entry_premium > 0 else 0

        # Calculate days to expiration
        days_to_exp = (expiration - date.today()).days

        print(f"  Entry premium: ${entry_premium:.2f}")
        print(f"  Current: bid=${bid:.2f} ask=${ask:.2f} mid=${mid:.2f} last=${last:.2f}")
        print(f"  Spread: {spread_pct:.1f}%")
        print(f"  P&L: ${pnl:+.2f} ({pnl_pct:+.1f}%)")
        print(f"  Days to expiration: {days_to_exp}")

        # Save snapshot to option_price_snapshots table
        if not test_mode:
            snapshot = {
                'position_id': position_id,
                'timestamp': datetime.now().isoformat(),
                'bid': bid,
                'ask': ask,
                'last_price': last,
                'volume': option_price['volume'],
                'open_interest': option_price['openInterest']
            }
            supabase.table('option_price_snapshots').insert(snapshot).execute()
            print(f"  💾 Snapshot saved")

            # Update current prices in positions table
            supabase.table('positions').update({
                'current_bid': bid,
                'current_ask': ask,
                'current_mid': mid,
                'current_last': last,
                'spread_pct': spread_pct,
                'current_pnl': pnl,
                'current_pnl_pct': pnl_pct,
                'updated_at': datetime.now().isoformat()
            }).eq('id', position_id).execute()

        # Check alert target
        if alert_target and bid <= alert_target:
            print(f"  🎯 ALERT TARGET HIT! (bid ${bid:.2f} ≤ ${alert_target:.2f})")

            signal = {
                'type': 'OPTION_ALERT',
                'user_id': user_id,
                'position_id': position_id,
                'ticker': ticker,
                'strike': strike,
                'expiration': expiration.isoformat(),
                'bid': bid,
                'alert_target': alert_target,
                'pnl': pnl,
                'pnl_pct': pnl_pct,
                'days_to_exp': days_to_exp
            }
            signals.append(signal)
        else:
            print(f"  ⏸️  No alert (target: ${alert_target:.2f})" if alert_target else "  ⏸️  No alert target set")

    return signals


# ============================================================================
# NOTIFICATION SYSTEM
# ============================================================================

def send_notification(supabase: Client, signal: Dict, test_mode: bool = False):
    """Send push notification to user's subscribed devices"""
    signal_type = signal['type']
    user_id = signal['user_id']

    # Build notification content
    if signal_type == 'BUY':
        title = f"🟢 Entry Signal: {signal['ticker']}"
        body = f"{signal['ticker']} underperforming {signal['benchmark']} by {abs(signal['relative_performance']*100):.1f}% - Ready to enter position"
        tag = f"strategy-{signal['strategy_id']}"
        url = f"/scanner/{signal['strategy_id']}"

    elif signal_type == 'SELL':
        title = f"🔄 Swap Signal: {signal['ticker']}"
        body = f"{signal['ticker']} outperforming {signal['benchmark']} by {signal['current_outperformance']*100:+.1f}% - Ready to rotate back"
        tag = f"position-{signal['position_id']}"
        url = f"/position/{signal['position_id']}"

    elif signal_type == 'OPTION_ALERT':
        title = f"💰 Buyback Alert: {signal['ticker']}"
        body = f"${signal['strike']} call at ${signal['bid']:.2f} (P&L: {signal['pnl_pct']:+.1f}%) - {signal['days_to_exp']}d to exp"
        tag = f"position-{signal['position_id']}"
        url = f"/position/{signal['position_id']}"

    else:
        title = f"Info: {signal.get('ticker', 'Unknown')}"
        body = "General notification"
        tag = "general"
        url = "/"

    # Prepare notification payload
    notification_payload = {
        "title": title,
        "body": body,
        "icon": "/icon-192.png",
        "badge": "/badge-72.png",
        "tag": tag,
        "data": {
            "url": url,
            "signal": signal
        }
    }

    if test_mode:
        print(f"\n📱 FAKE NOTIFICATION:")
        print(f"   Title: {title}")
        print(f"   Body: {body}")
        print(f"   URL: {url}")
        print(f"   Data: {json.dumps(signal, indent=2, default=str)}")
        return

    # Validate VAPID configuration
    try:
        validate_vapid_config()
    except ValueError as e:
        print(f"\n❌ VAPID configuration error: {e}")
        return

    # Fetch user's push subscriptions
    try:
        response = supabase.table('push_subscriptions').select('*').eq('user_id', user_id).execute()
        subscriptions = response.data

        if not subscriptions:
            print(f"\n⚠️  No push subscriptions found for user {user_id}")
            return

        print(f"\n📱 SENDING NOTIFICATION to {len(subscriptions)} device(s)")
        print(f"   Title: {title}")
        print(f"   Body: {body}")

        # Send to each subscription
        sent_count = 0
        failed_count = 0

        for sub in subscriptions:
            try:
                # Send web push
                webpush(
                    subscription_info={
                        "endpoint": sub['endpoint'],
                        "keys": {
                            "p256dh": sub['p256dh'],
                            "auth": sub['auth']
                        }
                    },
                    data=json.dumps(notification_payload),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=VAPID_CLAIMS
                )
                sent_count += 1
                print(f"   ✅ Sent to device {sub['id'][:8]}...")

            except WebPushException as e:
                failed_count += 1
                print(f"   ❌ Failed to send to device {sub['id'][:8]}...: {e}")

                # Remove invalid subscription (expired/unsubscribed)
                if e.response and e.response.status_code in [404, 410]:
                    supabase.table('push_subscriptions').delete().eq('id', sub['id']).execute()
                    print(f"   🗑️  Removed invalid subscription")

        print(f"   📊 Sent: {sent_count}, Failed: {failed_count}")

        # Save notification to history
        try:
            supabase.table('notifications').insert({
                'user_id': user_id,
                'type': signal_type,
                'title': title,
                'body': body,
                'data': signal,
                'sent_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"   ⚠️  Failed to save notification history: {e}")

    except Exception as e:
        print(f"\n❌ ERROR sending notification: {e}")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main monitoring loop"""
    parser = argparse.ArgumentParser(description='Monitor positions and strategies')
    parser.add_argument('--test', action='store_true', help='Test mode (dry run, fake notifications)')
    args = parser.parse_args()

    test_mode = args.test

    print("="*60)
    print("🚀 ROTATION TRACKER MONITOR")
    print("="*60)
    print(f"Mode: {'TEST (dry run)' if test_mode else 'PRODUCTION'}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
    print("="*60)

    # Initialize Supabase
    try:
        supabase = get_supabase_client()
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Check strategies for entry signals
    strategy_signals = check_strategy_signals(supabase, test_mode)

    # Check stock rotation positions for exit signals
    stock_signals = check_stock_rotation_positions(supabase, test_mode)

    # Check covered call positions and save snapshots
    option_signals = check_covered_call_positions(supabase, test_mode)

    # Combine all signals
    all_signals = strategy_signals + stock_signals + option_signals

    # Send notifications
    if all_signals:
        print("\n" + "="*60)
        print(f"📬 SENDING {len(all_signals)} NOTIFICATION(S)")
        print("="*60)

        for signal in all_signals:
            send_notification(supabase, signal, test_mode)
    else:
        print("\n" + "="*60)
        print("✅ No signals triggered")
        print("="*60)

    print(f"\n✅ Monitor complete at {datetime.now().strftime('%I:%M:%S %p')}")
    print("="*60)


if __name__ == '__main__':
    main()
