import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  getCacheTicker,
  updateCacheTickers,
  getOldestCacheTimestamp,
  getOldestCacheTimestampForTickers,
  getFreshnessClass,
  formatCacheTime
} from '../lib/priceCache';
import { getCurrentPrice } from '../lib/priceUtils';
import './Scanner.css';
import './Dashboard.css'; // Reuse Dashboard styles for price displays

export default function Scanner({ user, refreshKey }) {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'paused'
  const [priceData, setPriceData] = useState({}); // { ticker: price }
  const [historicalData, setHistoricalData] = useState({}); // { 'ticker_lookback': historicalPrice }
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchStrategies();
  }, [refreshKey]); // Refetch when refreshKey changes (strategy added)

  useEffect(() => {
    if (strategies.length > 0) {
      fetchPrices();
    }
  }, [strategies]);

  const fetchStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('type', 'stock_rotation')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async (forceRefresh = false) => {
    // Prevent multiple simultaneous fetches
    if (pricesLoading && !forceRefresh) {
      return;
    }

    try {
      setPricesLoading(true);
      let didFetch = false; // Track if we fetched any data

      // Collect all unique tickers
      const allTickers = new Set();
      strategies.forEach(strategy => {
        allTickers.add(strategy.ticker);
        allTickers.add(strategy.benchmark);
      });

      const tickerList = Array.from(allTickers);

      if (tickerList.length === 0) {
        setPricesLoading(false);
        return;
      }

      // Prepare cache keys list for timestamp tracking (will be used multiple times)
      const allCacheKeys = [...tickerList]; // Current price tickers
      strategies.forEach(strategy => {
        allCacheKeys.push(`${strategy.ticker}_${strategy.lookback_days}`);
        allCacheKeys.push(`${strategy.benchmark}_${strategy.lookback_days}`);
      });

      // Set timestamp immediately from cache (prevents showing "never" during async fetch)
      // Do this ALWAYS, even on force refresh, because we're showing old cached data while fetching
      const cachedTimestamp = getOldestCacheTimestampForTickers(allCacheKeys);
      if (cachedTimestamp) {
        setLastUpdated(cachedTimestamp);
      }

      // Check cache for current prices
      const cachedPrices = {};
      const tickersToFetch = [];
      let useCache = !forceRefresh;

      tickerList.forEach(ticker => {
        if (useCache) {
          const cached = getCacheTicker(ticker);
          if (cached && cached.price) {
            cachedPrices[ticker] = cached.price;
          } else {
            tickersToFetch.push(ticker);
          }
        } else {
          tickersToFetch.push(ticker);
        }
      });

      // Fetch missing current prices
      let currentPrices = cachedPrices;

      if (tickersToFetch.length > 0) {

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data, error } = await supabase.functions.invoke('fetch-quotes', {
          body: {
            symbols: tickersToFetch,
            fetchPrices: true,
            startDate: yesterday,
            endDate: today,
            interval: '1d'
          }
        });

        if (error) throw error;

        const fetchedPrices = {};
        const results = data.quoteResponse?.result || [];
        results.forEach(result => {
          const price = getCurrentPrice(result.meta);
          if (price) {
            fetchedPrices[result.symbol] = price;
          }
        });


        // Update cache
        const cacheUpdate = {};
        Object.entries(fetchedPrices).forEach(([ticker, price]) => {
          cacheUpdate[ticker] = { price };
        });
        updateCacheTickers(cacheUpdate);
        didFetch = true;

        // Merge with cached
        currentPrices = { ...cachedPrices, ...fetchedPrices };
      }

      setPriceData(currentPrices);

      // Now fetch historical prices for spread calculation
      // First check cache for historical data
      const historicalPrices = {};
      const historicalToFetch = {}; // { lookback: Set(tickers) }

      strategies.forEach(strategy => {
        const stockKey = `${strategy.ticker}_${strategy.lookback_days}`;
        const benchKey = `${strategy.benchmark}_${strategy.lookback_days}`;

        if (!forceRefresh) {
          // Check cache for stock historical price
          const cachedStock = getCacheTicker(stockKey);
          if (cachedStock && cachedStock.historicalPrice) {
            historicalPrices[stockKey] = cachedStock.historicalPrice;
          } else {
            if (!historicalToFetch[strategy.lookback_days]) {
              historicalToFetch[strategy.lookback_days] = new Set();
            }
            historicalToFetch[strategy.lookback_days].add(strategy.ticker);
          }

          // Check cache for benchmark historical price
          const cachedBench = getCacheTicker(benchKey);
          if (cachedBench && cachedBench.historicalPrice) {
            historicalPrices[benchKey] = cachedBench.historicalPrice;
          } else {
            if (!historicalToFetch[strategy.lookback_days]) {
              historicalToFetch[strategy.lookback_days] = new Set();
            }
            historicalToFetch[strategy.lookback_days].add(strategy.benchmark);
          }
        } else {
          // Force refresh - fetch all
          if (!historicalToFetch[strategy.lookback_days]) {
            historicalToFetch[strategy.lookback_days] = new Set();
          }
          historicalToFetch[strategy.lookback_days].add(strategy.ticker);
          historicalToFetch[strategy.lookback_days].add(strategy.benchmark);
        }
      });

      // Fetch historical data for each lookback period (only what's not cached)
      for (const [lookback, tickers] of Object.entries(historicalToFetch)) {
        const tickerArray = Array.from(tickers);
        const historicalDate = new Date();
        historicalDate.setDate(historicalDate.getDate() - parseInt(lookback));
        const startDate = historicalDate.toISOString().split('T')[0];

        // Fetch a range to ensure we get data (markets might be closed on exact date)
        const endDate = new Date(historicalDate);
        endDate.setDate(endDate.getDate() + 5);
        const endDateStr = endDate.toISOString().split('T')[0];


        const { data, error } = await supabase.functions.invoke('fetch-quotes', {
          body: {
            symbols: tickerArray,
            fetchPrices: true,
            startDate: startDate,
            endDate: endDateStr,
            interval: '1d'
          }
        });

        if (error) {
          console.error('[SCANNER] Error fetching historical data:', error);
          continue;
        }

        // Extract the first valid price for each ticker
        // Store as ticker_lookback to handle same ticker with different lookbacks
        const results = data.quoteResponse?.result || [];
        const cacheUpdates = {};

        results.forEach(result => {
          if (result.close && result.close.length > 0 && result.timestamps && result.timestamps.length > 0) {
            // Find the first non-null close price
            const firstCloseIndex = result.close.findIndex(c => c != null);
            if (firstCloseIndex !== -1) {
              const key = `${result.symbol}_${lookback}`;
              const price = result.close[firstCloseIndex];
              historicalPrices[key] = price;
              cacheUpdates[key] = { historicalPrice: price };
            }
          }
        });

        // Update cache with historical prices
        if (Object.keys(cacheUpdates).length > 0) {
          updateCacheTickers(cacheUpdates);
          didFetch = true;
        }
      }

      setHistoricalData(historicalPrices);

      // Update timestamp at the end: NOW if we fetched anything, otherwise keep cached timestamp
      if (forceRefresh || didFetch) {
        setLastUpdated(Date.now());
      }
      // If all cached and not force refresh, timestamp was already set early in the function

    } catch (error) {
      console.error('[Scanner] Error fetching prices:', error);
    } finally {
      setPricesLoading(false);
    }
  };

  const handleRefreshPrices = () => {
    fetchPrices(true); // Force refresh
  };

  // Calculate current spread for strategy (over lookback period)
  const calculateSpread = (strategy) => {
    const currentStock = priceData[strategy.ticker];
    const currentBench = priceData[strategy.benchmark];
    // Use ticker_lookback key to get correct historical price
    const historicalStock = historicalData[`${strategy.ticker}_${strategy.lookback_days}`];
    const historicalBench = historicalData[`${strategy.benchmark}_${strategy.lookback_days}`];

    if (!currentStock || !currentBench || !historicalStock || !historicalBench) {
      return null;
    }

    // Calculate returns from historical to current
    const stockReturn = (currentStock - historicalStock) / historicalStock;
    const benchReturn = (currentBench - historicalBench) / historicalBench;

    // Spread = stock return - benchmark return
    return (stockReturn - benchReturn) * 100;
  };

  // Check if entry threshold hit (stock underperforming benchmark)
  const isEntrySignal = (strategy) => {
    const spread = calculateSpread(strategy);
    if (spread === null) return false;

    const entryThreshold = strategy.entry_threshold * 100;
    // Entry signal when spread <= threshold (more negative = more underperformance)
    return spread <= entryThreshold;
  };

  const filteredStrategies = strategies.filter(strategy => {
    // Status filter
    const statusMatch = statusFilter === 'all' ||
                       (statusFilter === 'active' && strategy.active) ||
                       (statusFilter === 'paused' && !strategy.active);

    return statusMatch;
  });

  if (loading) {
    return (
      <div className="scanner-loading">
        <div className="spinner"></div>
        <p>Loading strategies...</p>
      </div>
    );
  }

  return (
    <div className="scanner">
      <header className="scanner-header">
        <h1>Strategy Scanner</h1>
        <p className="user-email">{user.email}</p>
      </header>

      {/* Global Price Status Bar */}
      {strategies.length > 0 && (
        <div className="price-status-bar">
          <div className={`timestamp ${getFreshnessClass(lastUpdated)}`}>
            <span className="status-dot"></span>
            Last updated: {formatCacheTime(lastUpdated)}
          </div>
          <button
            className="refresh-button"
            onClick={handleRefreshPrices}
            disabled={pricesLoading}
          >
            {pricesLoading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      )}

      {strategies.length === 0 ? (
        <div className="empty-state">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="empty-icon" />
          <h2>No Strategies Yet</h2>
          <p>Create a strategy to get automatic BUY signals when entry thresholds are hit</p>
          <div className="info-box">
            <p><strong>How it works:</strong></p>
            <ol>
              <li>Create a strategy (e.g., NVDA vs VGT, 45 days, 12%)</li>
              <li>Automated checks run 3x daily during market hours</li>
              <li>Get BUY signal notification when threshold hits</li>
              <li>Manually create position with your exit threshold</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          {/* Status Filter */}
          <div className="filter-tabs">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={statusFilter === 'active' ? 'active' : ''}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={statusFilter === 'paused' ? 'active' : ''}
              onClick={() => setStatusFilter('paused')}
            >
              Paused
            </button>
          </div>

          <div className="strategy-list">
            {filteredStrategies.map(strategy => {
              const spread = calculateSpread(strategy);
              const entrySignal = isEntrySignal(strategy);
              const entryThreshold = (Math.abs(strategy.entry_threshold) * 100).toFixed(1);

              return (
                <div
                  key={strategy.id}
                  className={`strategy-card ${!strategy.active ? 'inactive' : ''}`}
                  onClick={() => navigate(`/strategy/${strategy.id}`)}
                >
                  <div className="strategy-header">
                    <h3>{strategy.name}</h3>
                  </div>

                  <div className="strategy-body">
                    {spread !== null ? (
                      <>
                        <p className="prices-label">
                          ${priceData[strategy.ticker]?.toFixed(2) || '—'} vs {strategy.benchmark} ${priceData[strategy.benchmark]?.toFixed(2) || '—'}
                        </p>
                        <div className="spread-display">
                          <span className="spread-label">Current Spread:</span>
                          <span className={`spread-value ${spread >= 0 ? 'positive' : 'negative'}`}>
                            {spread >= 0 ? '↑' : '↓'} {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                          </span>
                        </div>
                        <div className="target-display">
                          <span className="target-label">
                            {(() => {
                              const distanceToSignal = spread - (-entryThreshold);
                              const progressPercent = entrySignal ? 100 : Math.max(0, Math.min(100, ((entryThreshold - Math.abs(spread)) / entryThreshold) * 100));

                              if (entrySignal) {
                                return 'Entry Target: ✓ Hit!';
                              } else if (progressPercent >= 80) {
                                return `Almost There: ${Math.abs(distanceToSignal).toFixed(1)}% away`;
                              } else {
                                return `Entry Target: ${Math.abs(entryThreshold)}% under`;
                              }
                            })()}
                          </span>
                        </div>
                        <div className={`signal-badge ${entrySignal ? 'signal-active' : 'signal-inactive'}`}>
                          {entrySignal ? '🔔 ENTRY SIGNAL' : 'Not Yet'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="strategy-config">
                          <div className="config-item">
                            <span className="label">Stock:</span>
                            <span className="value">{strategy.ticker}</span>
                          </div>
                          <div className="config-item">
                            <span className="label">Benchmark:</span>
                            <span className="value">{strategy.benchmark}</span>
                          </div>
                          <div className="config-item">
                            <span className="label">Lookback:</span>
                            <span className="value">{strategy.lookback_days} days</span>
                          </div>
                          <div className="config-item">
                            <span className="label">Entry at:</span>
                            <span className="value">{entryThreshold}% underperformance</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
