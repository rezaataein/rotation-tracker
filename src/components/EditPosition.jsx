import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getTodayString } from '../lib/dateUtils';
import './AddPosition.css';

export default function EditPosition({ user, position, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [systemError, setSystemError] = useState(null);

  // Refs for scrolling
  const formRef = useRef(null);

  // Pre-fill fields from existing position
  const type = position.type; // Read-only, can't change type

  // Stock rotation fields
  const [entryStockPrice, setEntryStockPrice] = useState(position.entry_stock_price?.toString() || '');
  const [entryBenchPrice, setEntryBenchPrice] = useState(position.entry_bench_price?.toString() || '');
  const [exitThreshold, setExitThreshold] = useState(
    position.exit_threshold ? (position.exit_threshold * 100).toString() : '6'
  );
  const [entryDate, setEntryDate] = useState(position.entry_date || new Date().toISOString().split('T')[0]);

  // Covered call fields
  const [strike, setStrike] = useState(position.strike?.toString() || '');
  const [expiration, setExpiration] = useState(position.expiration || '');
  const [entryPremium, setEntryPremium] = useState(position.entry_premium?.toString() || '');
  const [alertTarget, setAlertTarget] = useState(position.alert_target?.toString() || '');

  // Common fields
  const [notes, setNotes] = useState(position.notes || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSystemError(null);

    try {
      // Build update data based on position type
      const baseData = {
        entry_date: entryDate,
        notes: notes.trim() || null, // Store null if empty
      };

      const updateData = type === 'stock_rotation'
        ? {
            ...baseData,
            entry_stock_price: parseFloat(entryStockPrice),
            entry_bench_price: parseFloat(entryBenchPrice),
            exit_threshold: parseFloat(exitThreshold) / 100,
          }
        : {
            ...baseData,
            strike: parseFloat(strike),
            expiration,
            entry_premium: parseFloat(entryPremium),
            alert_target: parseFloat(alertTarget),
          };

      // Update the position in database
      const { data, error } = await supabase
        .from('positions')
        .update(updateData)
        .eq('id', position.id)
        .select();

      if (error) throw error;

      onSave(data[0]);
      onClose();
    } catch (err) {
      // Database/save errors - show as system error
      setSystemError(err.message || 'Failed to update position. Please try again.');
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
          <h2>Edit Position</h2>
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

          {/* Type Display (read-only) */}
          <div className="form-group">
            <label>Position Type</label>
            <input
              type="text"
              value={type === 'stock_rotation' ? 'Stock Rotation' : 'Covered Call'}
              disabled
              className="read-only-field"
            />
          </div>

          {/* Ticker Display (read-only) */}
          <div className="form-group">
            <label htmlFor="ticker">Ticker</label>
            <input
              id="ticker"
              type="text"
              value={position.ticker}
              disabled
              className="read-only-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="entryDate">Entry Date *</label>
            <input
              id="entryDate"
              type="date"
              value={entryDate}
              max={getTodayString()}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Stock Rotation Fields */}
          {type === 'stock_rotation' && (
            <>
              <div className="form-group">
                <label htmlFor="benchmark">Benchmark</label>
                <input
                  id="benchmark"
                  type="text"
                  value={position.benchmark}
                  disabled
                  className="read-only-field"
                />
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
                <label htmlFor="exitThreshold">Outperformance Target (%) *</label>
                <input
                  id="exitThreshold"
                  type="number"
                  min="0"
                  step="0.1"
                  value={exitThreshold}
                  onChange={(e) => setExitThreshold(e.target.value)}
                  placeholder="6"
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
                    min={getTodayString()}
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

          {/* Notes field (common to all types) */}
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

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Update Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
