import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmDialog from '../components/ConfirmDialog';
import StrategyComparisonChart from '../components/StrategyComparisonChart';
import './StrategyDetail.css';

export default function StrategyDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetchStrategy();
  }, [id]);

  const fetchStrategy = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Strategy not found');
      } else {
        setStrategy(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Navigate back to scanner
      navigate('/scanner');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete strategy');
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ active: !strategy.active })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setStrategy({ ...strategy, active: !strategy.active });
    } catch (err) {
      setError(err.message || 'Failed to update strategy');
    }
  };

  const handleChartDataLoaded = (data) => {
    setChartData(data);
  };

  // Check if current spread meets entry threshold
  const meetsEntryThreshold = chartData?.spread != null &&
    chartData.spread <= (strategy.entry_threshold * 100);

  if (loading) {
    return (
      <div className="strategy-detail">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading strategy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-detail">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/scanner')} className="btn-primary">
            Back to Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="strategy-detail">
      {deleteError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{deleteError}</span>
          <button
            type="button"
            className="close-error-btn"
            onClick={() => setDeleteError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="strategy-header">
        <button onClick={() => navigate('/scanner')} className="back-btn">
          ← Back
        </button>
        <h1>{strategy.name}</h1>
        <span className={`status-badge ${strategy.active ? 'active' : 'inactive'}`}>
          {strategy.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="strategy-content">
        <section className="chart-section">
          <h2>Relative Performance - Last {strategy.lookback_days} Days</h2>
          <StrategyComparisonChart strategy={strategy} onDataLoaded={handleChartDataLoaded} />
        </section>

        <div className="metrics-row">
          <div className="metrics-card">
            <h3>Current Prices</h3>
            <div className="price-grid">
              <div className="price-item">
                <span className="label" style={{ color: '#2563eb' }}>{strategy.ticker}</span>
                <span className="value">
                  {chartData?.stockPrice ? `$${chartData.stockPrice.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="price-item">
                <span className="label" style={{ color: '#a855f7' }}>{strategy.benchmark}</span>
                <span className="value">
                  {chartData?.benchPrice ? `$${chartData.benchPrice.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="metrics-card">
            <h3>Spread ({strategy.lookback_days}d)</h3>
            <div className="spread-display">
              <span className={`spread-value ${meetsEntryThreshold ? 'buy-signal' : ''}`}>
                {chartData?.spread != null ? `${chartData.spread.toFixed(2)}%` : '—'}
              </span>
              {meetsEntryThreshold && (
                <span className="signal-badge">🎯 BUY SIGNAL</span>
              )}
            </div>
            <div className="threshold-info">
              Entry at {(Math.abs(strategy.entry_threshold) * 100).toFixed(1)}% underperformance
            </div>
          </div>
        </div>

        <div className="config-section">
          <h2>Configuration</h2>
          <div className="config-grid">
            <div className="config-item">
              <span className="label">Stock</span>
              <span className="value">{strategy.ticker}</span>
            </div>
            <div className="config-item">
              <span className="label">Benchmark</span>
              <span className="value">{strategy.benchmark}</span>
            </div>
            <div className="config-item">
              <span className="label">Lookback Period</span>
              <span className="value">{strategy.lookback_days} days</span>
            </div>
            <div className="config-item">
              <span className="label">Entry Threshold</span>
              <span className="value">{(Math.abs(strategy.entry_threshold) * 100).toFixed(1)}% underperformance</span>
            </div>
          </div>
        </div>

        {strategy.last_checked_at && (
          <div className="info-section">
            <h3>Last Checked</h3>
            <p>{new Date(strategy.last_checked_at).toLocaleString()}</p>
          </div>
        )}

        {strategy.last_signal_date && (
          <div className="info-section">
            <h3>Last Signal</h3>
            <p>{new Date(strategy.last_signal_date).toLocaleDateString()}</p>
          </div>
        )}

        <div className="info-note">
          <strong>How it works:</strong><br />
          Automated checks run 3 times daily during market hours (9:30am, 12:30pm, 3:30pm ET).
          You'll receive a BUY signal notification when {strategy.ticker} underperforms {strategy.benchmark} by {(Math.abs(strategy.entry_threshold) * 100).toFixed(1)}% over the past {strategy.lookback_days} days.
        </div>
      </div>

      <div className="strategy-actions">
        <button className="btn-secondary" onClick={handleToggleActive}>
          {strategy.active ? '⏸️ Pause' : '▶️ Activate'}
        </button>
        <button className="btn-secondary" onClick={() => alert('Edit not implemented yet')}>
          Edit
        </button>
        <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
          Delete
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Strategy?"
        message="This will permanently delete this strategy. This will not affect existing positions."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
