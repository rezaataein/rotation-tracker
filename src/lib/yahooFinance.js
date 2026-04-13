/**
 * Yahoo Finance API Helper
 * Uses Supabase Edge Function to fetch stock quotes
 */

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL;

/**
 * Fetch quotes for one or more symbols
 * @param {string[]} symbols - Array of ticker symbols (e.g., ["AAPL", "MSFT"])
 * @returns {Promise<Object>} - Yahoo Finance response
 */
export async function fetchQuotes(symbols) {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbols }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch quotes');
  }

  return await response.json();
}

/**
 * Validate if a ticker exists
 * @param {string} ticker - Single ticker symbol
 * @returns {Promise<boolean>} - True if ticker exists
 */
export async function validateTicker(ticker) {
  try {
    const data = await fetchQuotes([ticker]);
    const results = data.quoteResponse?.result || [];
    return results.length > 0 && results[0].symbol === ticker;
  } catch (error) {
    throw new Error(`Unable to validate ticker: ${error.message}`);
  }
}

/**
 * Validate multiple tickers at once
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<{valid: string[], invalid: string[]}>}
 */
export async function validateTickers(tickers) {
  try {
    const data = await fetchQuotes(tickers);
    const results = data.quoteResponse?.result || [];

    const foundSymbols = results.map(r => r.symbol);
    const valid = tickers.filter(t => foundSymbols.includes(t));
    const invalid = tickers.filter(t => !foundSymbols.includes(t));

    return { valid, invalid };
  } catch (error) {
    throw new Error(`Unable to validate tickers: ${error.message}`);
  }
}
