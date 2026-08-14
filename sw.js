const CACHE_NAME = 'kopeyka-shell-v6';
const SHELL_FILES = ['./', './index.html', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
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
  // Supabase и внешние CDN (шрифты, Chart.js) не кэшируем и не перехватываем —
  // приложение само разруливает офлайн-режим через localStorage.
  if (url.hostname.includes('supabase.co')) return;
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Network-first для файлов оболочки, чтобы обновления кода всегда доходили сразу,
  // а кэш служил только резервом на случай отсутствия сети.
  event.respondWith(fetch(req).then(response => {
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
    }
    return response;
  }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html'))));
});
