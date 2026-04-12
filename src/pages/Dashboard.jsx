import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

export default function Dashboard({ user }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <img src="/icons/icon-192.png" alt="" className="empty-icon" />
          <h2>No Positions Yet</h2>
          <p>Start tracking your stock rotation strategies and covered calls</p>
          <button className="cta-button">Add Your First Position</button>
        </div>
      ) : (
        <div className="position-list">
          {positions.map(position => (
            <div key={position.id} className="position-card">
              <div className="position-header">
                <h3>{position.ticker}</h3>
                <span className="position-type">{position.type}</span>
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
      )}

      <button className="fab" title="Add Position">+</button>
    </div>
  );
}
