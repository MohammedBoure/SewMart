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
  '/offline.html', // يمكن إزالتها إذا لم تكن ضرورية
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
  // تجاهل الطلبات غير المتعلقة بـ GET (مثل طلبات المزامنة)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // إذا لم يتم العثور على المورد في التخزين، قم بإرجاع index.html للتنقل
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      // إرجاع استجابة افتراضية للموارد غير الموجودة
      return new Response('المورد غير متاح في التخزين المؤقت', {
        status: 404,
        statusText: 'Not Found'
      });
    })
  );
});

