const CACHE_NAME='kopeyka-cache-v5';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./fixes.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))));self.clients.claim()});
async function patchIndex(r){let t=await r.text();
 t=t.replace(/const MONTHLY_INCOME\s*=\s*98000\s*;/g,'const MONTHLY_INCOME=0;');
 t=t.replace(/const SHIFT_RATE\s*=\s*4800\s*;/g,'const SHIFT_RATE=0;');
 t=t.replace(/const amt = shiftIncomeAmount\(sh\);\s*if\(sh\.status==='worked'\) actualShiftIncome\+=amt;\s*else if\(sh\.status==='planned'\) expectedShiftIncome\+=amt;/g,'const amt=0;');
 const reset=`<script>(function(){setTimeout(function(){try{if(!localStorage.getItem('kopeyka:income-reset-v5')&&typeof STATE!=='undefined'){STATE.income=[];try{localStorage.removeItem('kopeyka:state');var r=localStorage.getItem('kopeyka:transactions');if(r){var a=JSON.parse(r);localStorage.setItem('kopeyka:transactions',JSON.stringify(a.filter(function(x){return x.type!=='Доход'})))}}catch(e){}localStorage.setItem('kopeyka:income-reset-v5','1');if(typeof render==='function')render()}}catch(e){}},1200)})()</script>`;
 if(!t.includes('kopeyka:income-reset-v5'))t=t.replace('</body>',reset+'<script src="./fixes.js?v=5"></script></body>');
 const h=new Headers(r.headers);h.delete('content-length');return new Response(t,{status:r.status,statusText:r.statusText,headers:h})}
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith((async()=>{let r;try{r=await fetch(e.request,{cache:'no-store'})}catch(_){r=await caches.match(e.request)}if(!r)return Response.error();if(e.request.mode==='navigate'&&r.ok)r=await patchIndex(r);if(r.ok)caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r})())});
