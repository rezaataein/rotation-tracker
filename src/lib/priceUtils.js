/**
 * Price utility functions for handling Yahoo Finance data
 */

/**
 * Get the most current price from Yahoo Finance meta/quote object
 * Prioritizes extended hours prices over regular market price
 *
 * During market hours (9:30 AM - 4:00 PM ET): regularMarketPrice
 * Pre-market (4:00 AM - 9:30 AM ET): preMarketPrice
 * After-hours (4:00 PM - 8:00 PM ET): postMarketPrice
 *
 * @param {Object} data - Yahoo Finance meta or quote object
 * @returns {number|null} - Most current price available
 */
export function getCurrentPrice(data) {
  if (!data) return null;

  // Priority: postMarket > preMarket > regularMarket
  if (data.postMarketPrice != null) {
    return data.postMarketPrice;
  }

  if (data.preMarketPrice != null) {
    return data.preMarketPrice;
  }

  return data.regularMarketPrice || null;
}

/**
 * Get price session label for display (optional - for showing "Post-Market" badge)
 *
 * @param {Object} data - Yahoo Finance meta or quote object
 * @returns {string} - Session label ('Post', 'Pre', or '')
 */
export function getPriceSession(data) {
  if (!data) return '';

  if (data.postMarketPrice != null) {
    return 'Post';
  }

  if (data.preMarketPrice != null) {
    return 'Pre';
  }

  return '';
}
