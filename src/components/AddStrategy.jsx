import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { validateTickers } from '../lib/yahooFinance';
import './AddPosition.css';

export default function AddStrategy({ user, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState({ field: null, message: null });
  const [systemError, setSystemError] = useState(null);

  // Refs for auto-focus on error
  const formRef = useRef(null);
  const tickerRef = useRef(null);
  const benchmarkRef = useRef(null);

  // Form fields
  const [ticker, setTicker] = useState('');
  const [benchmark, setBenchmark] = useState('');
  const [lookbackDays, setLookbackDays] = useState('45');
  const [entryThreshold, setEntryThreshold] = useState('12');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldError({ field: null, message: null });
    setSystemError(null);

    try {
      // Validate positive numbers
      const lookback = parseInt(lookbackDays);
      const threshold = parseFloat(entryThreshold);

      if (isNaN(lookback) || lookback <= 0) {
        setFieldError({ field: 'lookback', message: 'Lookback period must be a positive number' });
        setLoading(false);
        return;
      }

      if (isNaN(threshold) || threshold <= 0) {
        setFieldError({ field: 'threshold', message: 'Entry threshold must be a positive number' });
        setLoading(false);
        return;
      }

      // Validate tickers with Yahoo Finance
      const tickerToValidate = ticker.toUpperCase();
      const benchmarkToValidate = benchmark.toUpperCase();

      try {
        const { valid, invalid } = await validateTickers([tickerToValidate, benchmarkToValidate]);

        if (invalid.includes(tickerToValidate)) {
          const err = new Error(`Ticker "${tickerToValidate}" not found. Please verify the symbol is correct.`);
          err.field = 'ticker';
          throw err;
        }

        if (invalid.includes(benchmarkToValidate)) {
          const err = new Error(`Benchmark "${benchmarkToValidate}" not found. Please verify the symbol is correct.`);
          err.field = 'benchmark';
          throw err;
        }

      } catch (validationError) {
        setLoading(false);

        if (validationError.field) {
          setFieldError({
            field: validationError.field,
            message: validationError.message
          });

          if (validationError.field === 'ticker' && tickerRef.current) {
            tickerRef.current.focus();
          } else if (validationError.field === 'benchmark' && benchmarkRef.current) {
            benchmarkRef.current.focus();
          }
        } else {
          setSystemError(validationError.message);

          if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        return;
      }

      // Generate strategy name
      const strategyName = `${tickerToValidate} vs ${benchmarkToValidate} ${lookback}d ${threshold}%`;

      // Save to database
      const strategyData = {
        user_id: user.id,
        name: strategyName,
        type: 'stock_rotation',
        ticker: tickerToValidate,
        benchmark: benchmarkToValidate,
        lookback_days: lookback,
        entry_threshold: -threshold / 100,
        active: true
      };

      const { data, error } = await supabase
        .from('strategies')
        .insert([strategyData])
        .select()
        .single();

      if (error) throw error;

      onSave(data);
      onClose();

    } catch (error) {
      console.error('Error saving strategy:', error);
      setSystemError(error.message || 'Failed to save strategy');
      setLoading(false);

      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Strategy</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label htmlFor="ticker">Ticker *</label>
            <input
              ref={tickerRef}
              id="ticker"
              type="text"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value.toUpperCase());
                if (fieldError.field === 'ticker') {
                  setFieldError({ field: null, message: null });
                }
              }}
              placeholder="NVDA"
              className={fieldError.field === 'ticker' ? 'input-error' : ''}
              required
              disabled={loading}
            />
            {fieldError.field === 'ticker' && (
              <div className="field-error">{fieldError.message}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="benchmark">Benchmark *</label>
            <input
              ref={benchmarkRef}
              id="benchmark"
              type="text"
              value={benchmark}
              onChange={(e) => {
                setBenchmark(e.target.value.toUpperCase());
                if (fieldError.field === 'benchmark') {
                  setFieldError({ field: null, message: null });
                }
              }}
              placeholder="VGT"
              className={fieldError.field === 'benchmark' ? 'input-error' : ''}
              required
              disabled={loading}
            />
            {fieldError.field === 'benchmark' && (
              <div className="field-error">{fieldError.message}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lookbackDays">Lookback Period (days) *</label>
            <input
              id="lookbackDays"
              type="number"
              min="1"
              value={lookbackDays}
              onChange={(e) => {
                setLookbackDays(e.target.value);
                if (fieldError.field === 'lookback') {
                  setFieldError({ field: null, message: null });
                }
              }}
              placeholder="45"
              className={fieldError.field === 'lookback' ? 'input-error' : ''}
              required
              disabled={loading}
            />
            {fieldError.field === 'lookback' && (
              <div className="field-error">{fieldError.message}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="entryThreshold">Entry Threshold (% underperformance) *</label>
            <input
              id="entryThreshold"
              type="number"
              min="0.1"
              step="0.1"
              value={entryThreshold}
              onChange={(e) => {
                setEntryThreshold(e.target.value);
                if (fieldError.field === 'threshold') {
                  setFieldError({ field: null, message: null });
                }
              }}
              placeholder="12"
              className={fieldError.field === 'threshold' ? 'input-error' : ''}
              required
              disabled={loading}
            />
            {fieldError.field === 'threshold' && (
              <div className="field-error">{fieldError.message}</div>
            )}
            <div className="field-hint">
              Get BUY signal when {ticker || 'stock'} underperforms {benchmark || 'benchmark'} by this %
            </div>
          </div>

          <div className="info-note">
            <strong>📋 Preview:</strong><br />
            {ticker || 'STOCK'} vs {benchmark || 'BENCHMARK'} • {lookbackDays || '0'}d • {entryThreshold || '0'}% entry
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', opacity: 0.8 }}>
              Exit thresholds are set when you create a position from a BUY signal
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !ticker || !benchmark}>
              {loading ? 'Saving...' : 'Add Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
