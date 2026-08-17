const CACHE_NAME = 'kopeyka-clean-v37';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never rewrite HTML or inject scripts/styles here.
  // The application files in GitHub Pages are the single source of truth.
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => response)
      .catch(() => caches.match(event.request).then(cached => cached || Response.error()))
  );
});
