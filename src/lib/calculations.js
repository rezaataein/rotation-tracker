/**
 * Calculate relative performance (spread) between stock and benchmark over time
 *
 * @param {Object} stockData - Stock price data with timestamps and close prices
 * @param {Object} benchData - Benchmark price data with timestamps and close prices
 * @param {number} stockBaseline - Baseline stock price (entry price or first price in period)
 * @param {number} benchBaseline - Baseline benchmark price (entry price or first price in period)
 * @returns {Array} Array of {time, value} objects representing spread percentage over time
 */
export function calculateRelativePerformance(stockData, benchData, stockBaseline, benchBaseline) {
  const data = [];

  // Ensure both arrays have same length (use minimum)
  const minLength = Math.min(stockData.timestamps.length, benchData.timestamps.length);

  for (let i = 0; i < minLength; i++) {
    const timestamp = stockData.timestamps[i];
    const stockClose = stockData.close[i];
    const benchClose = benchData.close[i];

    // Skip invalid values (null, undefined, NaN)
    if (!isValidNumber(stockClose) || !isValidNumber(benchClose)) continue;

    // Calculate returns from baseline
    const stockReturn = ((stockClose - stockBaseline) / stockBaseline) * 100;
    const benchReturn = ((benchClose - benchBaseline) / benchBaseline) * 100;

    // Relative performance = stock return - benchmark return
    const spread = stockReturn - benchReturn;

    // Verify spread is valid before adding
    if (!isValidNumber(spread)) continue;

    data.push({
      time: timestamp,
      value: spread
    });
  }

  return data;
}

/**
 * Helper to validate number values in calculations
 */
function isValidNumber(value) {
  return value != null && !isNaN(value) && isFinite(value);
}
