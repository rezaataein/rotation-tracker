import '../styles/DetailContent.css';

/**
 * Displays current prices for stock and benchmark
 */
export function CurrentPricesCard({ stockTicker, stockPrice, benchTicker, benchPrice, loading }) {
  return (
    <div className="metrics-card">
      <h3>Current Prices</h3>
      <div className="price-grid">
        <div className="price-item">
          <span className="label" style={{ color: '#2563eb' }}>{stockTicker}</span>
          <span className="value">
            {loading ? '...' : stockPrice != null ? `$${stockPrice.toFixed(2)}` : '—'}
          </span>
        </div>
        <div className="price-item">
          <span className="label" style={{ color: '#a855f7' }}>{benchTicker}</span>
          <span className="value">
            {loading ? '...' : benchPrice != null ? `$${benchPrice.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Displays spread value with threshold indicator
 * @param {boolean} compareGreaterThan - If true, signal when spread >= threshold. If false, signal when spread <= threshold
 */
export function SpreadCard({ spread, threshold, thresholdLabel, signalLabel, compareGreaterThan = true, loading }) {
  const meetsThreshold = spread != null &&
    (compareGreaterThan ? spread >= threshold : spread <= threshold);

  // For strategies (compareGreaterThan=false): negative spread = underperforming = good (favorable)
  // For positions (compareGreaterThan=true): positive spread = outperforming = good (favorable)
  const isFavorable = spread != null &&
    (compareGreaterThan ? spread > 0 : spread < 0);

  const getSpreadClass = () => {
    if (meetsThreshold) return 'buy-signal';
    if (isFavorable) return 'spread-favorable';
    return 'spread-unfavorable';
  };

  return (
    <div className="metrics-card">
      <h3>Spread</h3>
      <div className="spread-display">
        <span className={`spread-value ${getSpreadClass()}`}>
          {loading ? '...' : spread != null ? `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%` : '—'}
        </span>
        {meetsThreshold && (
          <span className="signal-badge">{signalLabel}</span>
        )}
      </div>
      <div className="threshold-info">
        {thresholdLabel}
      </div>
    </div>
  );
}

/**
 * Displays current option premium with alert threshold
 */
export function PremiumCard({ premium, threshold, stockPrice, bid, ask, loading }) {
  const atTarget = !loading && premium != null && premium <= threshold;

  return (
    <div className="metrics-card">
      <h3>Current Premium</h3>
      <div className="spread-display">
        <span className={`spread-value ${atTarget ? 'buy-signal' : ''}`}>
          {loading ? '...' : premium != null ? `$${premium.toFixed(2)}` : '—'}
        </span>
        {atTarget && (
          <span className="signal-badge">🎯 ALERT</span>
        )}
      </div>
      <div className="threshold-info">
        Alert at ${threshold.toFixed(2)}
      </div>
    </div>
  );
}

/**
 * Displays stock price and option bid/ask
 */
export function StockAndOptionCard({ stockPrice, bid, ask, loading }) {
  return (
    <div className="metrics-card">
      <h3>Stock & Option</h3>
      <div className="price-grid">
        <div className="price-item">
          <span className="label">Stock Price</span>
          <span className="value">
            {loading ? '...' : stockPrice != null ? `$${stockPrice.toFixed(2)}` : '—'}
          </span>
        </div>
        <div className="price-item">
          <span className="label">Bid / Ask</span>
          <span className="value">
            {loading ? '...' : (bid != null && ask != null) ?
              `$${bid.toFixed(2)} / $${ask.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
