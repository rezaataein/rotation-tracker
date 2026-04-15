import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

export default function Settings({ user }) {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      // Supabase auth listener in App.jsx will handle navigation
    } catch (error) {
      console.error('Error signing out:', error);
      setLoggingOut(false);
    }
  };

  const handleNotificationToggle = async () => {
    // Placeholder for Phase 4: Web Push Notifications
    // Will implement browser notification permission + subscription
    setNotificationsEnabled(!notificationsEnabled);

    // TODO: Implement web push subscription
    // if (!notificationsEnabled) {
    //   - Request notification permission
    //   - Subscribe to push notifications
    //   - Send subscription to backend
    // } else {
    //   - Unsubscribe from push notifications
    // }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        {/* User Profile Section */}
        <section className="settings-section">
          <h2>Profile</h2>
          <div className="setting-item">
            <div className="setting-label">Email</div>
            <div className="setting-value">{user.email}</div>
          </div>
          <div className="setting-item">
            <div className="setting-label">User ID</div>
            <div className="setting-value">{user.id}</div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="settings-section">
          <h2>Notifications</h2>
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Trading Signal Alerts</div>
              <div className="setting-description">
                Get notified when your strategies and positions need action
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
                disabled={true} // TODO: Enable in Phase 4
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {!notificationsEnabled && (
            <div className="info-note" style={{ marginTop: '1rem' }}>
              <strong>Coming Soon:</strong> Web push notifications for all trading signals. Get instant alerts when:
              <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
                <li>A strategy signals an entry opportunity (ticker underperforms)</li>
                <li>A stock position reaches exit threshold (time to swap back)</li>
                <li>A covered call premium drops to your buyback target</li>
              </ul>
            </div>
          )}
        </section>

        {/* Account Section */}
        <section className="settings-section">
          <h2>Account</h2>
          <button
            className="btn-danger logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </section>

        {/* About Section */}
        <section className="settings-section">
          <h2>About</h2>
          <div className="setting-item">
            <div className="setting-label">Version</div>
            <div className="setting-value">0.4.0</div>
          </div>
          <div className="about-description">
            <p>
              <strong>Rotation Tracker</strong> monitors stock rotation strategies and covered call positions.
              Get automated alerts for entry points, exit thresholds, and buyback opportunities—so you never miss a trade.
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.7 }}>
              Built with React, Supabase, and deployed on Vercel.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
