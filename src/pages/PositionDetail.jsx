import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatLocalDate, parseLocalDate } from '../lib/dateUtils';
import RelativePerformanceChart from '../components/RelativePerformanceChart';
import PremiumDecayChart from '../components/PremiumDecayChart';
import './PositionDetail.css';

export default function PositionDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosition();
  }, [id]);

  const fetchPosition = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Position not found');
      } else {
        setPosition(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this position? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Navigate back to dashboard
      navigate('/');
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="position-detail">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading position...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="position-detail">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isStockRotation = position.type === 'stock_rotation';

  return (
    <div className="position-detail">
      <div className="position-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back
        </button>
        <h1>{position.ticker}</h1>
        <span className={`position-type-badge ${position.type}`}>
          {isStockRotation ? 'Stock Rotation' : 'Covered Call'}
        </span>
      </div>

      {isStockRotation ? (
        <StockRotationDetail position={position} />
      ) : (
        <CoveredCallDetail position={position} />
      )}

      <div className="position-actions">
        <button className="btn-secondary" onClick={() => alert('Edit not implemented yet')}>
          Edit
        </button>
        <button className="btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

function StockRotationDetail({ position }) {
  return (
    <div className="position-content">
      <section className="chart-section">
        <h2>Relative Performance</h2>
        <RelativePerformanceChart position={position} />
      </section>

      <div className="position-sidebar">
        <div className="metrics-card">
          <h3>Entry</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Date</span>
              <span className="value">{formatLocalDate(position.entry_date)}</span>
            </div>
            <div className="info-item">
              <span className="label">{position.ticker}</span>
              <span className="value">${position.entry_stock_price.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">{position.benchmark}</span>
              <span className="value">${position.entry_bench_price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="metrics-card">
          <h3>Target</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Outperformance</span>
              <span className="value">{(position.exit_threshold * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="metrics-card">
          <h3>Current</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{position.ticker}</span>
              <span className="value">—</span>
            </div>
            <div className="info-item">
              <span className="label">{position.benchmark}</span>
              <span className="value">—</span>
            </div>
            <div className="info-item">
              <span className="label">Spread</span>
              <span className="value">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoveredCallDetail({ position }) {
  const daysToExpiry = Math.ceil((parseLocalDate(position.expiration) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="position-content">
      <section className="chart-section">
        <h2>Premium Decay</h2>
        <PremiumDecayChart position={position} />
      </section>

      <div className="position-sidebar">
        <div className="metrics-card">
          <h3>Contract</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Strike</span>
              <span className="value">${position.strike.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">Expiration</span>
              <span className="value">{formatLocalDate(position.expiration)}</span>
            </div>
            <div className="info-item">
              <span className="label">Days Left</span>
              <span className="value">{daysToExpiry}</span>
            </div>
          </div>
        </div>

        <div className="metrics-card">
          <h3>Entry</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Date</span>
              <span className="value">{formatLocalDate(position.entry_date)}</span>
            </div>
            <div className="info-item">
              <span className="label">Premium</span>
              <span className="value">${position.entry_premium.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="metrics-card">
          <h3>Target</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Alert At</span>
              <span className="value">${position.alert_target.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="metrics-card">
          <h3>Current</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Mid Price</span>
              <span className="value">—</span>
            </div>
            <div className="info-item">
              <span className="label">Bid / Ask</span>
              <span className="value">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
