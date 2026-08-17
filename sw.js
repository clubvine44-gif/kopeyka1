const CACHE_NAME='kopeyka-cloud-v20';
function patch(html){
 html=html.replace(/function shiftIncomeAmount\(shift\)\s*\{[\s\S]*?\n\}/m,'function shiftIncomeAmount(shift){ return 0; }');
 const scripts='<script src="./fixes.js?v=7"></script><script src="./finance-core.js?v=3"></script><script src="./ui-finance-v4.js?v=1"></script><script src="./ui-balance-fix.js?v=1"></script>';
 if(!html.includes('fixes.js?v=7')) html=html.replace('</body>',scripts+'</body>');
 const css='<style id="kopeyka-ui-v20">@media(max-width:899px){#main{padding-bottom:100px!important}.bottomnav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:9999!important;display:flex!important;width:100%!important;min-height:70px!important}.navbtn{flex:1 1 0!important;width:0!important;min-width:0!important;display:flex!important;align-items:center!important;justify-content:center!important}}</style>';
 if(!html.includes('kopeyka-ui-v20'))html=html.replace('</head>',css+'</head>'); return html;
}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.add('./')).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin===self.location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))){e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});return new Response(patch(await r.text()),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}catch(_){const c=await caches.match('./');return c?new Response(patch(await c.text()),{headers:{'Content-Type':'text/html;charset=utf-8'}}):Response.error()}})());return}e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});
