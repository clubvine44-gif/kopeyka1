const CACHE_NAME='kopeyka-cache-v9';
const VERSION='9';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./fixes.js'];
function rewrite(html){
  /* ROOT FIX: change the application's source before JavaScript executes. */
  html=html.replace(/function shiftIncomeAmount\(shift\)\{[\s\S]*?\n\}/,`function shiftIncomeAmount(shift){ return 0; }`);
  const core=`function computePeriodSummary(state, periodStart, periodEnd){
  const today=todayStr();
  let actualManualIncome=0, expectedManualIncome=0;
  (state.income||[]).filter(i=>i&&i.date>=periodStart&&i.date<=periodEnd).forEach(i=>{
    const a=Number(i.amount)||0;
    if(i.status==='actual') actualManualIncome+=a; else expectedManualIncome+=a;
  });
  const shiftsList=[]; let d=periodStart;
  while(d<=periodEnd){ const sh=getShift(d,state); sh.amount=0; shiftsList.push(sh); d=addDays(d,1); }
  const actualIncome=actualManualIncome;
  const expectedIncome=expectedManualIncome;
  const totalIncome=actualIncome+expectedIncome;
  let actualRegular=0,plannedRegular=0,actualObligatory=0,plannedObligatory=0;
  (state.expenses||[]).filter(e=>e&&e.date>=periodStart&&e.date<=periodEnd).forEach(e=>{
    const a=Number(e.amount)||0;
    if(e.date<=today){if(e.mandatory)actualObligatory+=a;else actualRegular+=a}
    else {if(e.mandatory)plannedObligatory+=a;else plannedRegular+=a}
  });
  (state.recurring||[]).filter(r=>r.active).forEach(r=>occurrencesInRange(r,periodStart,periodEnd).forEach(dt=>{
    const a=Number(r.amount)||0; if(dt>today)plannedObligatory+=a; else actualObligatory+=a;
  }));
  const totalRegular=actualRegular+plannedRegular,totalObligatory=actualObligatory+plannedObligatory;
  let reservesNeeded=0; const reserveBreakdown=[];
  (state.reserves||[]).filter(r=>r.active).forEach(r=>{const need=reserveRawNeed(r,periodStart,periodEnd,totalIncome);reservesNeeded+=need;reserveBreakdown.push({reserve:r,need})});
  const currentBalance=Number(state.settings.currentBalance)||0;
  const availableNow=currentBalance+actualManualIncome;
  const futurePool=availableNow+expectedManualIncome-plannedRegular-plannedObligatory;
  const forecastBeforeReserves=futurePool;
  const forecastAfterReserves=futurePool-reservesNeeded;
  const strictAvailable=availableNow-plannedRegular-plannedObligatory-reservesNeeded;
  const remainingDays=periodEnd<today?0:(diffDays(today>periodStart?today:periodStart,periodEnd)+1);
  const noReserveLimit=remainingDays>0?Math.round(forecastBeforeReserves/remainingDays):null;
  const safeLimit=remainingDays>0?Math.round(forecastAfterReserves/remainingDays):null;
  const strictLimit=remainingDays>0?Math.round(strictAvailable/remainingDays):null;
  let pool=Math.max(0,forecastBeforeReserves);
  const allocation=reserveBreakdown.slice().sort((a,b)=>(a.reserve.priority||99)-(b.reserve.priority||99)).map(x=>{const allocated=Math.min(x.need,pool);pool-=allocated;return{reserve:x.reserve,need:x.need,allocated,deficit:x.need-allocated}});
  return {periodStart,periodEnd,remainingDays,shiftsList,actualShiftIncome:0,expectedShiftIncome:0,actualManualIncome,expectedManualIncome,actualIncome,expectedIncome,totalIncome,actualRegular,plannedRegular,totalRegular,actualObligatory,plannedObligatory,totalObligatory,reservesNeeded,reserveBreakdown,allocation,currentBalance,availableNow,forecastBeforeReserves,forecastAfterReserves,strictAvailable,noReserveLimit,safeLimit,strictLimit};
}`;
  html=html.replace(/function computePeriodSummary\(state, periodStart, periodEnd\)\{[\s\S]*?\n\}\nfunction limitForMode/,core+'\nfunction limitForMode');
  html=html.replace(/h\+='<div class="section-title">Доход от смен<\\/div>';[\s\S]*?h\+='<div class="section-title">Дополнительный доход<\\/div>';/,`h+='<div class="section-title">Смены</div>';
  h+='<div class="card"><div class="empty" style="padding:24px 16px;"><div class="em-ico">&#128197;</div><div>График смен не является доходом. Полученные деньги вносятся вручную в разделе «Дополнительный доход».</div></div></div>';
  h+='<div class="section-title">Дополнительный доход</div>';`);
  if(!html.includes('fixes.js')) html=html.replace('</body>','<script src="./fixes.js?v='+VERSION+'"></script></body>');
  return html;
}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin===self.location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))){e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(!r.ok)return r;return new Response(rewrite(await r.text()),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}catch(_){const c=await caches.match(e.request);if(!c)return Response.error();return new Response(rewrite(await c.text()),{headers:{'Content-Type':'text/html; charset=utf-8'}})}})());return}e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok)caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r}catch(_){return(await caches.match(e.request))||Response.error()}})())});
