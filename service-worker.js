const CACHE_NAME = 'sewmart-cache-v3';

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
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching files:', urlsToCache);
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.error('[Service Worker] Cache failed:', err);
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
            console.log('[Service Worker] Deleting old cache:', cacheName);
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
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        console.log('[Service Worker] Serving from cache:', event.request.url);
        return cachedResponse;
      }
      // حاول جلب المورد من الشبكة
      return fetch(event.request).catch(error => {
        console.log('[Service Worker] Network failed:', error);
        // إرجاع offline.html للطلبات من نوع navigate
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        // إرجاع استجابة خطأ للموارد الأخرى
        return new Response('المورد غير متاح ولا يوجد اتصال بالشبكة', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});