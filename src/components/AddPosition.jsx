import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { validateTickers } from '../lib/yahooFinance';
import './AddPosition.css';

export default function AddPosition({ user, onClose, onSave }) {
  const [type, setType] = useState('stock_rotation');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState({ field: null, message: null });
  const [systemError, setSystemError] = useState(null);

  // Refs for auto-focus on error
  const formRef = useRef(null);
  const tickerRef = useRef(null);
  const benchmarkRef = useRef(null);

  // Stock rotation fields
  const [ticker, setTicker] = useState('');
  const [benchmark, setBenchmark] = useState('');
  const [entryStockPrice, setEntryStockPrice] = useState('');
  const [entryBenchPrice, setEntryBenchPrice] = useState('');
  const [exitThreshold, setExitThreshold] = useState('0.06');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  // Covered call fields
  const [strike, setStrike] = useState('');
  const [expiration, setExpiration] = useState('');
  const [entryPremium, setEntryPremium] = useState('');
  const [alertTarget, setAlertTarget] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldError({ field: null, message: null });
    setSystemError(null);

    try {
      // Step 1: Validate ticker with Yahoo Finance
      const tickerToValidate = ticker.toUpperCase();
      const benchmarkToValidate = type === 'stock_rotation' ? benchmark.toUpperCase() : null;

      try {
        // Build list of symbols to validate
        const symbolsToValidate = [tickerToValidate];
        if (benchmarkToValidate) {
          symbolsToValidate.push(benchmarkToValidate);
        }

        // Validate all symbols at once
        const { valid, invalid } = await validateTickers(symbolsToValidate);

        // Check which symbols failed
        if (invalid.includes(tickerToValidate)) {
          const err = new Error(`Ticker "${tickerToValidate}" not found. Please verify the symbol is correct.`);
          err.field = 'ticker';
          throw err;
        }

        if (benchmarkToValidate && invalid.includes(benchmarkToValidate)) {
          const err = new Error(`Benchmark "${benchmarkToValidate}" not found. Please verify the symbol is correct.`);
          err.field = 'benchmark';
          throw err;
        }

      } catch (validationError) {
        setLoading(false);

        // Categorize error type
        if (validationError.field) {
          // Field-specific error (ticker or benchmark not found)
          setFieldError({
            field: validationError.field,
            message: validationError.message
          });

          // Auto-focus the problematic field
          if (validationError.field === 'ticker' && tickerRef.current) {
            tickerRef.current.focus();
          } else if (validationError.field === 'benchmark' && benchmarkRef.current) {
            benchmarkRef.current.focus();
          }
        } else {
          // System error (network, timeout, service issues)
          setSystemError(validationError.message);

          // Scroll modal to top to show banner
          if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        return;
      }

      // Step 2: Save to database (only if validation passed)
      const baseData = {
        user_id: user.id,
        type,
        ticker: tickerToValidate,
        status: 'open',
        entry_date: entryDate,
      };

      const positionData = type === 'stock_rotation'
        ? {
            ...baseData,
            benchmark: benchmarkToValidate,
            entry_stock_price: parseFloat(entryStockPrice),
            entry_bench_price: parseFloat(entryBenchPrice),
            exit_threshold: parseFloat(exitThreshold),
          }
        : {
            ...baseData,
            strike: parseFloat(strike),
            expiration,
            entry_premium: parseFloat(entryPremium),
            alert_target: parseFloat(alertTarget),
          };

      const { data, error } = await supabase
        .from('positions')
        .insert([positionData])
        .select();

      if (error) throw error;

      onSave(data[0]);
      onClose();
    } catch (err) {
      // Database/save errors - show as system error
      setSystemError(err.message || 'Failed to save position. Please try again.');
      setLoading(false);

      // Scroll to top to show error
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Position</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          {/* System error banner */}
          {systemError && (
            <div className="system-error-banner">
              <span className="error-icon">⚠️</span>
              <span>{systemError}</span>
              <button
                type="button"
                className="close-error-btn"
                onClick={() => setSystemError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Type Selector */}
          <div className="form-group">
            <label>Position Type</label>
            <div className="type-selector">
              <button
                type="button"
                className={type === 'stock_rotation' ? 'active' : ''}
                onClick={() => setType('stock_rotation')}
              >
                Stock Rotation
              </button>
              <button
                type="button"
                className={type === 'covered_call' ? 'active' : ''}
                onClick={() => setType('covered_call')}
              >
                Covered Call
              </button>
            </div>
          </div>

          {/* Common Fields */}
          <div className="form-group">
            <label htmlFor="ticker">Ticker *</label>
            <input
              ref={tickerRef}
              id="ticker"
              type="text"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value.toUpperCase());
                // Clear field error when user starts typing
                if (fieldError.field === 'ticker') {
                  setFieldError({ field: null, message: null });
                }
              }}
              placeholder="NVDA"
              pattern="[A-Z0-9.\-]{1,10}"
              title="Valid format: AAPL, BRK.A, HHIS.TO (letters, numbers, dots, hyphens)"
              className={fieldError.field === 'ticker' ? 'input-error' : ''}
              required
              disabled={loading}
            />
            {fieldError.field === 'ticker' && (
              <div className="field-error">{fieldError.message}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="entryDate">Entry Date *</label>
            <input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Stock Rotation Fields */}
          {type === 'stock_rotation' && (
            <>
              <div className="form-group">
                <label htmlFor="benchmark">Benchmark *</label>
                <input
                  ref={benchmarkRef}
                  id="benchmark"
                  type="text"
                  value={benchmark}
                  onChange={(e) => {
                    setBenchmark(e.target.value.toUpperCase());
                    // Clear field error when user starts typing
                    if (fieldError.field === 'benchmark') {
                      setFieldError({ field: null, message: null });
                    }
                  }}
                  placeholder="VGT"
                  pattern="[A-Z0-9.\-]{1,10}"
                  title="Valid format: VGT, SPY, QQQ (letters, numbers, dots, hyphens)"
                  className={fieldError.field === 'benchmark' ? 'input-error' : ''}
                  required
                  disabled={loading}
                />
                {fieldError.field === 'benchmark' && (
                  <div className="field-error">{fieldError.message}</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="entryStockPrice">Entry Stock Price *</label>
                  <input
                    id="entryStockPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryStockPrice}
                    onChange={(e) => setEntryStockPrice(e.target.value)}
                    placeholder="450.00"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="entryBenchPrice">Entry Bench Price *</label>
                  <input
                    id="entryBenchPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryBenchPrice}
                    onChange={(e) => setEntryBenchPrice(e.target.value)}
                    placeholder="320.00"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="exitThreshold">Exit Threshold (e.g., 0.06 for 6%) *</label>
                <input
                  id="exitThreshold"
                  type="number"
                  step="0.01"
                  value={exitThreshold}
                  onChange={(e) => setExitThreshold(e.target.value)}
                  placeholder="0.06"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Covered Call Fields */}
          {type === 'covered_call' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="strike">Strike Price *</label>
                  <input
                    id="strike"
                    type="number"
                    min="0"
                    step="0.01"
                    value={strike}
                    onChange={(e) => setStrike(e.target.value)}
                    placeholder="500.00"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expiration">Expiration Date *</label>
                  <input
                    id="expiration"
                    type="date"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="entryPremium">Premium Received *</label>
                  <input
                    id="entryPremium"
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryPremium}
                    onChange={(e) => setEntryPremium(e.target.value)}
                    placeholder="2.50"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="alertTarget">Alert Target Price *</label>
                  <input
                    id="alertTarget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={alertTarget}
                    onChange={(e) => setAlertTarget(e.target.value)}
                    placeholder="2.75"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
