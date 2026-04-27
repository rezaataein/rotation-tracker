import { useState, useEffect, useMemo } from 'react';
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
import { tradingDaysToCalendarDays } from '../lib/dateUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        const lookbackInt = parseInt(lookback);

        // lookback_days is TRADING days — fetch 2x calendar days as a safe buffer
        // (markets trade ~252/365 days, so 2x always covers the required trading days)
        const calendarBuffer = tradingDaysToCalendarDays(lookbackInt);
        const historicalDate = new Date();
        historicalDate.setDate(historicalDate.getDate() - calendarBuffer);
        const startDate = historicalDate.toISOString().split('T')[0];
        const endDateStr = new Date().toISOString().split('T')[0];

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

        // Extract the price exactly lookbackInt TRADING days ago
        // yfinance daily data only contains trading days, so index from the end
        const results = data.quoteResponse?.result || [];
        const cacheUpdates = {};

        results.forEach(result => {
          if (result.close && result.close.length > 0) {
            const validCloses = result.close.filter(c => c != null);
            if (validCloses.length >= lookbackInt) {
              const key = `${result.symbol}_${lookback}`;
              const price = validCloses[validCloses.length - lookbackInt];
              historicalPrices[key] = price;
              cacheUpdates[key] = { historicalPrice: price };
            } else {
              console.warn(`[SCANNER] Insufficient trading data for ${result.symbol}: got ${validCloses.length}, need ${lookbackInt}`);
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

  const handleResetSort = async () => {
    const ids = strategies.map(s => s.id);
    setStrategies(prev => prev.map(s => ({ ...s, sort_order: null })));
    try {
      await supabase.from('strategies').update({ sort_order: null }).in('id', ids);
    } catch (error) {
      console.error('Error resetting sort order:', error);
      fetchStrategies();
    }
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

  // Calculate urgency score for sorting (lower = more urgent)
  const calculateUrgency = (strategy) => {
    const spread = calculateSpread(strategy);
    if (spread === null) return Infinity; // No data = least urgent
    // More negative spread = more urgent (ascending), so return spread directly
    // Example: -15% spread < -5% spread, so -15% is more urgent
    return spread;
  };

  // Handle drag end - update sort_order in database
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedStrategies.findIndex(s => s.id === active.id);
    const newIndex = sortedStrategies.findIndex(s => s.id === over.id);

    // Reorder locally
    const reordered = arrayMove(sortedStrategies, oldIndex, newIndex);

    // Update sort_order for visible items (assign sequential numbers)
    const updates = reordered.map((strategy, index) => ({
      id: strategy.id,
      sort_order: index
    }));

    // Get IDs of visible items
    const visibleIds = new Set(reordered.map(s => s.id));

    // Optimistically update local strategies state
    setStrategies(prevStrategies => {
      return prevStrategies.map(strategy => {
        // If this strategy is in the visible/sorted list, update its sort_order
        const update = updates.find(u => u.id === strategy.id);
        if (update) {
          return { ...strategy, sort_order: update.sort_order };
        }
        // If NOT in visible list, clear sort_order to prevent duplicates
        // (hidden items will auto-sort by urgency when filters change)
        if (!visibleIds.has(strategy.id)) {
          return { ...strategy, sort_order: null };
        }
        // Otherwise keep as is
        return strategy;
      });
    });

    // Update database
    try {
      // Update visible items with new sort_order
      for (const update of updates) {
        await supabase
          .from('strategies')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      // Clear sort_order for hidden items to prevent duplicates
      const allIds = strategies.map(s => s.id);
      const hiddenIds = allIds.filter(id => !visibleIds.has(id));

      if (hiddenIds.length > 0) {
        await supabase
          .from('strategies')
          .update({ sort_order: null })
          .in('id', hiddenIds);
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
      // Revert on error
      fetchStrategies();
    }
  };

  const filteredStrategies = strategies.filter(strategy => {
    // Status filter
    const statusMatch = statusFilter === 'all' ||
                       (statusFilter === 'active' && strategy.active) ||
                       (statusFilter === 'paused' && !strategy.active);

    return statusMatch;
  });

  // Sort filtered strategies by manual order first, then by urgency
  const sortedStrategies = useMemo(() => {
    return [...filteredStrategies].sort((a, b) => {
      // 1. Manual sort_order takes precedence (if both have values)
      if (a.sort_order !== null && b.sort_order !== null) {
        return a.sort_order - b.sort_order;
      }
      if (a.sort_order !== null) return -1; // a goes first
      if (b.sort_order !== null) return 1;  // b goes first

      // 2. Sort by urgency (lower urgency value = more urgent = more negative spread)
      const urgencyA = calculateUrgency(a);
      const urgencyB = calculateUrgency(b);
      return urgencyA - urgencyB;
    });
  }, [filteredStrategies, priceData, historicalData]);

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

          {strategies.some(s => s.sort_order !== null) && (
            <div className="sort-reset-bar">
              <button className="sort-reset-button" onClick={handleResetSort}>
                ↺ Auto-sort
              </button>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedStrategies.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="strategy-list">
                {sortedStrategies.map(strategy => {
                  const spread = calculateSpread(strategy);
                  const entrySignal = isEntrySignal(strategy);
                  const entryThreshold = (Math.abs(strategy.entry_threshold) * 100).toFixed(1);

                  // Sortable card wrapper
                  const SortableCard = () => {
                    const {
                      attributes,
                      listeners,
                      setNodeRef,
                      transform,
                      transition,
                      isDragging
                    } = useSortable({ id: strategy.id });

                    const style = {
                      transform: CSS.Transform.toString(transform),
                      transition,
                      opacity: isDragging ? 0.5 : 1,
                    };

                    return (
                      <div
                        ref={setNodeRef}
                        style={style}
                        className={`strategy-card ${!strategy.active ? 'inactive' : ''}`}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="drag-handle"
                            {...attributes}
                            {...listeners}
                          >
                            ⋮⋮
                          </button>
                          <div
                            style={{ flex: 1, cursor: 'pointer' }}
                            onClick={() => navigate(`/strategy/${strategy.id}`)}
                          >
                            <div className="strategy-header">
                              <h3>{strategy.name}</h3>
                            </div>
                            {strategy.notes && (
                              <div className="strategy-notes">{strategy.notes}</div>
                            )}
                            <div className="strategy-body">
                              {spread !== null ? (
                                <>
                                  <p className="prices-label">
                                    ${priceData[strategy.ticker]?.toFixed(2) || '—'} vs {strategy.benchmark} ${priceData[strategy.benchmark]?.toFixed(2) || '—'}
                                  </p>
                                  <div className="spread-display">
                                    <span className="spread-label">Current Spread:</span>
                                    <span className={`spread-value ${spread <= 0 ? 'positive' : 'negative'}`}>
                                      {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                                    </span>
                                  </div>
                                  <div className="target-display">
                                    <span className="target-label">
                                      Entry Target: {entryThreshold}% underperformance
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
                                      <span className="value">{strategy.lookback_days} trading days</span>
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
                        </div>
                      </div>
                    );
                  };

                  return <SortableCard key={strategy.id} />;
                })}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
