const CACHE_NAME='kopeyka-stable-v35';
const ASSET_VERSION='509823';

function patch(html){
  html=html.replace(/<script[^>]+src=["']\.\/fixes\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\.\/cloud-loader\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\.\/auth-cloud\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\.\/finance-core\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\.\/ui-finance-v4\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\.\/ui-balance-fix\.js[^>]*><\/script>/gi,'');
  const scripts='<script src="./auth-cloud.js?v='+ASSET_VERSION+'"></script><script src="./finance-core.js?v='+ASSET_VERSION+'"></script><script src="./ui-finance-v4.js?v='+ASSET_VERSION+'"></script><script src="./ui-balance-fix.js?v='+ASSET_VERSION+'"></script>';
  return html.replace('</body>',scripts+'</body>');
}

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.add('./'))
      .catch(()=>{})
      .finally(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin){
    event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r||Response.error())));
    return;
  }
  const isDocument=url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');
  if(isDocument){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        const html=await response.text();
        return new Response(patch(html),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
      }catch(_){
        const cached=await caches.match('./');
        return cached?new Response(patch(await cached.text()),{headers:{'Content-Type':'text/html;charset=utf-8'}}):Response.error();
      }
    })());
    return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request).then(r=>r||Response.error())));
});