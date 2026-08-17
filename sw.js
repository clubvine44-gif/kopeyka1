/* Kopeyka Service Worker v41 — plain pass-through. */
const VERSION = 'kopeyka-v41';

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
  if (url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith((async () => {
      const response = await fetch(event.request, { cache: 'no-store' });
      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/html')) return response;
      const text = await response.text();
      const injected = text.includes('undo-menu.js') ? text : text.replace('</body>', '<script src="./undo-menu.js"></script>\n</body>');
      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      return new Response(injected, { status: response.status, statusText: response.statusText, headers });
    })());
    return;
  }
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});
