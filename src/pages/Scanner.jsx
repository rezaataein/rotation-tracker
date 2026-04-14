import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Scanner.css';

export default function Scanner({ user, refreshKey }) {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, [refreshKey]); // Refetch when refreshKey changes (strategy added)

  const fetchStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('type', 'stock_rotation')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (e, strategyId, currentActive) => {
    e.stopPropagation(); // Prevent card click navigation

    try {
      const { error } = await supabase
        .from('strategies')
        .update({ active: !currentActive })
        .eq('id', strategyId);

      if (error) throw error;

      // Update local state
      setStrategies(strategies.map(s =>
        s.id === strategyId ? { ...s, active: !currentActive } : s
      ));
    } catch (error) {
      console.error('Error toggling strategy:', error);
    }
  };


  if (loading) {
    return (
      <div className="scanner-loading">
        <div className="spinner"></div>
        <p>Loading strategies...</p>
      </div>
    );
  }

  return (
    <div className="scanner">
      <header className="scanner-header">
        <h1>Strategy Scanner</h1>
        <p className="user-email">{user.email}</p>
      </header>

      {strategies.length === 0 ? (
        <div className="empty-state">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="empty-icon" />
          <h2>No Strategies Yet</h2>
          <p>Create a strategy to get automatic BUY signals when entry thresholds are hit</p>
          <div className="info-box">
            <p><strong>How it works:</strong></p>
            <ol>
              <li>Create a strategy (e.g., NVDA vs VGT, 45 days, 12%)</li>
              <li>Automated checks run 3x daily during market hours</li>
              <li>Get BUY signal notification when threshold hits</li>
              <li>Manually create position with your exit threshold</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          <div className="strategies-info">
            <p>
              {strategies.filter(s => s.active).length} active{' '}
              • Checks at 9:30am, 12:30pm, and 3:30pm ET
            </p>
          </div>

          <div className="strategy-list">
            {strategies.map(strategy => (
              <div
                key={strategy.id}
                className={`strategy-card ${!strategy.active ? 'inactive' : ''}`}
                onClick={() => navigate(`/strategy/${strategy.id}`)}
              >
                <div className="strategy-header">
                  <div className="strategy-title">
                    <h3>{strategy.name}</h3>
                    <span className={`status-badge ${strategy.active ? 'active' : 'inactive'}`}>
                      {strategy.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="strategy-body">
                  <div className="strategy-config">
                    <div className="config-item">
                      <span className="label">Stock:</span>
                      <span className="value">{strategy.ticker}</span>
                    </div>
                    <div className="config-item">
                      <span className="label">Benchmark:</span>
                      <span className="value">{strategy.benchmark}</span>
                    </div>
                    <div className="config-item">
                      <span className="label">Lookback:</span>
                      <span className="value">{strategy.lookback_days} days</span>
                    </div>
                    <div className="config-item">
                      <span className="label">Entry at:</span>
                      <span className="value">{(strategy.entry_threshold * 100).toFixed(1)}% underperformance</span>
                    </div>
                  </div>

                  {strategy.last_checked_at && (
                    <div className="strategy-meta">
                      <span className="last-checked">
                        Last checked: {new Date(strategy.last_checked_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {strategy.last_signal_date && (
                    <div className="last-signal">
                      ⚡ Last signal: {new Date(strategy.last_signal_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="strategy-actions">
                  <button
                    className={`toggle-button ${strategy.active ? 'active' : 'inactive'}`}
                    onClick={(e) => handleToggleActive(e, strategy.id, strategy.active)}
                  >
                    {strategy.active ? '⏸️ Pause' : '▶️ Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
