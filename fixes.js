/* Копейка — targeted finance fixes v2 */
(() => {
  'use strict';
  const SB_URL = 'https://cqslrfphsjllhltsvvuq.supabase.co';
  const SB_KEY = 'sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
  const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const SHIFT_RATE = 4800;
  const SALARY_SHIFTS = { '2026-08': { firstHalf: 9, secondHalf: 12 } };
  const fmt = n => Math.round(Number(n)||0).toLocaleString('ru-RU') + ' ₽';
  const dayWord = n => { const a=n%10,b=n%100; return a===1&&b!==11?'день':([2,3,4].includes(a)&&![12,13,14].includes(b)?'дня':'дней'); };
  const dateOnly = v => { const [y,m,d]=String(v).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); };
  const todayOnly = () => { const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); };
  const isFuture = v => dateOnly(v) > todayOnly();
  const isIncome = t => t.type==='Доход' && t.category!=='Накопление';
  const isSaving = t => t.type==='Доход' && t.category==='Накопление';
  const isExpense = t => t.type==='Расход';
  async function getTxs(){ const r=await fetch(`${SB_URL}/rest/v1/transactions?select=*&order=date.desc`,{headers:H,cache:'no-store'}); if(!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,200)}`); return r.json(); }
  function salaryForPeriod(year,month,half){ const key=`${year}-${String(month+1).padStart(2,'0')}`; const cfg=SALARY_SHIFTS[key]; return cfg ? (half===1?cfg.firstHalf:cfg.secondHalf)*SHIFT_RATE : 49000; }
  function salaryEvents(today){ const events=[],y=today.getFullYear(),m=today.getMonth(); for(let k=-1;k<=2;k++){ const mm=m+k; events.push({date:new Date(y,mm,25),amount:salaryForPeriod(y,mm,1),label:`1–15 ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`}); events.push({date:new Date(y,mm+1,10),amount:salaryForPeriod(y,mm,2),label:`15–${new Date(y,mm+1,0).getDate()} ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`}); } return events.filter(e=>e.date>today).sort((a,b)=>a.date-b.date); }
  function showSaveError(message){ const btn=document.querySelector('#txForm .submit-btn'); if(!btn)return; btn.disabled=false; btn.textContent='Ошибка: '+message; setTimeout(()=>btn.textContent='Добавить',5000); }
  function resetOnlyTransientFields(){ const a=document.getElementById('txAmount'),c=document.getElementById('txComment'),s=document.getElementById('txShift'); if(a)a.value=''; if(c)c.value=''; if(s)s.value=''; }
  async function saveFutureTransaction(event){
    if(!event || event.target?.id!=='txForm') return;
    const dateEl=document.getElementById('txDate'),amountEl=document.getElementById('txAmount'),categoryEl=document.getElementById('txCategory'),shiftEl=document.getElementById('txShift'),commentEl=document.getElementById('txComment'),typeButton=document.querySelector('.type-toggle button.active');
    if(!dateEl||!amountEl||!categoryEl||!typeButton)return;
    const date=dateEl.value,amount=Number(amountEl.value),type=typeButton.dataset.type,category=categoryEl.value,shift=shiftEl?.value||'',comment=commentEl?.value.trim()||'';
    if(!date||!isFuture(date))return;
    event.preventDefault(); event.stopImmediatePropagation();
    if(!Number.isFinite(amount)||amount<=0){showSaveError('некорректная сумма');return;}
    const btn=event.target.querySelector('.submit-btn'); if(!btn||btn.disabled)return; const oldText=btn.textContent; btn.disabled=true; btn.textContent='Сохраняю…';
    try{
      const response=await fetch(`${SB_URL}/rest/v1/transactions`,{method:'POST',headers:{...H,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({date,type,category,amount,comment,shift})});
      if(!response.ok)throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0,220)}`);
      const rows=await response.json(); if(!Array.isArray(rows)||!rows[0])throw new Error('Supabase не вернул созданную запись');
      resetOnlyTransientFields(); btn.textContent='Сохранено ✓'; setTimeout(()=>{btn.textContent=oldText;btn.disabled=false;},1400);
      const fresh=await getTxs(); if(Array.isArray(window.txs)){window.txs.length=0;fresh.forEach(t=>window.txs.push(t));}
      if(typeof window.render==='function'){try{window.render();}catch(e){console.error(e);}} renderSalaryAwareHero(fresh);
    }catch(error){ console.error('Копейка: ошибка сохранения будущей операции',error); showSaveError(error.message||'не удалось сохранить'); }
  }
  function renderSalaryAwareHero(txs){
    const now=new Date(),today=todayOnly(),next=salaryEvents(today)[0]; if(!next)return; const days=Math.max(1,Math.ceil((next.date-today)/86400000));
    const income=txs.filter(t=>isIncome(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const expenses=txs.filter(t=>isExpense(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const savings=txs.filter(t=>isSaving(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const balance=income-expenses-savings;
    const monthTxs=txs.filter(t=>{const d=dateOnly(t.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();});
    const paidOblig=monthTxs.filter(t=>isExpense(t)&&t.category==='Обязательные платежи').reduce((s,t)=>s+(Number(t.amount)||0),0), obligationsTotal=35700, obligLeft=Math.max(0,obligationsTotal-paidOblig);
    const paidDebt=monthTxs.filter(t=>isExpense(t)&&t.category==='Долг').reduce((s,t)=>s+(Number(t.amount)||0),0), debtTotal=15000, debtLeft=Math.max(0,debtTotal-paidDebt);
    const daily=Math.max(0,balance-obligLeft-debtLeft)/days;
    const hero=document.getElementById('heroDaily'),sub=document.getElementById('heroSub'),box=document.getElementById('heroReserves');
    if(hero){hero.textContent=fmt(daily);hero.className='hero-value'+(daily<=0?' zero':'');}
    if(sub)sub.textContent=`${days} ${dayWord(days)} до следующей выплаты (${next.date.toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})}) · +${fmt(next.amount)} · ${next.label}`;
    if(!box)return; const pct=Math.min(100,Math.max(0,paidOblig/obligationsTotal*100));
    box.innerHTML=`<div class="reserve-row" style="display:block"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span>Обязательные платежи</span><span class="reserve-amt">${fmt(paidOblig)} из ${fmt(obligationsTotal)}</span></div><div style="height:8px;border-radius:5px;background:var(--surface-2);overflow:hidden;border:1px solid var(--line)"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold-dim),var(--gold));border-radius:5px"></div></div></div><div class="reserve-row"><span>Долг в этом месяце</span><span class="reserve-amt">${fmt(Math.min(paidDebt,debtTotal))} из ${fmt(debtTotal)}</span></div>`;
  }
  function boot(){ const form=document.getElementById('txForm'); if(form)form.addEventListener('submit',saveFutureTransaction,true); const refresh=async()=>{try{renderSalaryAwareHero(await getTxs());}catch(e){console.error('Копейка fixes:',e);}}; setTimeout(refresh,900); setInterval(refresh,30000); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
