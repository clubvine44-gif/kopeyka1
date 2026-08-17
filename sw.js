const CACHE_NAME = 'kopeyka-cache-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './fixes.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
async function patchIndex(response){
  const text0=await response.text(); let text=text0;
  text=text.replace(/const MONTHLY_INCOME\s*=\s*98000\s*;/g,'const MONTHLY_INCOME = 0;');
  text=text.replace(/const SHIFT_RATE\s*=\s*4800\s*;/g,'const SHIFT_RATE = 0;');
  text=text.replace(/const amt = shiftIncomeAmount\(sh\);\s*if\(sh\.status==='worked'\) actualShiftIncome\+=amt;\s*else if\(sh\.status==='planned'\) expectedShiftIncome\+=amt;/g,'const amt = 0;');
  if(!text.includes('fixes.js?v=4')) text=text.replace('</body>','<script src="./fixes.js?v=4"></script>\n</body>');
  const h=new Headers(response.headers);h.delete('content-length');return new Response(text,{status:response.status,statusText:response.statusText,headers:h});
}
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith((async()=>{let r;try{r=await fetch(e.request,{cache:'no-store'});}catch(_){r=await caches.match(e.request);}if(!r)return Response.error();if(e.request.mode==='navigate'&&r.ok)r=await patchIndex(r);if(r.ok)caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r;})());});
