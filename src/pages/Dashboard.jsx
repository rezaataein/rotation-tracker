import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import packageJson from '../../package.json';
import './Dashboard.css';

export default function Dashboard({ user, refreshKey }) {
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'stock_rotation', 'covered_call'

  useEffect(() => {
    fetchPositions();
  }, [refreshKey]); // Refetch when refreshKey changes

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPositions = positions.filter(position => {
    if (filter === 'all') return true;
    return position.type === filter;
  });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading positions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Positions</h1>
        <p className="user-email">{user.email}</p>
      </header>

      {positions.length === 0 ? (
        <div className="empty-state">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="empty-icon" />
          <h2>No Positions Yet</h2>
          <p>Start tracking your stock rotation strategies and covered calls</p>
          <p className="empty-hint">Tap the + button to add your first position</p>
        </div>
      ) : (
        <>
          <div className="filter-tabs">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={filter === 'stock_rotation' ? 'active' : ''}
              onClick={() => setFilter('stock_rotation')}
            >
              Stock Rotation
            </button>
            <button
              className={filter === 'covered_call' ? 'active' : ''}
              onClick={() => setFilter('covered_call')}
            >
              Covered Calls
            </button>
          </div>

          <div className="position-list">
            {filteredPositions.map(position => (
              <div
                key={position.id}
                className="position-card"
                onClick={() => navigate(`/position/${position.id}`)}
              >
                <div className="position-header">
                  <h3>{position.ticker}</h3>
                  <span className="position-type">
                    {position.type === 'stock_rotation' ? 'Stock Rotation' : 'Covered Call'}
                  </span>
                </div>
                <div className="position-body">
                  {position.type === 'stock_rotation' && (
                    <p>vs {position.benchmark}</p>
                  )}
                  {position.type === 'covered_call' && (
                    <p>${position.strike} - {position.expiration}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="dashboard-footer">
        v{packageJson.version} • Built {__BUILD_DATE__}
      </footer>
    </div>
  );
}
