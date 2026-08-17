/* KOPEYKA FIX CORE v4: manual income only + stable cloud + mobile UI */
(function(){
'use strict';
const SB_URL='https://cqslrfphsjllhltsvvuq.supabase.co';
const SB_KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const H={apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'};
const META='__state_v2__';
const n=v=>Number(v)||0;
const today=()=>new Date().toISOString().slice(0,10);
const original=window.computePeriodSummary;
let cloudId=null,cloudReady=false,syncing=false,lastCloud='';

function incomeFor(start,end){let actual=0,expected=0;(window.STATE?.income||[]).forEach(i=>{if(!i||i.date<start||i.date>end)return;const a=n(i.amount);if(['expected','planned','forecast'].includes(i.status))expected+=a;else actual+=a});return{actual,expected,total:actual+expected}}
function correctedSummary(state,start,end){
 const base=original?original(state,start,end):{},inc=incomeFor(start,end),t=today();let ar=0,pr=0,ao=0,po=0;
 (state.expenses||[]).forEach(e=>{if(!e||e.date<start||e.date>end)return;const a=n(e.amount);if(e.mandatory)e.date>t?po+=a:ao+=a;else e.date>t?pr+=a:ar+=a});
 (state.recurring||[]).filter(r=>r.active).forEach(r=>{try{occurrencesInRange(r,start,end).forEach(d=>{const a=n(r.amount);d>t?po+=a:ao+=a})}catch(_){}});
 let reservesNeeded=0,reserveBreakdown=[];(state.reserves||[]).filter(r=>r.active).forEach(r=>{let need=0;try{need=n(reserveRawNeed(r,start,end,inc.total))}catch(_){}reservesNeeded+=need;reserveBreakdown.push({reserve:r,need})});
 const balance=n(state.settings?.currentBalance),spendable=Math.max(0,balance+inc.actual-ar-ao),forecast=Math.max(0,balance+inc.actual+inc.expected-ar-ao-pr-po),safe=Math.max(0,forecast-reservesNeeded),strict=Math.max(0,balance+inc.actual-ar-ao-pr-po-reservesNeeded),remaining=Math.max(1,diffDays(t>start?t:start,end)+1);
 return Object.assign({},base,{periodStart:start,periodEnd:end,remainingDays:remaining,shiftsList:[],actualShiftIncome:0,expectedShiftIncome:0,actualManualIncome:inc.actual,expectedManualIncome:inc.expected,actualIncome:inc.actual,expectedIncome:inc.expected,totalIncome:inc.total,actualRegular:ar,plannedRegular:pr,totalRegular:ar+pr,actualObligatory:ao,plannedObligatory:po,totalObligatory:ao+po,reservesNeeded,reserveBreakdown,currentBalance:balance,availableNow:spendable,forecastBeforeReserves:forecast,forecastAfterReserves:safe,strictAvailable:strict,noReserveLimit:Math.round(forecast/remaining),safeLimit:Math.round(safe/remaining),strictLimit:Math.round(strict/remaining)});
}
window.computePeriodSummary=correctedSummary;
window.getStrictAvailable=s=>Math.max(0,n(s?.currentBalance)+n(s?.actualIncome)-n(s?.actualRegular)-n(s?.actualObligatory)-n(s?.plannedRegular)-n(s?.plannedObligatory)-n(s?.reservesNeeded));
try{window.SHIFT_RATE=0;window.MONTHLY_INCOME=0}catch(_){}

/* IMPORTANT: no automatic reset here. Once the initial migration has been done,
   user-entered income must NEVER be cleared on load, render, sync or refresh. */

const st=document.createElement('style');st.textContent=`@media(max-width:899px){#main{padding:14px 12px calc(94px + env(safe-area-inset-bottom,0px))!important}.bottomnav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;z-index:100!important;display:flex!important;justify-content:space-between!important;align-items:stretch!important;gap:2px!important;padding:5px 3px calc(5px + env(safe-area-inset-bottom,0px))!important;min-height:66px!important;background:var(--surface)!important;border-top:1px solid var(--border)!important;overflow:hidden!important}.navbtn{box-sizing:border-box!important;flex:1 1 0!important;width:0!important;min-width:0!important;max-width:none!important;padding:5px 2px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;font-size:clamp(8.5px,2.65vw,10.5px)!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important}.navbtn svg{width:21px!important;height:21px!important;flex:none!important}.navbtn span{display:block!important;min-width:0!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}.fab{bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}.toast{bottom:calc(82px + env(safe-area-inset-bottom,0px))!important}.grid2{grid-template-columns:1fr 1fr!important;gap:8px!important}.card{padding:15px!important}.item .body{min-width:0!important}.item .amt{font-size:13px!important;flex:none!important}.big-number{font-size:34px!important}.mid-number{font-size:20px!important}}@media(max-width:360px){.navbtn{font-size:8px!important}.navbtn svg{width:19px!important;height:19px!important}.card{padding:13px!important}}`;document.head.appendChild(st);

function cloudStatus(ok){window.cloudOnline=!!ok;const d=document.getElementById('syncDot'),x=document.getElementById('syncText');if(d)d.className='sync-dot '+(ok?'online':'offline');if(x)x.textContent=ok?'в облаке':'только локально'}
async function cloudGet(){const r=await fetch(SB_URL+'/rest/v1/transactions?select=id,date,type,category,amount,shift,comment&category=eq.'+encodeURIComponent(META)+'&order=id.desc&limit=1',{headers:H,cache:'no-store'});if(!r.ok)throw Error('Supabase '+r.status);const a=await r.json();return a[0]||null}
async function cloudPut(){if(!window.STATE||syncing)return;const json=JSON.stringify(STATE);if(json===lastCloud)return;syncing=true;try{const payload={date:today(),type:'Meta',category:META,amount:0,shift:'',comment:JSON.stringify({version:4,state:JSON.parse(json),updatedAt:Date.now()})};let r;if(cloudId)r=await fetch(SB_URL+'/rest/v1/transactions?id=eq.'+encodeURIComponent(cloudId),{method:'PATCH',headers:{...H,Prefer:'return=representation'},body:JSON.stringify(payload)});else r=await fetch(SB_URL+'/rest/v1/transactions',{method:'POST',headers:{...H,Prefer:'return=representation'},body:JSON.stringify(payload)});if(!r.ok)throw Error('Supabase '+r.status);const rows=await r.json();if(rows[0])cloudId=rows[0].id;lastCloud=json;cloudStatus(true)}catch(e){console.warn('Cloud sync:',e);cloudStatus(false)}finally{syncing=false}}
async function cloudLoad(){try{const row=await cloudGet();cloudStatus(true);if(row)cloudId=row.id;const remote=row?.comment?JSON.parse(row.comment).state:null;if(remote&&typeof remote==='object'){const meaningful=!!((STATE.income||[]).length||(STATE.expenses||[]).length||(STATE.reserves||[]).length||(STATE.recurring||[]).length);if(!meaningful){Object.keys(remote).forEach(k=>STATE[k]=remote[k]);saveState()}}cloudReady=true;lastCloud=JSON.stringify(STATE);if(typeof render==='function')render()}catch(e){cloudStatus(false);cloudReady=true;console.warn('Cloud unavailable:',e)}}
setInterval(()=>{if(!cloudReady||!window.STATE)return;const j=JSON.stringify(STATE);if(j!==lastCloud)cloudPut()},2500);
window.addEventListener('online',()=>cloudPut());
function boot(){if(window.STATE)cloudLoad();else setTimeout(boot,100)}boot();
setTimeout(()=>{try{if(typeof render==='function')render()}catch(e){console.error(e)}},0);
})();
