const CACHE_NAME = 'yahia-family-pwa-v6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/icon.svg',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install: Cache all critical core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => {
          return cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn(`[PWA SW] Pre-cache warning for ${url}:`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`[PWA SW] Deleting obsolete cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// 1. Skip Realtime Firebase / Cloud API requests
// 2. For Navigation (HTML page requests), Network-first with fallback to cached index.html
// 3. For Static Assets, Stale-while-revalidate / Cache-first
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass dynamic cloud services & realtime websocket / APIs
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('gstatic.com/firebasejs')
  ) {
    return;
  }

  // 1. Navigation requests (Opening the app from Home screen / Shortcut / Browser tab)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
            return networkResponse;
          }
          // If server returned 404 or 500 on navigation, serve cached app shell
          return caches.match('/index.html')
            .then(cachedIndex => cachedIndex || caches.match('/') || networkResponse);
        })
        .catch(async () => {
          // Offline or Network Error -> Return App Shell
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          return new Response(
            `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>عائلة يحيي صبيح</title><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;}h1{font-size:1.5rem;margin-bottom:8px;}p{color:#94a3b8;font-size:1rem;}</style></head><body><div><h1>🏡 عائلة يحيي صبيح</h1><p>جاري إعادة الاتصال بالشبكة...</p><button onclick="window.location.reload()" style="margin-top:16px;padding:10px 20px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">إعادة المحاولة</button></div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Static Resources & Assets
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
