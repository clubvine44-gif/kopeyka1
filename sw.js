const CACHE_NAME='kopeyka-root-v14';

function patch(html){
  /* 1) Replace the actual source of automatic shift income in the original app. */
  html=html.replace(/function shiftIncomeAmount\(shift\)\s*\{[\s\S]*?\n\}/m,'function shiftIncomeAmount(shift){ return 0; }');

  /* 2) Replace the original period income section before the app executes it. */
  html=html.replace(/let actualShiftIncome=0, expectedShiftIncome=0;[\s\S]*?const totalIncome = actualIncome\+expectedIncome;/m,
`let actualShiftIncome=0, expectedShiftIncome=0; let d=periodStart; const shiftsList=[]; while(d<=periodEnd){ const sh=getShift(d,state); shiftsList.push(sh); d=addDays(d,1); } let actualManualIncome=0, expectedManualIncome=0; (state.income||[]).filter(i=>i&&i.date>=periodStart&&i.date<=periodEnd).forEach(i=>{const amount=Number(i.amount)||0;if(i.status==='actual') actualManualIncome+=amount; else expectedManualIncome+=amount;}); const actualIncome=actualManualIncome; const expectedIncome=expectedManualIncome; const totalIncome=actualIncome+expectedIncome;`);

  /* 3) Make currentBalance a derived value for calculations, without ever
        writing the derived value back into the base balance. */
  const bridge=`<script>(function(){
try{
  const incomeActual=()=>{let a=0;const list=(window.STATE&&Array.isArray(STATE.income))?STATE.income:[];for(const i of list){if(i&&i.status==='actual')a+=Number(i.amount)||0}return a};
  const baseBalance=s=>{const v=s&&s.settings?s.settings.currentBalance:0;return Number(v)||0};
  const effectiveBalance=s=>baseBalance(s)+incomeActual();
  const originalCompute=window.computePeriodSummary;
  if(typeof originalCompute==='function'&&!originalCompute.__kopeykaV14){
    const wrapped=function(state,start,end){
      const result=originalCompute(state,start,end)||{};
      let actual=0,expected=0;for(const i of ((state&&state.income)||[])){if(!i||i.date<start||i.date>end)continue;const a=Number(i.amount)||0;if(i.status==='actual')actual+=a;else expected+=a}
      const bal=baseBalance(state)+actual;
      result.actualShiftIncome=0;result.expectedShiftIncome=0;result.actualManualIncome=actual;result.expectedManualIncome=expected;result.actualIncome=actual;result.expectedIncome=expected;result.totalIncome=actual+expected;
      result.currentBalance=bal;result.availableNow=bal;
      result.forecastBeforeReserves=bal+expected-(Number(result.plannedRegular)||0)-(Number(result.plannedObligatory)||0);
      result.reservesNeeded=Number(result.reservesNeeded)||0;
      result.forecastAfterReserves=result.forecastBeforeReserves-result.reservesNeeded;
      result.strictAvailable=bal-(Number(result.plannedRegular)||0)-(Number(result.plannedObligatory)||0)-result.reservesNeeded;
      const days=Math.max(1,Number(result.remainingDays)||1);result.noReserveLimit=Math.round(result.forecastBeforeReserves/days);result.safeLimit=Math.round(result.forecastAfterReserves/days);result.strictLimit=Math.round(result.strictAvailable/days);
      return result;
    };wrapped.__kopeykaV14=true;window.computePeriodSummary=wrapped;
  }

  /* Re-render after the root fix has replaced the calculation. */
  const css=document.createElement('style');css.id='kopeyka-v14-style';css.textContent=`
  @media(max-width:899px){
    #main{padding:14px 12px calc(100px + env(safe-area-inset-bottom,0px))!important;min-height:100vh!important}
    .bottomnav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:9999!important;width:100%!important;height:auto!important;min-height:70px!important;display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:stretch!important;gap:2px!important;padding:5px 3px calc(5px + env(safe-area-inset-bottom,0px))!important;background:var(--surface)!important;border-top:1px solid var(--border)!important;overflow:hidden!important}
    .navbtn{box-sizing:border-box!important;flex:1 1 0!important;width:0!important;min-width:0!important;max-width:none!important;height:58px!important;margin:0!important;padding:5px 1px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;font-size:clamp(8px,2.5vw,10px)!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important}
    .navbtn svg{width:21px!important;height:21px!important;flex:none!important}.navbtn span{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    .fab{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}.toast{bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}
    .card{overflow:hidden!important}.row{min-width:0!important}.item .body{min-width:0!important}.item .amt{white-space:nowrap!important;font-size:13px!important}
  }
  `;if(!document.getElementById('kopeyka-v14-style'))document.head.appendChild(css);

  /* Show the effective balance on the reserves screen without changing the saved base balance. */
  const originalReserves=window.renderReserves;
  if(typeof originalReserves==='function'&&!originalReserves.__kopeykaV14){
    window.renderReserves=function(){originalReserves.apply(this,arguments);try{const main=document.getElementById('main');if(!main)return;const sum=window.computePeriodSummary(window.STATE,window.currentPeriod().start,window.currentPeriod().end);const cards=main.querySelectorAll('.grid2 .card');if(cards.length){const target=cards[0].parentElement;const card=document.createElement('div');card.className='card card-tight';card.innerHTML='<div class="label">Текущий баланс</div><div class="mid-number">'+window.fmt(sum.currentBalance)+'</div><div class="faint">базовый баланс + фактически полученный доход</div>';target.parentNode.insertBefore(card,target.nextSibling)}}catch(e){console.warn(e)}};window.renderReserves.__kopeykaV14=true}

  setTimeout(function(){try{if(typeof render==='function')render()}catch(e){console.warn(e)}},0);
}catch(e){console.warn('Kopeyka v14 root fix',e)}})();</script>`;
  if(!html.includes('kopeyka-v14-style'))html=html.replace('</body>',bridge+'</body>');
  return html;
}

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.add('./')).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===self.location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))){
    e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});return new Response(patch(await r.text()),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}catch(_){return Response.error()}})());return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request).then(r=>r||Response.error())));
});
