/**
 * Smart time formatting for chart axes and tooltips
 * Automatically detects data range and formats appropriately
 */

/**
 * Create a smart formatter that adapts based on data range
 * @param {Array} data - Chart data with time values
 * @returns {Function} Formatter function
 */
export function createSmartTimeFormatter(data) {
  if (!data || data.length === 0) {
    return (time) => new Date(time * 1000).toLocaleString();
  }

  // Check time span of data
  const firstTime = data[0].time;
  const lastTime = data[data.length - 1].time;
  const spanSeconds = lastTime - firstTime;
  const spanDays = spanSeconds / 86400;

  // Intraday (< 2 days): show time only
  if (spanDays < 2) {
    return (time) => {
      const date = new Date(time * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
  }

  // Multi-day with intraday intervals (2-60 days): show date + time
  if (spanDays < 60) {
    return (time) => {
      const date = new Date(time * 1000);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
  }

  // Long-term daily data (60+ days): show date only
  return (time) => {
    const date = new Date(time * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: spanDays > 365 ? 'numeric' : undefined
    });
  };
}

/**
 * Create a tick mark formatter (for x-axis labels)
 * More concise than tooltip formatter
 */
export function createSmartTickFormatter(data) {
  if (!data || data.length === 0) {
    return (time) => new Date(time * 1000).toLocaleDateString();
  }

  const firstTime = data[0].time;
  const lastTime = data[data.length - 1].time;
  const spanSeconds = lastTime - firstTime;
  const spanDays = spanSeconds / 86400;

  // Intraday: time only
  if (spanDays < 2) {
    return (time) => {
      const date = new Date(time * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
  }

  // Multi-day intraday: compact date + time
  if (spanDays < 60) {
    return (time) => {
      const date = new Date(time * 1000);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      const hour = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true
      });
      return `${month} ${day}, ${hour}`;
    };
  }

  // Long-term: date only
  return (time) => {
    const date = new Date(time * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: spanDays > 365 ? 'numeric' : undefined
    });
  };
}
