/* Копейка — finance audit fixes v3
   Основные исправления: зарплата по фактическим сменам, будущие операции,
   безопасное сохранение, прогресс обязательств и расчёт "Можно потратить сегодня".
*/
(() => {
  'use strict';
  if (window.__KOPEYKA_FIXES_V3__) return;
  window.__KOPEYKA_FIXES_V3__ = true;

  const SB_URL = 'https://cqslrfphsjllhltsvvuq.supabase.co';
  const SB_KEY = 'sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
  const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const SHIFT_RATE = 4800;
  const PENDING_KEY = 'kopeyka:pending-sync:v1';

  const fmt = n => Math.round(Number(n) || 0).toLocaleString('ru-RU') + ' ₽';
  const dayWord = n => {
    const a=n%10,b=n%100;
    return a===1&&b!==11?'день':([2,3,4].includes(a)&&![12,13,14].includes(b)?'дня':'дней');
  };
  const dateOnly = value => {
    const [y,m,d]=String(value).slice(0,10).split('-').map(Number);
    return new Date(y,m-1,d);
  };
  const todayOnly = () => { const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); };
  const isFuture = value => dateOnly(value) > todayOnly();
  const isIncome = t => t && t.type === 'Доход' && t.category !== 'Накопление';
  const isSaving = t => t && (t.type === 'Накопление' || (t.type === 'Доход' && t.category === 'Накопление'));
  const isExpense = t => t && t.type === 'Расход';

  // Рабочий цикл 2/2/2. 1 сентября 2026 — выходной.
  // Это даёт для августа ровно 9 смен до 15-го и 12 смен после 15-го.
  const CYCLE = ['Выходной','Выходной','День','День','Ночь','Ночь'];
  const ANCHOR = new Date(2026,8,1);
  function shiftIndex(d){
    const day=Math.round((dateOnly(d)-ANCHOR)/86400000);
    return ((day%6)+6)%6;
  }
  function isWorkDay(d){ return CYCLE[shiftIndex(d)] !== 'Выходной'; }
  function countShifts(year, month, fromDay, toDay){
    let n=0;
    const last=new Date(year,month+1,0).getDate();
    for(let d=fromDay; d<=Math.min(toDay,last); d++) if(isWorkDay(new Date(year,month,d))) n++;
    return n;
  }
  function salaryForPeriod(year, month, half){
    const start=half===1?1:16;
    const end=half===1?15:new Date(year,month+1,0).getDate();
    return countShifts(year,month,start,end)*SHIFT_RATE;
  }
  function salaryEvents(today){
    const events=[];
    const y=today.getFullYear(),m=today.getMonth();
    for(let k=-2;k<=4;k++){
      const mm=m+k;
      const firstAmount=salaryForPeriod(y,mm,1);
      const secondAmount=salaryForPeriod(y,mm,2);
      events.push({date:new Date(y,mm,25),amount:firstAmount,label:`1–15 ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`});
      events.push({date:new Date(y,mm+1,10),amount:secondAmount,label:`16–${new Date(y,mm+1,0).getDate()} ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`});
    }
    return events.filter(e=>e.date>today).sort((a,b)=>a.date-b.date);
  }

  async function getTxs(){
    const r=await fetch(`${SB_URL}/rest/v1/transactions?select=*&order=date.desc`,{headers:H,cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,240)}`);
    return r.json();
  }

  function showSaveError(message){
    const btn=document.querySelector('#txForm .submit-btn');
    if(!btn) return;
    btn.disabled=false;
    btn.textContent='Ошибка: '+String(message).slice(0,100);
    setTimeout(()=>{btn.textContent='Добавить';},5000);
  }

  function resetTransientOnly(){
    ['txAmount','txComment','txShift'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    // Дату НЕ сбрасываем. Это критично для будущих операций.
  }

  function pendingRead(){ try{return JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');}catch{return [];} }
  function pendingWrite(a){ try{localStorage.setItem(PENDING_KEY,JSON.stringify(a));}catch{} }
  function queuePending(tx){
    const q=pendingRead();
    q.push({...tx,localId:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2)});
    pendingWrite(q);
  }
  async function flushPending(){
    const q=pendingRead(); if(!q.length)return;
    const left=[];
    for(const tx of q){
      const {localId,...payload}=tx;
      try{
        const r=await fetch(`${SB_URL}/rest/v1/transactions`,{method:'POST',headers:{...H,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
        if(!r.ok) throw new Error(await r.text());
      }catch{left.push({...tx,localId});}
    }
    pendingWrite(left);
  }

  async function saveFutureTransaction(event){
    if(!event || event.target?.id!=='txForm') return;
    const dateEl=document.getElementById('txDate');
    const amountEl=document.getElementById('txAmount');
    const categoryEl=document.getElementById('txCategory');
    const shiftEl=document.getElementById('txShift');
    const commentEl=document.getElementById('txComment');
    const typeButton=document.querySelector('.type-toggle button.active');
    if(!dateEl||!amountEl||!categoryEl||!typeButton)return;

    const date=dateEl.value;
    const amount=Number(amountEl.value);
    const type=typeButton.dataset.type;
    const category=categoryEl.value;
    const shift=shiftEl?.value||'';
    const comment=commentEl?.value.trim()||'';
    if(!date || !isFuture(date)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if(!Number.isFinite(amount)||amount<=0){showSaveError('некорректная сумма');return;}

    const btn=event.target.querySelector('.submit-btn');
    if(!btn||btn.disabled)return;
    const old=btn.textContent;
    btn.disabled=true;
    btn.textContent='Сохраняю…';
    const payload={date,type,category,amount,comment,shift};
    try{
      const r=await fetch(`${SB_URL}/rest/v1/transactions`,{method:'POST',headers:{...H,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,220)}`);
      const rows=await r.json();
      if(!Array.isArray(rows)||!rows[0])throw new Error('Supabase не вернул созданную запись');
      resetTransientOnly();
      btn.textContent='Сохранено ✓';
      setTimeout(()=>{btn.textContent=old;btn.disabled=false;},1400);
      const fresh=await getTxs();
      if(Array.isArray(window.txs)){window.txs.length=0;fresh.forEach(t=>window.txs.push(t));}
      if(typeof window.render==='function'){try{window.render();}catch(e){console.error(e);}}
      renderSalaryAwareHero(fresh);
    }catch(error){
      console.error('Копейка: ошибка сохранения будущей операции',error);
      // Никакой тихой очистки. Сохраняем введённые поля и ставим запись в очередь.
      queuePending(payload);
      if(Array.isArray(window.txs))window.txs.push({...payload,id:'local-'+Date.now()});
      showSaveError('облако недоступно; сохранено локально');
      if(typeof window.render==='function'){try{window.render();}catch(e){}}
    }
  }

  function renderSalaryAwareHero(txs){
    if(!Array.isArray(txs))return;
    const today=todayOnly(),upcoming=salaryEvents(today),next=upcoming[0];
    if(!next)return;
    const days=Math.max(1,Math.ceil((next.date-today)/86400000));
    const actualIncome=txs.filter(t=>isIncome(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const actualExpenses=txs.filter(t=>isExpense(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const actualSavings=txs.filter(t=>isSaving(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const balance=actualIncome-actualExpenses-actualSavings;

    const now=new Date();
    const monthTxs=txs.filter(t=>{const d=dateOnly(t.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();});
    const obligationsTotal=35700;
    const paidOblig=monthTxs.filter(t=>isExpense(t)&&t.category==='Обязательные платежи').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const obligLeft=Math.max(0,obligationsTotal-paidOblig);
    const debtTotal=15000;
    const paidDebt=monthTxs.filter(t=>isExpense(t)&&t.category==='Долг').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const debtLeft=Math.max(0,debtTotal-paidDebt);

    const spendable=Math.max(0,balance-obligLeft-debtLeft);
    const daily=spendable/days;
    const hero=document.getElementById('heroDaily'),sub=document.getElementById('heroSub'),box=document.getElementById('heroReserves');
    if(hero){hero.textContent=fmt(daily);hero.className='hero-value'+(daily<=0?' zero':'');}
    if(sub)sub.textContent=`${days} ${dayWord(days)} до следующей выплаты (${next.date.toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})}) · +${fmt(next.amount)} · ${next.label}`;
    if(!box)return;
    const pct=obligationsTotal?Math.min(100,Math.max(0,paidOblig/obligationsTotal*100)):0;
    box.innerHTML=`
      <div class="reserve-row" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span>Обязательные платежи</span><span class="reserve-amt">${fmt(paidOblig)} из ${fmt(obligationsTotal)}</span>
        </div>
        <div style="height:8px;border-radius:5px;background:var(--surface-2);overflow:hidden;border:1px solid var(--line)">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold-dim),var(--gold));border-radius:5px"></div>
        </div>
      </div>
      <div class="reserve-row"><span>Долг в этом месяце</span><span class="reserve-amt">${fmt(Math.min(paidDebt,debtTotal))} из ${fmt(debtTotal)}</span></div>`;
  }

  function boot(){
    const form=document.getElementById('txForm');
    if(form)form.addEventListener('submit',saveFutureTransaction,true);
    window.addEventListener('online',async()=>{await flushPending();try{renderSalaryAwareHero(await getTxs());}catch{}});
    const refresh=async()=>{
      try{await flushPending();renderSalaryAwareHero(await getTxs());}
      catch(e){console.error('Копейка fixes:',e);}
    };
    setTimeout(refresh,700);
    setInterval(refresh,30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
