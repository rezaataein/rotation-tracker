/**
 * Price Cache Utility
 * Uses sessionStorage for price caching with per-ticker TTL
 */

const CACHE_KEY = 'rotation_tracker_price_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached price for a ticker
 * @param {string} ticker - Ticker symbol (e.g., 'NVDA' or 'AAPL_180_2026-02-21' for options)
 * @returns {Object|null} - Cached data or null if not found/stale
 */
export function getCacheTicker(ticker) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    const data = cache[ticker];

    if (!data) return null;

    // Check if stale (>5 minutes old)
    const age = Date.now() - data.timestamp;
    if (age > CACHE_TTL_MS) {
      return null; // Stale
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Update cache for a single ticker
 * @param {string} ticker - Ticker symbol
 * @param {Object} data - Price data to cache
 */
export function updateCacheTicker(ticker, data) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');

    cache[ticker] = {
      ...data,
      timestamp: Date.now()
    };

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}

/**
 * Update cache for multiple tickers at once
 * @param {Object} tickersData - Object with ticker keys and data values
 * Example: { 'NVDA': { price: 850.23 }, 'VGT': { price: 525.10 } }
 */
export function updateCacheTickers(tickersData) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    const timestamp = Date.now();

    Object.entries(tickersData).forEach(([ticker, data]) => {
      cache[ticker] = {
        ...data,
        timestamp
      };
    });

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}

/**
 * Get the oldest timestamp from all cached tickers
 * @returns {number|null} - Oldest timestamp or null if cache is empty
 */
export function getOldestCacheTimestamp() {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    const timestamps = Object.values(cache).map(data => data.timestamp);

    if (timestamps.length === 0) return null;

    return Math.min(...timestamps);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Get the oldest timestamp from specific tickers only
 * @param {string[]} tickers - Array of ticker keys to check
 * @returns {number|null} - Oldest timestamp from specified tickers or null
 */
export function getOldestCacheTimestampForTickers(tickers) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    const timestamps = [];

    tickers.forEach(ticker => {
      if (cache[ticker] && cache[ticker].timestamp) {
        timestamps.push(cache[ticker].timestamp);
      }
    });

    if (timestamps.length === 0) return null;

    return Math.min(...timestamps);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Clear entire cache
 */
export function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get freshness class for timestamp display
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - CSS class ('fresh', 'recent', 'stale')
 */
export function getFreshnessClass(timestamp) {
  if (!timestamp) return 'stale';

  const age = Date.now() - timestamp;
  const minutes = age / (60 * 1000);

  if (minutes < 2) return 'fresh';      // Green
  if (minutes < 5) return 'recent';     // Yellow
  return 'stale';                       // Red
}

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Formatted time (e.g., "2:34 PM")
 */
export function formatCacheTime(timestamp) {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
