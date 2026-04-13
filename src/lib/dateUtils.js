/**
 * Date utility functions for consistent timezone handling
 */

/**
 * Parse a YYYY-MM-DD date string as local timezone (not UTC)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date} - Date object in local timezone at midnight
 */
export function parseLocalDate(dateString) {
  // Append time to force local timezone interpretation
  return new Date(dateString + 'T00:00:00');
}

/**
 * Format a date for display in user's local timezone
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
export function formatLocalDate(dateString) {
  return parseLocalDate(dateString).toLocaleDateString();
}

/**
 * Convert YYYY-MM-DD date string to Unix timestamp (seconds)
 * Treats the date as local timezone midnight
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {number} - Unix timestamp in seconds
 */
export function dateToUnixTimestamp(dateString) {
  return Math.floor(parseLocalDate(dateString).getTime() / 1000);
}

/**
 * Calculate optimal interval for Yahoo Finance API based on date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {string} - Interval string (1m, 15m, 60m, 1d)
 */
export function getOptimalInterval(startDate, endDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 1) {
    return '1m'; // Intraday - 1 minute intervals
  } else if (daysDiff <= 7) {
    return '15m'; // Recent week - 15 minute intervals
  } else if (daysDiff <= 15) {
    return '60m'; // 1-2 weeks - 1 hour intervals
  } else {
    return '1d'; // Historical - daily intervals
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} - Today's date
 */
export function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
