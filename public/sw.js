const CACHE_NAME = 'heartsync-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Push Event — Show notification when push message is received
self.addEventListener('push', (event) => {
  let data = {
    title: 'HeartSync',
    body: 'Pengingat dari HeartSync.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'heartsync-reminder',
    data: {
      url: '/',
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: data.data,
    })
  );
});

// Notification Click — Focus or open the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch Event (Network-First / Cache Fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
            }
          })
          .catch(() => { /* ignore offline fetch error */ });
        return cachedResponse;
      }

      if (event.request.mode === 'navigate') {
        return fetch(event.request).catch(() => caches.match('/index.html'));
      }

      return fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});
