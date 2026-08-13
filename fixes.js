/* Копейка — targeted fixes */
(() => {
  'use strict';
  const SB_URL = 'https://cqslrfphsjllhltsvvuq.supabase.co';
  const SB_KEY = 'sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
  const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const fmt = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
  const dayWord = n => { const a=n%10,b=n%100; return a===1&&b!==11?'день':([2,3,4].includes(a)&&![12,13,14].includes(b)?'дня':'дней'); };

  async function getTxs(){
    const r = await fetch(`${SB_URL}/rest/v1/transactions?select=*&order=date.asc`, {headers:H, cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }
  const dateOnly = s => { const [y,m,d]=String(s).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); };
  const isFuture = d => dateOnly(d) > new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
  const isIncome = t => t.type === 'Доход' && t.category !== 'Накопление';
  const isSaving = t => t.type === 'Доход' && t.category === 'Накопление';
  const isExpense = t => t.type === 'Расход';

  function salaryEvents(today){
    const y=today.getFullYear(), m=today.getMonth(), d=today.getDate();
    const events=[];
    for(let k=-2;k<=2;k++){
      const mm=m+k;
      events.push({date:new Date(y,mm,25), amount:49000, label:`1–15 ${new Date(y,mm,1).toLocaleDateString('ru-RU',{month:'long'})}`});
      events.push({date:new Date(y,mm,10), amount:49000, label:`15–${new Date(y,mm,0).getDate()} ${new Date(y,mm-1,1).toLocaleDateString('ru-RU',{month:'long'})}`});
    }
    return events.filter(e=>e.date>=new Date(y,m-1,d)).sort((a,b)=>a.date-b.date);
  }

  function renderSalaryAwareHero(txs){
    const now = new Date();
    const today0 = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const actualIncome = txs.filter(t=>isIncome(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const actualExpenses = txs.filter(t=>isExpense(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const actualSavings = txs.filter(t=>isSaving(t)&&!isFuture(t.date)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const actualBalance = actualIncome - actualExpenses - actualSavings;
    const upcoming = salaryEvents(today0).filter(e=>e.date>today0);
    const next = upcoming[0];
    if(!next) return;
    const days = Math.max(1, Math.ceil((next.date-today0)/86400000));
    const monthTxs = txs.filter(t=>{const d=dateOnly(t.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();});
    const paidOblig = monthTxs.filter(t=>isExpense(t)&&t.category==='Обязательные платежи').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const obligationsTotal = 35700;
    const obligLeft = Math.max(0, obligationsTotal-paidOblig);
    const paidDebt = monthTxs.filter(t=>isExpense(t)&&t.category==='Долг').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const debtLeft = Math.max(0,15000-paidDebt);
    const spendableNow = Math.max(0, actualBalance - obligLeft - debtLeft);
    const daily = spendableNow / days;

    const hero=document.getElementById('heroDaily');
    const sub=document.getElementById('heroSub');
    if(hero){hero.textContent=fmt(daily);hero.className='hero-value'+(daily<=0?' zero':'');}
    if(sub) sub.textContent=`${days} ${dayWord(days)} до следующей выплаты (${next.date.toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})}) · +${fmt(next.amount)}`;
    const box=document.getElementById('heroReserves');
    if(!box) return;
    const pct = Math.min(100, obligationsTotal ? Math.max(0,paidOblig/obligationsTotal*100) : 0);
    box.innerHTML = `
      <div class="reserve-row" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span>Обязательные платежи</span>
          <span class="reserve-amt">${fmt(paidOblig)} из ${fmt(obligationsTotal)}</span>
        </div>
        <div style="height:8px;border-radius:5px;background:var(--surface-2);overflow:hidden;border:1px solid var(--line)">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold-dim),var(--gold));border-radius:5px;transition:width .3s"></div>
        </div>
      </div>
      <div class="reserve-row"><span>Долг в этом месяце</span><span class="reserve-amt">${fmt(Math.min(paidDebt,15000))} из ${fmt(15000)}</span></div>
    `;
  }

  function resetFormKeepDate(){
    const a=document.getElementById('txAmount'), c=document.getElementById('txComment'), s=document.getElementById('txShift');
    if(a) a.value=''; if(c)c.value=''; if(s)s.value='';
  }

  async function saveFutureIncome(e){
    if(e.target.id!=='txForm') return;
    const typeBtn=[...document.querySelectorAll('.type-toggle button.active')][0];
    if(!typeBtn || typeBtn.dataset.type!=='Доход') return;
    const date=document.getElementById('txDate').value;
    const amount=Number(document.getElementById('txAmount').value);
    const category=document.getElementById('txCategory').value;
    const comment=document.getElementById('txComment').value.trim();
    const shift=document.getElementById('txShift').value;
    if(!date || !Number.isFinite(amount) || amount<=0) return;
    if(dateOnly(date) <= new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const btn=e.target.querySelector('.submit-btn');
    const old=btn.textContent; btn.disabled=true; btn.textContent='Сохраняю…';
    try{
      const r=await fetch(`${SB_URL}/rest/v1/transactions`,{method:'POST',headers:{...H,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({date,type:'Доход',category,amount,comment,shift})});
      if(!r.ok){const txt=await r.text();throw new Error(`HTTP ${r.status}: ${txt.slice(0,160)}`);}
      resetFormKeepDate();
      btn.textContent='Сохранено ✓';
      setTimeout(()=>{btn.textContent=old;btn.disabled=false;},1800);
      const txs=await getTxs();
      renderSalaryAwareHero(txs);
      if(typeof window.render==='function') window.render();
    }catch(err){
      btn.disabled=false; btn.textContent='Ошибка сохранения';
      setTimeout(()=>btn.textContent=old,3000);
      console.error(err);
    }
  }

  function patchFormReset(){
    const form=document.getElementById('txForm');
    if(form) form.addEventListener('submit', saveFutureIncome, true);
  }

  async function boot(){
    patchFormReset();
    try{
      const txs=await getTxs();
      renderSalaryAwareHero(txs);
      const observer=new MutationObserver(()=>{
        clearTimeout(observer._t);
        observer._t=setTimeout(async()=>{try{renderSalaryAwareHero(await getTxs())}catch(e){}},250);
      });
      const target=document.getElementById('heroReserves');
      if(target) observer.observe(target,{childList:true,subtree:true});
      setInterval(async()=>{try{renderSalaryAwareHero(await getTxs())}catch(e){}},30000);
    }catch(e){console.error('Копейка fixes:',e)}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
