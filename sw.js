const CACHE_NAME = 'kopeyka-cache-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './fixes.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

async function injectFixes(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  const text = await response.text();
  if (text.includes('./fixes.js')) return new Response(text, {status:response.status,statusText:response.statusText,headers:response.headers});
  const patched = text.replace('</body>', '<script src="./fixes.js"></script>\n</body>');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(patched, {status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    let response = await caches.match(event.request);
    if (!response) {
      try { response = await fetch(event.request); }
      catch (_) { return response || Response.error(); }
    }
    if (event.request.mode === 'navigate') response = await injectFixes(response);
    if (response && response.status === 200) caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone())).catch(() => {});
    return response;
  })());
});
