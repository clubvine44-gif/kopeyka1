const CACHE_NAME='kopeyka-stable-v36';
const ASSET_VERSION='509823';

function patch(html){
  html=html.replace(/<script[^>]+src=["']\\.\\/fixes\\.js[^>]*><\\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\\.\\/cloud-loader\\.js[^>]*><\\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\\.\\/auth-cloud\\.js[^>]*><\\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\\.\\/finance-core\\.js[^>]*><\\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\\.\\/ui-finance-v4\\.js[^>]*><\\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["']\\.\\/ui-balance-fix\\.js[^>]*><\\/script>/gi,'');

  const polish=`<style id="kopeyka-mobile-polish">
:root{--nav-h:66px}
@media(max-width:899px){
  #main{padding-bottom:calc(var(--nav-h) + 82px + var(--safe-bottom));}
  .bottomnav{height:var(--nav-h);min-height:var(--nav-h);padding:5px 5px calc(5px + var(--safe-bottom));gap:0;}
  .navbtn{min-width:0;height:56px;padding:5px 7px;justify-content:center;gap:2px;}
  .navbtn svg{width:21px;height:21px;}
  .navbtn span{line-height:1.1;white-space:nowrap;}
  .fab{bottom:calc(var(--nav-h) + 14px + var(--safe-bottom));right:16px;width:54px;height:54px;}
  .toast{bottom:calc(var(--nav-h) + 14px + var(--safe-bottom));max-width:calc(100vw - 32px);}
  .topbar{min-height:58px;padding:10px 16px 8px;}
  .topbar .icon-btn{width:42px;height:42px;}
  .modal{max-height:calc(100dvh - 12px);padding-bottom:calc(22px + var(--safe-bottom));}
}
@media(min-width:900px){.bottomnav{height:100vh}.fab{bottom:32px}}
#kc-account{top:9px!important;right:14px!important;}
#kc-account-btn{width:42px!important;height:42px!important;padding:0!important;border-radius:50%!important;justify-content:center!important;gap:0!important;}
#kc-email-label{display:none!important;}
#kc-dot{width:24px!important;height:24px!important;border-radius:50%!important;position:relative!important;}
#kc-dot:after{content:'●';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--bg);}
#kc-account-menu{top:50px!important;right:0!important;}
</style>`;
  html=html.replace('</head>',polish+'</head>');
  const scripts='<script src="./auth-cloud.js?v='+ASSET_VERSION+'"></script><script src="./finance-core.js?v='+ASSET_VERSION+'"></script><script src="./ui-finance-v4.js?v='+ASSET_VERSION+'"></script><script src="./ui-balance-fix.js?v='+ASSET_VERSION+'"></script>';
  return html.replace('</body>',scripts+'</body>');
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.add('./')).catch(()=>{}).finally(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin){event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r||Response.error())));return;}
  const isDocument=url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');
  if(isDocument){
    event.respondWith((async()=>{
      try{const response=await fetch(event.request,{cache:'no-store'});const html=await response.text();return new Response(patch(html),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}
      catch(_){const cached=await caches.match('./');return cached?new Response(patch(await cached.text()),{headers:{'Content-Type':'text/html;charset=utf-8'}}):Response.error()}
    })());return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request).then(r=>r||Response.error())));
});