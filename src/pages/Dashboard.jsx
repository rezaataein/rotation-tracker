import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AddPosition from '../components/AddPosition';
import packageJson from '../../package.json';
import './Dashboard.css';

export default function Dashboard({ user }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'stock_rotation', 'covered_call'

  useEffect(() => {
    fetchPositions();
  }, []);

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

  const handleSavePosition = (newPosition) => {
    setPositions([newPosition, ...positions]);
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
          <button className="cta-button" onClick={() => setShowAddModal(true)}>
            Add Your First Position
          </button>
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
              <div key={position.id} className="position-card">
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

      <button className="fab" title="Add Position" onClick={() => setShowAddModal(true)}>
        +
      </button>

      {showAddModal && (
        <AddPosition
          user={user}
          onClose={() => setShowAddModal(false)}
          onSave={handleSavePosition}
        />
      )}

      <footer className="dashboard-footer">
        v{packageJson.version} • Built {__BUILD_DATE__}
      </footer>
    </div>
  );
}
