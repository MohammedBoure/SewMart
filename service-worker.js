const CACHE_NAME = 'sewmart-cache-v1';

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

  // CSS
  '/css/dashboard.css',
  '/css/sales.css',
  '/css/styles.css',

  // JS
  '/js/config.js',
  '/js/reports.js',
  '/js/categories.js',
  '/js/products.js',
  '/js/sales.js',
  '/js/dashboard.js',
  '/js/script.js',
  '/js/settings.js',

  // Database
  '/database/Database.js',
  '/database/ProductsDB.js',
  '/database/SalesDB.js',
  '/database/CategoriesDB.js',
  '/database/SettingsDB.js',

  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',

  // Libs
  '/libs/lucide/lucide.min.js',
  '/libs/sql.js/sql-wasm.js',
  '/libs/sql.js/sql-wasm.wasm',
  '/libs/tailwind.css'
];

// ✅ تثبيت Service Worker وتخزين الملفات في الكاش
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SewMart SW] Caching app shell...');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // تفعيل الفورًا
});

// ✅ تنشيط SW وتنظيف الكاشات القديمة
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

// ✅ التعامل مع طلبات المستخدم (fetch)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // إذا الملف موجود في الكاش، نرجعه مباشرة
      if (cachedResponse) return cachedResponse;

      // إذا لم يكن في الكاش، نحاول تحميله من الشبكة
      return fetch(event.request).then(networkResponse => {
        // فقط نخزّن الملفات GET التي نجحت
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          event.request.url.startsWith('chrome-extension://')
        ) {
          return networkResponse;
        }

        // نخزن الملف الجديد في الكاش
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // إذا فشل التحميل والشبكة غير متاحة
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

// ✅ إشعارات الدفع (اختياري)
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

// ✅ عند الضغط على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/index.html')
  );
});