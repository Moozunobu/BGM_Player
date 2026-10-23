// FestCue Service Worker for Offline Operation in Festival Venues
const CACHE_NAME = 'festcue-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Network-first with cache fallback, or cache-first for static assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(req)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(req, response.clone());
          }
          return response;
        })
        .catch(() => {
          return cache.match(req).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to cached index.html for SPA navigation requests
            if (req.mode === 'navigate') {
              return cache.match('./') || cache.match('/');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable Offline' });
          });
        });
    })
  );
});
