/* Копейка — finance reliability v4
   Исправляет будущие операции, расчёт зарплаты, два режима дневного лимита,
   обязательства/долги/плановые траты, локальный кэш и архив месячных отчётов.
*/
(() => {
  'use strict';
  if (window.__KOPEYKA_FIXES_V4__) return;
  window.__KOPEYKA_FIXES_V4__ = true;

  const SB_URL = 'https://cqslrfphsjllhltsvvuq.supabase.co';
  const SB_KEY = 'sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
  const H = {apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type':'application/json'};
  const SHIFT_RATE = 4800;
  const PENDING_KEY = 'kopeyka:pending-sync:v2';
  const PLANS_KEY = 'kopeyka:plans:v1';
  const REPORTS_KEY = 'kopeyka:monthly-reports:v1';
  const MODE_KEY = 'kopeyka:daily-mode:v1';

  const fmt = n => Math.round(Number(n)||0).toLocaleString('ru-RU') + ' ₽';
  const dateOnly = v => { const [y,m,d]=String(v).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); };
  const todayOnly = () => { const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); };
  const iso = d => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const future = v => dateOnly(v) > todayOnly();
  const isIncome = t => t && t.type==='Доход' && t.category!=='Накопление';
  const isSaving = t => t && (t.type==='Накопление' || (t.type==='Доход' && t.category==='Накопление'));
  const isExpense = t => t && t.type==='Расход';

  const CYCLE = ['Выходной','Выходной','День','День','Ночь','Ночь'];
  const ANCHOR = new Date(2026,8,1);
  const shiftIndex = d => { const n=Math.round((dateOnly(d)-ANCHOR)/86400000); return ((n%6)+6)%6; };
  const isWorkDay = d => CYCLE[shiftIndex(d)]!=='Выходной';
  function countShifts(y,m,start,end){ let n=0,last=new Date(y,m+1,0).getDate(); for(let d=start;d<=Math.min(end,last);d++) if(isWorkDay(new Date(y,m,d))) n++; return n; }
  function salaryForHalf(y,m,half){ const start=half===1?1:16,end=half===1?15:new Date(y,m+1,0).getDate(); return countShifts(y,m,start,end)*SHIFT_RATE; }
  function salaryEvents(now=todayOnly()){
    const out=[],y=now.getFullYear(),m=now.getMonth();
    for(let k=-2;k<=4;k++){ const mm=m+k; out.push({date:new Date(y,mm,25),amount:salaryForHalf(y,mm,1),label:`1–15 ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`}); out.push({date:new Date(y,mm+1,10),amount:salaryForHalf(y,mm,2),label:`16–${new Date(y,mm+1,0).getDate()} ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`}); }
    return out.filter(x=>x.date>now).sort((a,b)=>a.date-b.date);
  }

  const safeJSON=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'');}catch{return f;}};
  const pendingRead=()=>safeJSON(PENDING_KEY,[]); const pendingWrite=v=>{try{localStorage.setItem(PENDING_KEY,JSON.stringify(v));}catch{}};
  const plansRead=()=>safeJSON(PLANS_KEY,[]); const plansWrite=v=>{try{localStorage.setItem(PLANS_KEY,JSON.stringify(v));}catch{}};
  const reportsRead=()=>safeJSON(REPORTS_KEY,{}); const reportsWrite=v=>{try{localStorage.setItem(REPORTS_KEY,JSON.stringify(v));}catch{}};
  const txsNow=()=>Array.isArray(window.txs)?window.txs:[];
  const monthTxs=(y,m)=>txsNow().filter(t=>{const d=dateOnly(t.date);return d.getFullYear()===y&&d.getMonth()===m;});
  const monthKey=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`;

  async function cloudInsert(payload){ const r=await fetch(`${SB_URL}/rest/v1/transactions`,{method:'POST',headers:{...H,Prefer:'return=representation'},body:JSON.stringify(payload)}); if(!r.ok)throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,220)}`); const rows=await r.json(); if(!Array.isArray(rows)||!rows[0])throw new Error('Supabase не вернул запись'); return rows[0]; }
  function queuePending(payload){ const q=pendingRead(),fingerprint=`${payload.date}|${payload.type}|${payload.category}|${payload.amount}|${payload.comment||''}|${payload.shift||''}`; if(q.some(x=>x.fingerprint===fingerprint))return; q.push({...payload,fingerprint,localId:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2)}); pendingWrite(q); }
  async function flushPending(){ const q=pendingRead();if(!q.length)return;const left=[];for(const item of q){const {localId,fingerprint,...payload}=item;try{await cloudInsert(payload);}catch{left.push(item);}}pendingWrite(left); }
  function saveCache(){try{localStorage.setItem('kopeyka:transactions',JSON.stringify(txsNow()));}catch{}}
  function ensureSyncBadge(){const dot=document.getElementById('syncDot'),text=document.getElementById('syncText');if(!dot||!text)return;const pending=pendingRead().length;if(!navigator.onLine){dot.className='sync-dot offline';text.textContent='нет сети';}else if(pending){dot.className='sync-dot offline';text.textContent=`ожидает синхронизации: ${pending}`;}else{dot.className='sync-dot online';text.textContent='в облаке';}}
  function showSaveError(text){const b=document.querySelector('#txForm .submit-btn');if(!b)return;b.disabled=false;b.textContent=text;setTimeout(()=>{b.textContent='Добавить';},4500);}

  async function futureSubmit(e){
    if(e.target?.id!=='txForm')return;
    const dateEl=document.getElementById('txDate'),amountEl=document.getElementById('txAmount'),catEl=document.getElementById('txCategory'),shiftEl=document.getElementById('txShift'),commentEl=document.getElementById('txComment'),active=document.querySelector('.type-toggle button.active');
    if(!dateEl||!amountEl||!catEl||!active||!dateEl.value||!future(dateEl.value))return;
    e.preventDefault();e.stopImmediatePropagation();
    const amount=Number(amountEl.value);if(!Number.isFinite(amount)||amount<=0){showSaveError('Некорректная сумма');return;}
    const payload={date:dateEl.value,type:active.dataset.type,category:catEl.value,amount,comment:(commentEl?.value||'').trim(),shift:shiftEl?.value||''};
    const btn=e.target.querySelector('.submit-btn');if(!btn||btn.disabled)return;btn.disabled=true;btn.textContent='Сохраняю…';
    try{const row=await cloudInsert(payload);txsNow().push(row);saveCache();btn.textContent='Сохранено ✓';if(typeof window.render==='function')window.render();renderAll();setTimeout(()=>{btn.disabled=false;btn.textContent='Добавить';},1200);}
    catch(err){console.error(err);queuePending(payload);txsNow().push({...payload,id:'local-'+Date.now()});saveCache();showSaveError('Сохранено локально · синхронизация позже');if(typeof window.render==='function')window.render();renderAll();}
  }

  function injectStyles(){if(document.getElementById('k-v4-style'))return;const s=document.createElement('style');s.id='k-v4-style';s.textContent=`.k-v4-box{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.k-v4-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.k-v4-btn{background:var(--surface-2);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:9px 10px;font-size:12px;cursor:pointer}.k-v4-btn.active{border-color:var(--gold);color:var(--gold)}.k-v4-muted{color:var(--muted);font-size:11.5px}.k-v4-item{padding:10px 0;border-bottom:1px solid var(--line)}.k-v4-item:last-child{border-bottom:0}.k-v4-row{display:flex;justify-content:space-between;gap:10px;font-size:12.5px}.k-v4-bar{height:7px;background:var(--surface-2);border:1px solid var(--line);border-radius:5px;overflow:hidden;margin-top:6px}.k-v4-fill{height:100%;background:linear-gradient(90deg,var(--gold-dim),var(--gold))}.k-v4-delete{background:none;border:0;color:var(--faint);cursor:pointer}@media(max-width:520px){.k-v4-grid{grid-template-columns:1fr}}`;document.head.appendChild(s);}

  function injectHeroControls(){const hero=document.querySelector('.hero');if(!hero||document.getElementById('kDailyModes'))return;const box=document.createElement('div');box.id='kDailyModes';box.className='k-v4-box';const mode=localStorage.getItem(MODE_KEY)||'reserved';box.innerHTML=`<div class="k-v4-muted" style="margin-bottom:7px">Режим расчёта дневной суммы</div><div class="k-v4-grid"><button class="k-v4-btn ${mode==='reserved'?'active':''}" data-kmode="reserved">С учётом обязательств</button><button class="k-v4-btn ${mode==='free'?'active':''}" data-kmode="free">Без резервов</button></div><div id="kDailyExplain" class="k-v4-muted" style="margin-top:7px"></div>`;hero.appendChild(box);box.querySelectorAll('[data-kmode]').forEach(b=>b.onclick=()=>{localStorage.setItem(MODE_KEY,b.dataset.kmode);box.querySelectorAll('.k-v4-btn').forEach(x=>x.classList.toggle('active',x===b));renderHeroV4();});}

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function injectPlanning(){const home=document.getElementById('page-home');if(!home||document.getElementById('kPlanning'))return;const sec=document.createElement('section');sec.id='kPlanning';sec.innerHTML=`<h2>Планирование денег</h2><div class="hint">«Должен» и «Плановая трата» учитываются в расчёте с резервами.</div><div class="k-v4-grid"><input id="kPlanName" placeholder="Название"><input id="kPlanAmount" type="number" min="0" placeholder="Сумма, ₽"></div><div class="k-v4-grid" style="margin-top:8px"><select id="kPlanType"><option value="debt">Должен</option><option value="planned">Плановая трата</option></select><input id="kPlanDate" type="date"></div><button id="kPlanAdd" class="submit-btn" style="margin-top:8px">Добавить в план</button><div id="kPlansList" class="k-v4-box"></div>`;home.appendChild(sec);document.getElementById('kPlanDate').value=iso(todayOnly());document.getElementById('kPlanAdd').onclick=()=>{const name=document.getElementById('kPlanName').value.trim(),amount=Number(document.getElementById('kPlanAmount').value),type=document.getElementById('kPlanType').value,date=document.getElementById('kPlanDate').value;if(!name||!Number.isFinite(amount)||amount<=0||!date)return;const p=plansRead();p.push({id:'p-'+Date.now(),name,amount,type,date,createdAt:new Date().toISOString()});plansWrite(p);document.getElementById('kPlanName').value='';document.getElementById('kPlanAmount').value='';renderPlans();renderHeroV4();};renderPlans();}
  function renderPlans(){const box=document.getElementById('kPlansList');if(!box)return;const plans=plansRead().sort((a,b)=>a.date.localeCompare(b.date));box.innerHTML=plans.length?plans.map(p=>`<div class="k-v4-item"><div class="k-v4-row"><span><b>${p.type==='debt'?'Должен':'Плановая трата'}:</b> ${escapeHtml(p.name)}</span><span>${fmt(p.amount)}</span></div><div class="k-v4-muted">Плановая дата: ${p.date}</div><div style="text-align:right"><button class="k-v4-delete" data-kdel="${p.id}">Удалить</button></div></div>`).join(''):'<div class="k-v4-muted">Планов пока нет.</div>';box.querySelectorAll('[data-kdel]').forEach(b=>b.onclick=()=>{plansWrite(plansRead().filter(p=>p.id!==b.dataset.kdel));renderPlans();renderHeroV4();});}

  function calcHero(){const now=todayOnly(),events=salaryEvents(now),next=events[0],all=txsNow();const actualIncome=all.filter(t=>isIncome(t)&&!future(t.date)).reduce((s,t)=>s+Number(t.amount||0),0),actualExpense=all.filter(t=>isExpense(t)&&!future(t.date)).reduce((s,t)=>s+Number(t.amount||0),0),actualSaving=all.filter(t=>isSaving(t)&&!future(t.date)).reduce((s,t)=>s+Number(t.amount||0),0),actualBalance=actualIncome-actualExpense-actualSaving,days=next?Math.max(1,Math.ceil((next.date-now)/86400000)):1,current=monthTxs(now.getFullYear(),now.getMonth());const plans=plansRead().filter(p=>p.date>=iso(now)),planReserve=plans.reduce((s,p)=>s+Number(p.amount||0),0),goalReserve=Math.max(0,(typeof GOALS!=='undefined'?GOALS.reduce((s,g)=>s+Number(g.monthly||0),0):0)-current.filter(isSaving).reduce((s,t)=>s+Number(t.amount||0),0)),obligPaid=current.filter(t=>isExpense(t)&&t.category==='Обязательные платежи').reduce((s,t)=>s+Number(t.amount||0),0),obligationTarget=(typeof OBLIGATIONS_TOTAL!=='undefined'?Number(OBLIGATIONS_TOTAL):0),obligLeft=Math.max(0,obligationTarget-obligPaid),debtPaid=current.filter(t=>isExpense(t)&&t.category==='Долг').reduce((s,t)=>s+Number(t.amount||0),0),debtTarget=(typeof DEBT!=='undefined'?Math.min(Number(DEBT.monthly||0),Math.max(0,Number(DEBT.total||0)-all.filter(t=>isExpense(t)&&t.category==='Долг').reduce((s,t)=>s+Number(t.amount||0),0))):0),debtLeft=Math.max(0,debtTarget-debtPaid),reserves=goalReserve+obligLeft+debtLeft+planReserve;return{now,next,days,actualBalance,reserves,reservedDaily:Math.max(0,(actualBalance-reserves)/days),freeDaily:Math.max(0,actualBalance/days),obligLeft,debtLeft,goalReserve,planReserve};}

  function renderHeroV4(){const hero=document.getElementById('heroDaily');if(!hero)return;const mode=localStorage.getItem(MODE_KEY)||'reserved',c=calcHero(),value=mode==='free'?c.freeDaily:c.reservedDaily;hero.textContent=fmt(value);hero.className='hero-value'+(value<=0?' zero':'');const sub=document.getElementById('heroSub');if(sub)sub.textContent=c.next?`${c.days} ${c.days===1?'день':(c.days<5?'дня':'дней')} до следующей выплаты · ${c.next.date.toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})} · +${fmt(c.next.amount)}`:'Нет ближайшей выплаты';const ex=document.getElementById('kDailyExplain');if(ex)ex.textContent=mode==='free'?`Без резервов: ${fmt(c.actualBalance)} ÷ ${c.days} дней.`:`После резервов: ${fmt(c.actualBalance)} − ${fmt(c.reserves)} = ${fmt(Math.max(0,c.actualBalance-c.reserves))} ÷ ${c.days} дней.`;const res=document.getElementById('heroReserves');if(res)res.innerHTML=[['Обязательные платежи',c.obligLeft],['Долг',c.debtLeft],['Цели',c.goalReserve],['Плановые траты/долги',c.planReserve]].map(([n,v])=>`<div class="reserve-row"><span>${n}</span><span class="reserve-amt">${fmt(v)}</span></div>`).join('');}

  function archiveCurrentReport(){const now=todayOnly(),y=now.getFullYear(),m=now.getMonth(),mt=monthTxs(y,m),income=mt.filter(isIncome).reduce((s,t)=>s+Number(t.amount||0),0),expense=mt.filter(isExpense).reduce((s,t)=>s+Number(t.amount||0),0),saving=mt.filter(isSaving).reduce((s,t)=>s+Number(t.amount||0),0),reports=reportsRead();reports[monthKey(y,m)]={year:y,month:m,income,expense,saving,balance:income-expense-saving,updatedAt:new Date().toISOString()};reportsWrite(reports);}
  function renderReportsArchive(){const page=document.getElementById('page-report');if(!page||document.getElementById('kReportsArchive'))return;const sec=document.createElement('section');sec.id='kReportsArchive';sec.innerHTML='<h2>Архив отчётов</h2><div class="hint">Месячные снимки сохраняются локально и не удаляются при наступлении нового месяца.</div><div id="kReportsList"></div>';page.appendChild(sec);const list=document.getElementById('kReportsList'),reports=reportsRead(),keys=Object.keys(reports).sort().reverse();list.innerHTML=keys.length?keys.map(k=>{const r=reports[k];return `<div class="k-v4-item"><div class="k-v4-row"><b>${k}</b><span>${fmt(r.balance)}</span></div><div class="k-v4-muted">Доход ${fmt(r.income)} · Расходы ${fmt(r.expense)} · Накопления ${fmt(r.saving)}</div></div>`}).join(''):'<div class="k-v4-muted">Архив появится после первого сохранённого отчёта.</div>';}

  function renderAll(){injectStyles();injectHeroControls();injectPlanning();renderPlans();renderHeroV4();archiveCurrentReport();renderReportsArchive();ensureSyncBadge();}
  function boot(){injectStyles();injectHeroControls();injectPlanning();renderReportsArchive();const form=document.getElementById('txForm');if(form)form.addEventListener('submit',futureSubmit,true);window.addEventListener('online',async()=>{await flushPending();ensureSyncBadge();renderAll();});window.addEventListener('offline',()=>{ensureSyncBadge();renderAll();});setTimeout(async()=>{await flushPending();renderAll();},900);setInterval(async()=>{await flushPending();renderAll();},60000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();