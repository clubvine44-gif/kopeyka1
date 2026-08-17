/* Kopeyka Service Worker v39 — single cloud module loader */
const VERSION = 'kopeyka-cloud-v39';
const CLOUD_SCRIPT = '<script src="auth-cloud.js?v=8" data-kopeyka-cloud="v8"></script>';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) client.navigate(client.url);
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(async response => {
        const type = response.headers.get('content-type') || '';
        if (!type.includes('text/html')) return response;
        const text = await response.text();
        if (text.includes('data-kopeyka-cloud="v8"') || text.includes('auth-cloud.js')) return new Response(text, {headers: response.headers, status: response.status, statusText: response.statusText});
        const injected = text.replace('</body>', CLOUD_SCRIPT + '\n</body>');
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        return new Response(injected, {headers, status: response.status, statusText: response.statusText});
      })
    );
    return;
  }

  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});
