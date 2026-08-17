const CACHE_NAME='kopeyka-root-v11';
function patch(html){
  html=html.replace(/function shiftIncomeAmount\(shift\)\s*\{[\s\S]*?\n\}/m,'function shiftIncomeAmount(shift){ return 0; }');
  html=html.replace(/let actualShiftIncome=0, expectedShiftIncome=0;[\s\S]*?const actualIncome = actualShiftIncome\+actualManualIncome;\s*const expectedIncome = expectedShiftIncome\+expectedManualIncome;\s*const totalIncome = actualIncome\+expectedIncome;/m,`let actualShiftIncome=0, expectedShiftIncome=0;
  let d=periodStart; const shiftsList=[];
  while(d<=periodEnd){ const sh=getShift(d,state); sh.amount=0; shiftsList.push(sh); d=addDays(d,1); }
  let actualManualIncome=0, expectedManualIncome=0;
  (state.income||[]).filter(i=>i&&i.date>=periodStart&&i.date<=periodEnd).forEach(i=>{
    const amount=Number(i.amount)||0;
    if(i.status==='actual') actualManualIncome+=amount; else expectedManualIncome+=amount;
  });
  const actualIncome=actualManualIncome;
  const expectedIncome=expectedManualIncome;
  const totalIncome=actualIncome+expectedIncome;`);
  const bridge=`<script>(function(){try{const wrap=window.computePeriodSummary;if(typeof wrap==='function'&&!wrap.__cashBridge){const f=wrap;window.computePeriodSummary=function(state,start,end){const s=f(state,start,end)||{};let actual=0;(state&&state.income||[]).forEach(i=>{if(i&&i.date>=start&&i.date<=end&&i.status==='actual')actual+=Number(i.amount)||0});const base=Number(state&&state.settings&&state.settings.currentBalance)||0;s.currentBalance=base+actual;s.actualIncome=actual;s.actualManualIncome=actual;s.actualShiftIncome=0;return s};window.computePeriodSummary.__cashBridge=true;try{if(typeof render==='function')render()}catch(e){}}}catch(e){console.warn('cash bridge',e)}})();</script>`;
  html=html.replace('</body>',bridge+'</body>');
  return html;
}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(['./','./index.html','./manifest.json','./icon.svg'])).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin===self.location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))){e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});return new Response(patch(await r.text()),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}catch(_){const c=await caches.match(e.request);if(!c)return Response.error();return new Response(patch(await c.text()),{headers:{'Content-Type':'text/html;charset=utf-8'}})}})());return}e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});
