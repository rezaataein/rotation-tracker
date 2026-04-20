import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './AddPosition.css';

export default function EditStrategy({ user, strategy, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState({ field: null, message: null });
  const [systemError, setSystemError] = useState(null);

  // Refs for scrolling
  const formRef = useRef(null);

  // Pre-fill fields from existing strategy
  const ticker = strategy.ticker; // Read-only
  const benchmark = strategy.benchmark; // Read-only
  const [lookbackDays, setLookbackDays] = useState(strategy.lookback_days.toString());
  const [entryThreshold, setEntryThreshold] = useState(
    Math.abs(strategy.entry_threshold * 100).toString()
  );
  const [notes, setNotes] = useState(strategy.notes || '');

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

      // Generate updated strategy name
      const strategyName = `${ticker} vs ${benchmark} ${lookback}d ${threshold}%`;

      // Update strategy in database
      const updateData = {
        name: strategyName,
        lookback_days: lookback,
        entry_threshold: -threshold / 100,
        notes: notes.trim() || null, // Store null if empty
      };

      const { data, error } = await supabase
        .from('strategies')
        .update(updateData)
        .eq('id', strategy.id)
        .select()
        .single();

      if (error) throw error;

      onSave(data);
      onClose();

    } catch (error) {
      console.error('Error updating strategy:', error);
      setSystemError(error.message || 'Failed to update strategy');
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
          <h2>Edit Strategy</h2>
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
            <label htmlFor="ticker">Ticker</label>
            <input
              id="ticker"
              type="text"
              value={ticker}
              disabled
              className="read-only-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="benchmark">Benchmark</label>
            <input
              id="benchmark"
              type="text"
              value={benchmark}
              disabled
              className="read-only-field"
            />
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
              Get BUY signal when {ticker} underperforms {benchmark} by this %
            </div>
          </div>

          {/* Notes field */}
          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Fidelity IRA, Main Account..."
              maxLength={100}
              rows={2}
              disabled={loading}
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
            <div className="char-count" style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {notes.length}/100 characters
            </div>
          </div>

          <div className="info-note">
            <strong>📋 Preview:</strong><br />
            {ticker} vs {benchmark} • {lookbackDays || '0'}d • {entryThreshold || '0'}% entry
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', opacity: 0.8 }}>
              Exit thresholds are set when you create a position from a BUY signal
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Update Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
