/**
 * Web Push Notifications Utility
 * Handles browser push subscription and permission requests
 */

import { supabase } from './supabase';

// VAPID public key (from environment variable)
// Set in .env as VITE_VAPID_PUBLIC_KEY
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission; // 'granted' or 'denied'
}

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 * Returns subscription object or null
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key is not configured. Check VITE_VAPID_PUBLIC_KEY in .env file.');
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    throw error;
  }
}

/**
 * Save subscription to Supabase
 */
export async function saveSubscriptionToDatabase(subscription, userId) {
  try {
    // Extract subscription details
    const subscriptionJson = subscription.toJSON();

    const subscriptionData = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth,
      user_agent: navigator.userAgent
    };

    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert([subscriptionData])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error saving subscription to database:', error);
    throw error;
  }
}

/**
 * Remove subscription from database
 */
export async function removeSubscriptionFromDatabase(endpoint) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error removing subscription from database:', error);
    throw error;
  }
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}
