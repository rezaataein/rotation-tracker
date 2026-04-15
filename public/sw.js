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
  console.log('[SW] Push received:', event);

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
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
  );
});

// Notification click - open app to relevant page
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/rotation-tracker/';
  const fullUrl = self.location.origin + urlToOpen;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === fullUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if not already open
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
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
