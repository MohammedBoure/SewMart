const CACHE_NAME = 'sewmart-cache-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/products.html',
  '/sales.html',
  '/categories.html',
  '/reports.html',
  '/settings.html',
  '/manifest.json',
  '/offline.html',
  '/css/dashboard.css',
  '/css/sales.css',
  '/css/styles.css',
  '/js/config.js',
  '/js/reports.js',
  '/js/categories.js',
  '/js/products.js',
  '/js/sales.js',
  '/js/dashboard.js',
  '/js/script.js',
  '/js/settings.js',
  '/database/Database.js',
  '/database/ProductsDB.js',
  '/database/SalesDB.js',
  '/database/CategoriesDB.js',
  '/database/SettingsDB.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/libs/lucide/lucide.min.js',
  '/libs/sql.js/sql-wasm.js',
  '/libs/sql.js/sql-wasm.wasm',
  '/libs/tailwind.css',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SewMart SW] Caching app shell...');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SewMart SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    if (event.request.url.includes('/api/sync')) {
      event.respondWith(
        queueRequest(event.request).then(() => new Response('Request queued for sync'))
      );
    }
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          event.request.url.startsWith('chrome-extension://')
        ) {
          return networkResponse;
        }
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('غير متصل بالإنترنت', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// Queue POST requests for sync
async function queueRequest(request) {
  const db = await openIndexedDB();
  const data = await request.clone().json();
  db.put('syncQueue', { url: request.url, data, timestamp: Date.now() });
}

// Placeholder for IndexedDB (implement as needed)
async function openIndexedDB() {
  // Implement IndexedDB logic to store sync queue
  // Return a mock promise for now
  return {
    put: (store, data) => console.log('Queued:', data)
  };
}

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {
    title: 'SewMart',
    body: '📢 تحديث جديد متاح!'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/index.html')
  );
});