import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchOptions } from '../lib/yahooFinance';
import { getCacheTicker, updateCacheTicker, updateCacheTickers, getOldestCacheTimestamp, getOldestCacheTimestampForTickers, getFreshnessClass, formatCacheTime } from '../lib/priceCache';
import { getCurrentPrice } from '../lib/priceUtils';
import './Dashboard.css';

export default function Dashboard({ user, refreshKey }) {
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'stock_rotation', 'covered_call'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'paused'
  const [priceData, setPriceData] = useState({}); // { ticker: price }
  const [optionData, setOptionData] = useState({}); // { ticker_strike_expiration: { bid, ask, mid, stockPrice } }
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPositions();
  }, [refreshKey]); // Refetch when refreshKey changes (also on mount)

  // Fetch prices when positions change
  useEffect(() => {
    if (positions.length > 0) {
      fetchPrices();
    }
  }, [positions]);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
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

      // Collect all unique tickers from stock rotation positions
      const tickers = new Set();
      positions.forEach(position => {
        if (position.type === 'stock_rotation') {
          tickers.add(position.ticker);
          tickers.add(position.benchmark);
        }
      });

      const tickersArray = Array.from(tickers);
      const tickersToFetch = [];
      const cachedPrices = {};

      // Prepare cache keys list for timestamp tracking
      const allCacheKeys = [...tickersArray]; // Stock tickers
      positions.forEach(position => {
        if (position.type === 'covered_call') {
          const optionKey = `${position.ticker}_${position.strike}_${position.expiration}`;
          allCacheKeys.push(optionKey);
        }
      });

      // Set timestamp immediately from cache (prevents showing "never" during async fetch)
      // Do this ALWAYS, even on force refresh, because we're showing old cached data while fetching
      const cachedTimestamp = getOldestCacheTimestampForTickers(allCacheKeys);
      if (cachedTimestamp) {
        setLastUpdated(cachedTimestamp);
      }

      // Check cache for each ticker
      if (!forceRefresh) {
        tickersArray.forEach(ticker => {
          const cached = getCacheTicker(ticker);
          if (cached && cached.price) {
            cachedPrices[ticker] = cached.price;
          } else {
            tickersToFetch.push(ticker);
          }
        });
      } else {
        tickersToFetch.push(...tickersArray);
      }

      // Fetch stale/missing tickers - use a 1-day range to get current prices
      let allPrices = cachedPrices;

      if (tickersToFetch.length === 0) {
        setPriceData(cachedPrices);
      } else {

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const { data, error } = await supabase.functions.invoke('fetch-quotes', {
          body: {
            symbols: tickersToFetch,
            fetchPrices: true,
            startDate: yesterday,
            endDate: today,
            interval: '1d'
          }
        });

        if (error) {
          console.error('[Dashboard] Edge function error:', error);
          throw new Error(error.message || 'Failed to fetch prices');
        }


        const results = data.quoteResponse?.result || [];

        // Extract prices and update cache
        const newPrices = {};
        const cacheUpdates = {};

        results.forEach(result => {
          const price = getCurrentPrice(result.meta);
          if (price) {
            newPrices[result.symbol] = price;
            cacheUpdates[result.symbol] = { price };
          }
        });


        // Update cache
        updateCacheTickers(cacheUpdates);
        didFetch = true;

        // Merge cached + new prices
        allPrices = { ...cachedPrices, ...newPrices };

        setPriceData(allPrices);
      }

      // --- COVERED CALLS: Fetch option data ---
      const coveredCalls = positions.filter(p => p.type === 'covered_call');

      // Early return only if no stocks AND no options to fetch
      if (tickersArray.length === 0 && coveredCalls.length === 0) {
        setPricesLoading(false);
        return;
      }

      if (coveredCalls.length > 0) {
        const optionsToFetch = [];
        const cachedOptions = {};

        coveredCalls.forEach(position => {
          const optionKey = `${position.ticker}_${position.strike}_${position.expiration}`;

          if (!forceRefresh) {
            const cached = getCacheTicker(optionKey);
            if (cached) {
              // Extract option data (remove timestamp if present)
              const { timestamp, ...optionInfo } = cached;
              cachedOptions[optionKey] = optionInfo;
            } else {
              optionsToFetch.push(position);
            }
          } else {
            optionsToFetch.push(position);
          }
        });

        // Fetch stale/missing options
        if (optionsToFetch.length > 0) {
          const optionFetchPromises = optionsToFetch.map(async (position) => {
            try {
              const data = await fetchOptions(position.ticker, position.expiration);
              const optionKey = `${position.ticker}_${position.strike}_${position.expiration}`;

              // Find the specific contract in the chain
              const calls = data.calls || [];
              const contract = calls.find(c => Math.abs(c.strike - position.strike) < 0.01);

              if (contract) {
                const optionInfo = {
                  bid: contract.bid || 0,
                  ask: contract.ask || 0,
                  mid: ((contract.bid || 0) + (contract.ask || 0)) / 2,
                  lastPrice: contract.lastPrice || 0,
                  stockPrice: getCurrentPrice(data.quote) || 0
                };


                // Update cache
                updateCacheTicker(optionKey, optionInfo);

                return { key: optionKey, data: optionInfo };
              } else {
                console.warn('[Dashboard] Contract not found for', optionKey);
                return null;
              }
            } catch (error) {
              console.error('[Dashboard] Error fetching option for', position.ticker, error);
              return null;
            }
          });

          const optionResults = await Promise.all(optionFetchPromises);
          const newOptions = {};

          optionResults.forEach(result => {
            if (result) {
              newOptions[result.key] = result.data;
            }
          });

          // Merge cached + new options
          const allOptions = { ...cachedOptions, ...newOptions };
          setOptionData(allOptions);
          didFetch = true;
        } else {
          // All cached
          setOptionData(cachedOptions);
        }
      } else {
        // No covered calls - clear option data
        setOptionData({});
      }

      // Update timestamp at the end: NOW if we fetched anything, otherwise keep cached timestamp
      if (forceRefresh || didFetch) {
        setLastUpdated(Date.now());
      }
      // If all cached and not force refresh, timestamp was already set early in the function

    } catch (error) {
      console.error('[Dashboard] Error fetching prices:', error);
    } finally {
      setPricesLoading(false);
    }
  };

  const handleRefreshPrices = () => {
    fetchPrices(true); // Force refresh
  };

  // Calculate current spread for stock rotation position
  const calculateSpread = (position) => {
    const stockPrice = priceData[position.ticker];
    const benchPrice = priceData[position.benchmark];

    if (!stockPrice || !benchPrice) return null;

    // Calculate returns from entry
    const stockReturn = (stockPrice - position.entry_stock_price) / position.entry_stock_price;
    const benchReturn = (benchPrice - position.entry_bench_price) / position.entry_bench_price;

    // Spread = stock return - benchmark return
    return (stockReturn - benchReturn) * 100;
  };

  // Check if exit threshold hit
  const isExitSignal = (position) => {
    const spread = calculateSpread(position);
    if (spread === null) return false;

    const exitThreshold = position.exit_threshold * 100;
    return spread >= exitThreshold;
  };

  // Get option data for covered call position
  const getOptionInfo = (position) => {
    const optionKey = `${position.ticker}_${position.strike}_${position.expiration}`;
    return optionData[optionKey] || null;
  };

  // Calculate premium change percentage
  const calculatePremiumChange = (position) => {
    const option = getOptionInfo(position);
    if (!option) return null;

    const currentPremium = option.mid || option.lastPrice;
    const entryPremium = position.entry_premium;

    if (!currentPremium || !entryPremium) return null;

    return ((currentPremium - entryPremium) / entryPremium) * 100;
  };

  // Check if buyback target hit
  const isBuybackSignal = (position) => {
    const option = getOptionInfo(position);
    if (!option) return false;

    const currentPremium = option.mid || option.lastPrice;
    return currentPremium <= position.alert_target;
  };

  const filteredPositions = positions.filter(position => {
    // Type filter
    const typeMatch = typeFilter === 'all' || position.type === typeFilter;

    // Status filter
    const statusMatch = statusFilter === 'all' ||
                       (statusFilter === 'active' && position.active) ||
                       (statusFilter === 'paused' && !position.active);

    return typeMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading positions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Positions</h1>
        <p className="user-email">{user.email}</p>
      </header>

      {positions.length === 0 ? (
        <div className="empty-state">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="empty-icon" />
          <h2>No Positions Yet</h2>
          <p>Start tracking your stock rotation strategies and covered calls</p>
          <p className="empty-hint">Tap the + button to add your first position</p>
        </div>
      ) : (
        <>
          {/* Price Status Bar - Above filters */}
          {positions.length > 0 && (
            <div className="price-status-bar">
              <span className={`timestamp ${getFreshnessClass(lastUpdated)}`}>
                <span className="status-dot"></span>
                Last updated at {formatCacheTime(lastUpdated)}
              </span>
              <button
                onClick={handleRefreshPrices}
                disabled={pricesLoading}
                className="refresh-button"
              >
                {pricesLoading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
          )}

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

          {/* Type Filter */}
          <div className="filter-tabs">
            <button
              className={typeFilter === 'all' ? 'active' : ''}
              onClick={() => setTypeFilter('all')}
            >
              All
            </button>
            <button
              className={typeFilter === 'stock_rotation' ? 'active' : ''}
              onClick={() => setTypeFilter('stock_rotation')}
            >
              Stock Rotation
            </button>
            <button
              className={typeFilter === 'covered_call' ? 'active' : ''}
              onClick={() => setTypeFilter('covered_call')}
            >
              Covered Calls
            </button>
          </div>

          <div className="position-list">
            {filteredPositions.map(position => {
              // Stock rotation data
              const spread = position.type === 'stock_rotation' ? calculateSpread(position) : null;
              const exitSignal = position.type === 'stock_rotation' ? isExitSignal(position) : false;
              const exitThreshold = position.type === 'stock_rotation' ? (position.exit_threshold * 100).toFixed(1) : null;

              // Covered call data
              const option = position.type === 'covered_call' ? getOptionInfo(position) : null;
              const premiumChange = position.type === 'covered_call' ? calculatePremiumChange(position) : null;
              const buybackSignal = position.type === 'covered_call' ? isBuybackSignal(position) : false;
              const currentPremium = option ? (option.mid || option.lastPrice) : null;

              return (
                <div
                  key={position.id}
                  className={`position-card ${!position.active ? 'inactive' : ''}`}
                  onClick={() => navigate(`/position/${position.id}`)}
                >
                  <div className="position-header">
                    <h3>{position.ticker}</h3>
                    <span className="position-type">
                      {position.type === 'stock_rotation' ? 'Stock Rotation' : 'Covered Call'}
                    </span>
                  </div>
                  <div className="position-body">
                    {/* STOCK ROTATION */}
                    {position.type === 'stock_rotation' && (
                      <>
                        {pricesLoading && spread === null ? (
                          <p className="spread-loading">Loading prices...</p>
                        ) : spread !== null ? (
                          <>
                            <p className="prices-label">
                              ${priceData[position.ticker]?.toFixed(2) || '—'} vs {position.benchmark} ${priceData[position.benchmark]?.toFixed(2) || '—'}
                            </p>
                            <div className="spread-display">
                              <span className="spread-label">Spread:</span>
                              <span className={`spread-value ${spread >= 0 ? 'positive' : 'negative'}`}>
                                {spread >= 0 ? '↑' : '↓'} {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                              </span>
                            </div>
                            <div className="target-display">
                              <span className="target-label">Exit Target:</span>
                              <span className="target-value">+{exitThreshold}%</span>
                            </div>
                            <div className={`signal-badge ${exitSignal ? 'signal-active' : 'signal-inactive'}`}>
                              {exitSignal ? '🔔 EXIT SIGNAL' : 'Not Yet'}
                            </div>
                          </>
                        ) : (
                          <p className="benchmark-label">vs {position.benchmark}</p>
                        )}
                      </>
                    )}

                    {/* COVERED CALL */}
                    {position.type === 'covered_call' && (
                      <>
                        {pricesLoading && !option ? (
                          <p className="spread-loading">Loading option data...</p>
                        ) : option && currentPremium !== null ? (
                          <>
                            {(() => {
                              const stockPrice = option.stockPrice || 0;
                              const strike = position.strike;
                              const percentToStrike = ((stockPrice - strike) / strike) * 100;
                              let priceWarning = '';
                              let priceWarningClass = '';

                              if (percentToStrike > 0) {
                                priceWarning = '⚠️ ITM - Assignment Risk';
                                priceWarningClass = 'stock-price-danger';
                              } else if (percentToStrike > -5) {
                                priceWarning = '⚡ Near Strike';
                                priceWarningClass = 'stock-price-warning';
                              } else {
                                priceWarning = '✓ Safe OTM';
                                priceWarningClass = 'stock-price-safe';
                              }

                              return (
                                <p className={`prices-label ${priceWarningClass}`}>
                                  Stock ${stockPrice.toFixed(2)} | ${strike} Call <span className="moneyness-badge">{priceWarning}</span>
                                </p>
                              );
                            })()}
                            <p className="expiration-label">
                              Exp {new Date(position.expiration).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                            </p>
                            <div className="premium-display">
                              <span className="premium-label">Cost to Close:</span>
                              <span className="premium-flow">
                                ${currentPremium.toFixed(2)}
                                {premiumChange !== null && (
                                  <span className={`premium-change ${premiumChange <= 0 ? 'positive' : 'negative'}`}>
                                    {' '}{premiumChange >= 0 ? '↑' : '↓'} {Math.abs(premiumChange).toFixed(0)}%
                                  </span>
                                )}
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.25rem' }}>
                                  (entry: ${position.entry_premium.toFixed(2)})
                                </span>
                              </span>
                            </div>
                            <div className="bid-ask-display">
                              Bid ${option.bid.toFixed(2)} / Ask ${option.ask.toFixed(2)}
                            </div>
                            <div className="target-display">
                              <span className="target-label">Target:</span>
                              <span className="target-value">${position.alert_target.toFixed(2)}</span>
                            </div>
                            <div className={`signal-badge ${buybackSignal ? 'signal-active' : 'signal-inactive'}`}>
                              {buybackSignal ? '🔔 BUYBACK SIGNAL' : 'Not Yet'}
                            </div>
                          </>
                        ) : (
                          <p className="option-details">${position.strike} Call - {position.expiration}</p>
                        )}
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
