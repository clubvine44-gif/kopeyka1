const CACHE_NAME='kopeyka-cache-v6';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./fixes.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok&&e.request.method==='GET'){caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())).catch(()=>{})}return r}catch(_){const cached=await caches.match(e.request);return cached||Response.error()}})())});
