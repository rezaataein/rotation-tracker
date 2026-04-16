import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatLocalDate, parseLocalDate, timestampToUTCDateString } from '../lib/dateUtils';
import { fetchOptions } from '../lib/yahooFinance';
import RelativePerformanceChart from '../components/RelativePerformanceChart';
import PremiumDecayChart from '../components/PremiumDecayChart';
import ConfirmDialog from '../components/ConfirmDialog';
import EditPosition from '../components/EditPosition';
import DetailPageLayout from '../components/DetailPageLayout';
import { CurrentPricesCard, SpreadCard, PremiumCard, StockAndOptionCard } from '../components/MetricCards';
import '../styles/DetailContent.css';

export default function PositionDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Stock Rotation state
  const [currentPrices, setCurrentPrices] = useState(null);

  // Covered Call state
  const [optionData, setOptionData] = useState(null);
  const [loadingOption, setLoadingOption] = useState(true);

  useEffect(() => {
    fetchPosition();
  }, [id]);

  useEffect(() => {
    if (position && position.type === 'covered_call') {
      fetchOptionData();
    }
  }, [position?.id]);

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

  const fetchOptionData = async () => {
    try {
      setLoadingOption(true);

      // Pass expiration date to filter to only the options we need
      const data = await fetchOptions(position.ticker, position.expiration);

      const calls = data.calls || [];

      // Find the exact strike we're looking for (should be in the filtered results)
      const matchingCall = calls.find(call => call.strike === position.strike);

      console.log('Matching call:', matchingCall ? `Strike ${matchingCall.strike}, Bid ${matchingCall.bid}, Ask ${matchingCall.ask}` : 'Not found');

      setOptionData({
        stockPrice: data.quote?.regularMarketPrice,
        option: matchingCall
      });
    } catch (error) {
      console.error('Failed to fetch option data:', error);
    } finally {
      setLoadingOption(false);
    }
  };

  const handleDelete = async () => {
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
      setDeleteError(err.message || 'Failed to delete position');
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const { error } = await supabase
        .from('positions')
        .update({ active: !position.active })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setPosition({ ...position, active: !position.active });
    } catch (err) {
      setError(err.message || 'Failed to update position');
    }
  };

  const handleEditSave = (updatedPosition) => {
    // Update local state with edited position
    setPosition(updatedPosition);

    // Refresh option data if covered call
    if (updatedPosition.type === 'covered_call') {
      fetchOptionData();
    }
  };

  if (loading) {
    return (
      <DetailPageLayout
        title="Loading..."
        onBack={() => navigate('/')}
      >
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading position...</p>
        </div>
      </DetailPageLayout>
    );
  }

  if (error) {
    return (
      <DetailPageLayout
        title="Error"
        onBack={() => navigate('/')}
      >
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </DetailPageLayout>
    );
  }

  const isStockRotation = position.type === 'stock_rotation';

  // Callback for stock rotation chart
  const handlePricesLoaded = (stockPrice, benchPrice) => {
    setCurrentPrices({ stockPrice, benchPrice });
  };

  // Stock rotation calculations
  const currentSpread = currentPrices ?
    ((currentPrices.stockPrice - position.entry_stock_price) / position.entry_stock_price * 100) -
    ((currentPrices.benchPrice - position.entry_bench_price) / position.entry_bench_price * 100)
    : null;
  const targetSpread = isStockRotation ? position.exit_threshold * 100 : 0;

  // Covered call calculations
  const daysToExpiry = !isStockRotation ? Math.ceil((parseLocalDate(position.expiration) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const midPrice = optionData?.option ?
    parseFloat(((optionData.option.bid + optionData.option.ask) / 2).toFixed(2)) : null;

  return (
    <>
      <DetailPageLayout
        title={position.ticker}
        badge={
          <span className={`status-badge ${position.active ? 'active' : 'inactive'}`}>
            {position.active ? 'Active' : 'Paused'}
          </span>
        }
        onBack={() => navigate('/')}
        error={deleteError}
        onDismissError={() => setDeleteError(null)}
        actions={
          <>
            <button className="btn-secondary" onClick={handleToggleActive}>
              {position.active ? '⏸️ Pause' : '▶️ Activate'}
            </button>
            <button className="btn-secondary" onClick={() => setShowEditModal(true)}>
              Edit
            </button>
            <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </button>
          </>
        }
      >
        {isStockRotation ? (
          <>
            <section className="chart-section">
              <h2>Relative Performance</h2>
              <RelativePerformanceChart position={position} onPricesLoaded={handlePricesLoaded} />
            </section>

            <div className="metrics-row">
              <CurrentPricesCard
                stockTicker={position.ticker}
                stockPrice={currentPrices?.stockPrice}
                benchTicker={position.benchmark}
                benchPrice={currentPrices?.benchPrice}
                loading={!currentPrices}
              />
              <SpreadCard
                spread={currentSpread}
                threshold={targetSpread}
                thresholdLabel={`Exit at ${targetSpread.toFixed(1)}% outperformance`}
                signalLabel="✓ TARGET HIT"
                compareGreaterThan={true}
                loading={!currentPrices}
              />
            </div>

            <div className="config-section">
              <h2>Entry Details</h2>
              <div className="config-grid">
                <div className="config-item">
                  <span className="label">Date</span>
                  <span className="value">{formatLocalDate(position.entry_date)}</span>
                </div>
                <div className="config-item">
                  <span className="label">Exit Target</span>
                  <span className="value">{targetSpread.toFixed(1)}% spread</span>
                </div>
                <div className="config-item">
                  <span className="label">{position.ticker} Entry</span>
                  <span className="value">${position.entry_stock_price.toFixed(2)}</span>
                </div>
                <div className="config-item">
                  <span className="label">{position.benchmark} Entry</span>
                  <span className="value">${position.entry_bench_price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="info-note" style={{ backgroundColor: position.active ? '#e8f5e9' : '#f3f4f6', marginTop: '1.5rem' }}>
              <strong>How it works:</strong><br />
              {position.active ? (
                <>
                  ⏰ Automated checks run 3 times daily during market hours (9:30am, 12:30pm, 3:30pm ET).
                  You'll receive a SWAP alert when this position outperforms {position.benchmark} by {targetSpread.toFixed(1)}% (time to rotate back to benchmark).
                </>
              ) : (
                <>
                  ⏸️ Position paused - No automated checks running. Click Activate to resume monitoring for swap signals.
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <section className="chart-section">
              <h2>Premium Decay</h2>
              <PremiumDecayChart position={position} />
            </section>

            <div className="metrics-row">
              <PremiumCard
                premium={midPrice}
                threshold={position.alert_target}
                loading={loadingOption}
              />
              <StockAndOptionCard
                stockPrice={optionData?.stockPrice}
                bid={optionData?.option?.bid}
                ask={optionData?.option?.ask}
                loading={loadingOption}
              />
            </div>

            <div className="config-section">
              <h2>Contract Details</h2>
              <div className="config-grid">
                <div className="config-item">
                  <span className="label">Strike</span>
                  <span className="value">${position.strike.toFixed(2)}</span>
                </div>
                <div className="config-item">
                  <span className="label">Expiration</span>
                  <span className="value">{formatLocalDate(position.expiration)}</span>
                </div>
                <div className="config-item">
                  <span className="label">Days Left</span>
                  <span className="value">{daysToExpiry}</span>
                </div>
                <div className="config-item">
                  <span className="label">Open Interest</span>
                  <span className="value">
                    {loadingOption ? '...' : optionData?.option ?
                      optionData.option.openInterest.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="config-item">
                  <span className="label">Entry Date</span>
                  <span className="value">{formatLocalDate(position.entry_date)}</span>
                </div>
                <div className="config-item">
                  <span className="label">Entry Premium</span>
                  <span className="value">${position.entry_premium.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="info-note" style={{ backgroundColor: position.active ? '#e8f5e9' : '#f3f4f6', marginTop: '1.5rem' }}>
              <strong>How it works:</strong><br />
              {position.active ? (
                <>
                  ⏰ Automated checks run 3 times daily during market hours (9:30am, 12:30pm, 3:30pm ET).
                  You'll receive a BUYBACK alert when the option premium drops to ${position.alert_target.toFixed(2)} or below (early close opportunity).
                </>
              ) : (
                <>
                  ⏸️ Position paused - No automated checks running. Click Activate to resume monitoring for buyback alerts.
                </>
              )}
            </div>
          </>
        )}
      </DetailPageLayout>

      {showEditModal && (
        <EditPosition
          user={user}
          position={position}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Position?"
        message="This will permanently delete this position. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
