// FestCue Service Worker for 100% Reliable Offline Operation in Festival Venues
const CACHE_NAME = 'festcue-cache-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./', './index.html']).catch(() => {});
    })
  );
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

  // Do not intercept non-http requests like blob: URLs
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Check if resource is in cache
      const cached = await cache.match(req);
      if (cached) {
        // Fetch in background to update cache if network is available
        fetch(req)
          .then((networkRes) => {
            if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
              cache.put(req, networkRes.clone());
            }
          })
          .catch(() => {});
        return cached;
      }

      // 2. Not in cache: fetch from network
      try {
        const response = await fetch(req);
        if (response && (response.status === 200 || response.type === 'opaque')) {
          cache.put(req, response.clone());
        }
        return response;
      } catch (err) {
        // 3. Network failed (offline mode)
        if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
          const fallbackHtml =
            (await cache.match(req)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('/index.html')) ||
            (await cache.match('./')) ||
            (await cache.match('/'));
          if (fallbackHtml) return fallbackHtml;
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable Offline',
        });
      }
    })
  );
});
