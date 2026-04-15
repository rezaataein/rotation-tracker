// Service Worker for Rotation Tracker
// Handles push notifications and offline caching

const CACHE_NAME = 'rotation-tracker-v1';

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  // Workbox will inject manifest here: self.__WB_MANIFEST
  const manifest = self.__WB_MANIFEST || [];

  if (manifest.length > 0) {
    // Precache files from manifest
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Precaching', manifest.length, 'files');
        return cache.addAll(manifest.map(entry => entry.url));
      })
    );
  }

  self.skipWaiting(); // Activate immediately
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control immediately
});

// Push event - receive and display notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    // Use fallback notification data
    data = {
      title: 'Rotation Tracker',
      body: 'New notification',
      icon: '/rotation-tracker/icons/icon-192.png',
      badge: '/rotation-tracker/icons/icon-192.png',
      data: { url: '/rotation-tracker/' }
    };
  }

  const title = data.title || 'Rotation Tracker';
  const options = {
    body: data.body || 'New update available',
    icon: data.icon || '/rotation-tracker/icons/icon-192.png',
    badge: data.badge || '/rotation-tracker/icons/icon-192.png',
    tag: data.tag || 'default',
    data: data.data || { url: '/rotation-tracker/' },
    requireInteraction: true, // Keep notification visible
    vibrate: [200, 100, 200], // Vibration pattern
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification displayed'))
      .catch((error) => console.error('[SW] Error showing notification:', error))
  );
});

// Notification click - open app to relevant page
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/rotation-tracker/';
  const fullUrl = self.location.origin + urlToOpen;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If no clients are open, open a new window
      if (clientList.length === 0) {
        console.log('[SW] No clients open, opening new window');
        return clients.openWindow(fullUrl);
      }

      // Prefer visible clients (PWA or browser tab that's currently visible)
      let targetClient = clientList.find(client => client.visibilityState === 'visible');

      // If no visible client, use the first client (could be minimized PWA or background tab)
      if (!targetClient) {
        console.log('[SW] No visible client, using first available client');
        targetClient = clientList[0];
      } else {
        console.log('[SW] Found visible client, using it');
      }

      // Focus the client and navigate to the target URL
      return targetClient.focus().then(() => {
        console.log('[SW] Client focused, navigating to:', urlToOpen);
        return targetClient.navigate(fullUrl);
      });
    })
  );
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache on network failure
        return caches.match(event.request);
      })
  );
});
