const CACHE_NAME='kopeyka-cloud-v26';
function patch(html){
 html=html.replace(/<script src="\.\/fixes\.js\?v=[^"]+"><\/script>/g,'');
 html=html.replace(/<script src="\.\/cloud-loader\.js\?v=[^"]+"><\/script>/g,'');
 html=html.replace(/<script src="\.\/auth-cloud\.js\?v=[^"]+"><\/script>/g,'');
 html=html.replace(/<script src="\.\/finance-core\.js\?v=[^"]+"><\/script>/g,'');
 html=html.replace(/<script src="\.\/ui-finance-v4\.js\?v=[^"]+"><\/script>/g,'');
 html=html.replace(/<script src="\.\/ui-balance-fix\.js\?v=[^"]+"><\/script>/g,'');
 html=html.replace('</body>','<script src="./auth-cloud.js?v=7"></script><script src="./finance-core.js?v=6"></script><script src="./ui-finance-v4.js?v=4"></script><script src="./ui-balance-fix.js?v=4"></script></body>');
 return html;
}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.add('./')).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin===self.location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))){e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});return new Response(patch(await r.text()),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}catch(_){const c=await caches.match('./');return c?new Response(patch(await c.text()),{headers:{'Content-Type':'text/html;charset=utf-8'}}):Response.error()}})());return}e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});