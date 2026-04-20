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
  removeSubscriptionFromDatabase
} from '../lib/pushNotifications';
import packageInfo from '../../package.json';
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

      // Check if THIS BROWSER has an active subscription (not database!)
      // Each device/browser needs its own subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setNotificationsEnabled(!!subscription);

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

      } else {
        // DISABLE notifications

        // Step 1: Get current subscription to find endpoint (BEFORE unsubscribing!)
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          // Step 2: Remove from database FIRST
          await removeSubscriptionFromDatabase(subscription.endpoint);

          // Step 3: Unsubscribe from push (destroys the subscription)
          await unsubscribeFromPush();
        }

        // Step 4: Update state
        setNotificationsEnabled(false);
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
        </section>

        {/* Notifications Section */}
        <section className="settings-section">
          <h2>Notifications</h2>

          <div className="info-note" style={{ marginBottom: '1rem' }}>
            <strong>Automated Monitoring Schedule</strong>
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Your active strategies and positions are checked automatically <strong>3 times daily</strong> during market hours:
            </p>
            <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
              <li><strong>9:30 AM ET</strong> - Market open check</li>
              <li><strong>12:30 PM ET</strong> - Midday check</li>
              <li><strong>3:30 PM ET</strong> - Near market close check</li>
            </ul>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Push Notifications</div>
              <div className="setting-description">
                Receive instant alerts on this device when monitoring detects actionable signals
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
              <strong>What you'll be notified about:</strong>
              <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
                <li><strong>Strategy Entry Signals:</strong> When a stock underperforms its benchmark beyond your entry threshold (BUY opportunity)</li>
                <li><strong>Position Exit Signals:</strong> When a stock rotation position recovers to your exit threshold (time to swap back to benchmark)</li>
                <li><strong>Covered Call Buybacks:</strong> When an option premium decays to your alert target (buyback opportunity)</li>
              </ul>
              <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.875rem', opacity: 0.8 }}>
                💡 Note: Each device/browser needs its own notification subscription. Enable on all devices you want to receive alerts on.
              </p>
            </div>
          )}

          {notificationsEnabled && !notificationError && (
            <div className="info-note" style={{ marginTop: '1rem', backgroundColor: '#d1fae5', borderColor: '#86efac' }}>
              <strong>✓ Notifications enabled on this device!</strong>
              <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                You'll receive alerts during the 3 daily checks when your active strategies and positions trigger signals.
              </p>
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
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <img src="/rotation-tracker/icons/icon.svg" alt="Rotation Tracker" style={{ width: '96px', height: '96px', borderRadius: '20px' }} />
          </div>
          <div className="setting-item">
            <div className="setting-label">Version</div>
            <div className="setting-value">{packageInfo.version}</div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Build Date</div>
            <div className="setting-value">{__BUILD_DATE__}</div>
          </div>
          <div className="about-description">
            <p>
              <strong>Rotation Tracker</strong> monitors stock rotation strategies and covered call positions.
              Get automated alerts for entry points, exit thresholds, and buyback opportunities—so you never miss a trade.
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.7 }}>
              Built with React, Supabase, and deployed on GitHub Pages.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
