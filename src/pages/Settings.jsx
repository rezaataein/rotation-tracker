import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  isPushSupported,
  getPermissionStatus,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  saveSubscriptionToDatabase,
  removeSubscriptionFromDatabase,
  hasActiveSubscription
} from '../lib/pushNotifications';
import './Settings.css';

export default function Settings({ user }) {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationError, setNotificationError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, [user.id]);

  const checkSubscriptionStatus = async () => {
    try {
      setNotificationsLoading(true);

      // Check if push is supported
      if (!isPushSupported()) {
        setNotificationError('Push notifications are not supported in this browser');
        setNotificationsLoading(false);
        return;
      }

      // Check if user has active subscription in database
      const hasSubscription = await hasActiveSubscription(user.id);
      setNotificationsEnabled(hasSubscription);

    } catch (error) {
      console.error('Error checking subscription status:', error);
      setNotificationError('Failed to check notification status');
    } finally {
      setNotificationsLoading(false);
    }
  };

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
    if (notificationsLoading) return;

    setNotificationError(null);
    setNotificationsLoading(true);

    try {
      if (!notificationsEnabled) {
        // ENABLE notifications

        // Step 1: Request permission
        const permission = await requestNotificationPermission();

        if (permission !== 'granted') {
          setNotificationError('Notification permission denied. Please enable notifications in your browser settings.');
          setNotificationsLoading(false);
          return;
        }

        // Step 2: Subscribe to push
        const subscription = await subscribeToPush();

        // Step 3: Save to database
        await saveSubscriptionToDatabase(subscription, user.id);

        // Step 4: Update state
        setNotificationsEnabled(true);
        console.log('Push notifications enabled successfully');

      } else {
        // DISABLE notifications

        // Step 1: Unsubscribe from push
        await unsubscribeFromPush();

        // Step 2: Get current subscription to find endpoint
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          // Step 3: Remove from database
          await removeSubscriptionFromDatabase(subscription.endpoint);
        }

        // Step 4: Update state
        setNotificationsEnabled(false);
        console.log('Push notifications disabled successfully');
      }

    } catch (error) {
      console.error('Error toggling notifications:', error);
      setNotificationError(error.message || 'Failed to toggle notifications');
    } finally {
      setNotificationsLoading(false);
    }
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
                disabled={notificationsLoading || !isPushSupported()}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {notificationError && (
            <div className="info-note" style={{ marginTop: '1rem', backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}>
              <strong>Error:</strong> {notificationError}
            </div>
          )}

          {!notificationsEnabled && !notificationError && (
            <div className="info-note" style={{ marginTop: '1rem' }}>
              <strong>Enable push notifications</strong> to receive instant alerts when:
              <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
                <li>A strategy signals an entry opportunity (ticker underperforms)</li>
                <li>A stock position reaches exit threshold (time to swap back)</li>
                <li>A covered call premium drops to your buyback target</li>
              </ul>
            </div>
          )}

          {notificationsEnabled && !notificationError && (
            <div className="info-note" style={{ marginTop: '1rem', backgroundColor: '#d1fae5' }}>
              <strong>✓ Notifications enabled!</strong> You'll receive alerts 3x daily during market hours when signals are triggered.
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
            <div className="setting-value">0.5.1</div>
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
