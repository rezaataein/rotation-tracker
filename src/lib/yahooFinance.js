/**
 * Yahoo Finance API Helper
 * Uses Supabase Edge Function to fetch stock quotes
 */

import { supabase } from './supabase';

/**
 * Fetch quotes for one or more symbols
 * @param {string[]} symbols - Array of ticker symbols (e.g., ["AAPL", "MSFT"])
 * @returns {Promise<Object>} - Yahoo Finance response
 */
export async function fetchQuotes(symbols) {
  // Use Supabase client to invoke Edge Function (handles JWT automatically)
  const { data, error } = await supabase.functions.invoke('fetch-quotes', {
    body: { symbols }
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new Error(error.message || 'Failed to fetch quotes');
  }

  return data;
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

    // Edge Function now returns pre-computed valid/invalid arrays
    return {
      valid: data.valid || [],
      invalid: data.invalid || []
    };
  } catch (error) {
    throw new Error(`Unable to validate tickers: ${error.message}`);
  }
}
