const CACHE_NAME = 'kopeyka-shell-v5';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './fixes.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co')) return;
  if (req.method !== 'GET') return;

  if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req, {cache:'no-store'});
        if (!response.ok) return response;
        const type = response.headers.get('content-type') || '';
        if (!type.includes('text/html')) return response;
        const text = await response.text();
        if (text.includes('fixes.js')) return new Response(text, {status: response.status, headers: response.headers});
        const injected = text.replace('</body>', '<script src="./fixes.js"></script>\n</body>');
        const headers = new Headers(response.headers);
        headers.set('content-type', 'text/html; charset=utf-8');
        return new Response(injected, {status: response.status, statusText: response.statusText, headers});
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith(fetch(req, {cache:'no-store'}).then(response => {
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
    }
    return response;
  }).catch(() => caches.match(req)));
});
