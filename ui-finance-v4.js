/* KOPEYKA UI + FINANCE MODEL v4.2 — hardened against missing fields */
(function(){'use strict';
const n=v=>Number(v)||0, fmtR=v=>fmt(Math.round(n(v))), kop=v=>Math.round(n(v)*100), rub=v=>Math.round(n(v)/100);
const today=()=>typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10);
const range=(d,s,e)=>{const x=String(d||'');return x>=String(s||'')&&x<=String(e||'')};
const arr=v=>Array.isArray(v)?v:[];

function safeState(){
  if(typeof STATE==='undefined'||!STATE)return null;
  if(!Array.isArray(STATE.debts))STATE.debts=[];
  if(!Array.isArray(STATE.income))STATE.income=[];
  if(!Array.isArray(STATE.expenses))STATE.expenses=[];
  if(!Array.isArray(STATE.recurring))STATE.recurring=[];
  if(!Array.isArray(STATE.reserves))STATE.reserves=[];
  if(!Array.isArray(STATE.reserveOps))STATE.reserveOps=[];
  if(!STATE.settings)STATE.settings={};
  return STATE;
}

function income(s,e){let got=0,exp=0;arr(STATE&&STATE.income).forEach(i=>{if(!range(i.date,s,e))return;i.status==='actual'?got+=n(i.amount):exp+=n(i.amount)});return{got,exp}}
function expenseTotals(s,e){let a=0,p=0,ao=0,po=0;const t=today();arr(STATE&&STATE.expenses).forEach(x=>{if(!range(x.date,s,e))return;const v=n(x.amount);if(x.mandatory){String(x.date)<=t?ao+=v:po+=v}else{String(x.date)<=t?a+=v:p+=v}});arr(STATE&&STATE.recurring).filter(r=>r&&r.active).forEach(r=>{try{if(typeof occurrencesInRange==='function')occurrencesInRange(r,s,e).forEach(d=>{const v=n(r.amount);String(d)<=t?ao+=v:po+=v})}catch(_){}});return{actual:a+ao,planned:p+po,actualRegular:a,plannedRegular:p,actualObligatory:ao,plannedObligatory:po}}
function debtTotals(s,e){let unpaid=0,paid=0;arr(STATE&&STATE.debts).forEach(d=>{const amount=n(d.amount),p=n(d.paid),left=Math.max(0,amount-p);if(left>0&&range(d.dueDate||e,s,e))unpaid+=left;if(p>0&&d.paidDate&&range(d.paidDate,s,e))paid+=Math.min(p,amount)});return{unpaid,paid}}
function reserveNeed(s,e,totalIncome){let due=0;const t=today();arr(STATE&&STATE.reserves).filter(r=>r&&r.active).forEach(r=>{let v=0;if(r.method==='fixed')v=n(r.fixedAmount);else if(r.method==='percent')v=totalIncome*n(r.percent)/100;else if(r.method==='target'&&r.targetDate){const left=Math.max(0,n(r.target)-n(r.saved));if(left>0&&String(r.targetDate)>=t){const days=Math.max(1,(typeof diffDays==='function'?diffDays(t,r.targetDate):1)+1),end=String(e)<String(r.targetDate)?e:r.targetDate;v=left*Math.max(0,(typeof diffDays==='function'?diffDays(t,end):0)+1)/days}}const dep=arr(STATE&&STATE.reserveOps).filter(o=>o&&o.reserveId===r.id&&o.type==='deposit'&&range(o.date,s,e)&&String(o.date)<=t).reduce((a,o)=>a+n(o.amount),0);due+=Math.max(0,Math.round(v)-dep)});return due}

function model(state,s,e){
  state=state||STATE||{};
  const inc=income(s,e),ex=expenseTotals(s,e),db=debtTotals(s,e),res=reserveNeed(s,e,inc.got+inc.exp);
  const base=n(state.settings&&state.settings.currentBalance);
  const t=today();
  const dep=arr(state.reserveOps).filter(o=>range(o.date,s,e)&&String(o.date)<=t&&o.type==='deposit').reduce((a,o)=>a+n(o.amount),0);
  const wd=arr(state.reserveOps).filter(o=>range(o.date,s,e)&&String(o.date)<=t&&o.type==='withdraw').reduce((a,o)=>a+n(o.amount),0);
  const cash=base+inc.got-ex.actual-db.paid-dep+wd;
  const forecast=cash+inc.exp-ex.planned-db.unpaid-res;
  const strict=cash-ex.planned-db.unpaid-res;
  const start=String(t)>String(s)?t:s;
  const days=String(e)<String(t)?0:(typeof diffDays==='function'?diffDays(start,e):0)+1;
  return{periodStart:s,periodEnd:e,remainingDays:days,actualShiftIncome:0,expectedShiftIncome:0,shiftsList:[],actualIncome:inc.got,expectedIncome:inc.exp,totalIncome:inc.got+inc.exp,actualRegular:ex.actualRegular,plannedRegular:ex.plannedRegular,totalRegular:ex.actualRegular+ex.plannedRegular,actualObligatory:ex.actualObligatory,plannedObligatory:ex.plannedObligatory,totalObligatory:ex.actualObligatory+ex.plannedObligatory,currentBalance:cash,availableNow:cash,forecastBeforeReserves:Math.max(0,cash+inc.exp-ex.planned-db.unpaid),forecastAfterReserves:Math.max(0,forecast),strictAvailable:Math.max(0,strict),reservesNeeded:res,debtsDue:db.unpaid,debtsPaid:db.paid,reserveDeposits:dep,reserveWithdrawals:wd,noReserveLimit:days?Math.max(0,Math.floor((cash+inc.exp-ex.planned-db.unpaid)/days)):0,safeLimit:days?Math.max(0,Math.floor(forecast/days)):0,strictLimit:days?Math.max(0,Math.floor(strict/days)):0};
}
window.computePeriodSummary=model;window.financeCore=model;

function expenseModal(id){
  if(!safeState())return;
  const existing=id?arr(STATE.expenses).find(x=>x.id===id):null;
  if(existing){let h='<div class="modal">'+modalHeader('Расход');h+='<div class="card"><div class="label">Сумма</div><div class="mid-number">−'+fmtR(existing.amount)+'</div><div class="label" style="margin-top:8px">'+esc(existing.title||'Расход')+' · '+fmtDateHuman(existing.date)+'</div></div><div class="modal-actions"><button class="btn btn-danger" id="eDelete">Удалить расход</button></div></div>';showModal(h);document.getElementById('eDelete').onclick=()=>confirmDelete('Удалить расход?',()=>{STATE.expenses=STATE.expenses.filter(x=>x.id!==id);closeModal();persist();render()});return}
  let h='<div class="modal">'+modalHeader('Добавить расход');h+=field('text','eTitle','Что купил / за что платёж','','');h+=field('number','eAmount','Сумма, ₽','','');h+=field('date','eDate','Дата',today(),'');h+='<label style="display:flex;align-items:center;gap:10px;margin:4px 0 16px;color:var(--text-dim);font-size:13px"><input id="eMandatory" type="checkbox"> Обязательный расход</label>';h+='<div class="modal-actions"><button class="btn btn-secondary" id="eCancel">Отмена</button><button class="btn btn-primary" id="eSave">Внести расход</button></div></div>';showModal(h);document.getElementById('eCancel').onclick=closeModal;document.getElementById('eSave').onclick=()=>{const title=document.getElementById('eTitle').value.trim()||'Расход',amount=kop(document.getElementById('eAmount').value),date=document.getElementById('eDate').value||today(),mandatory=document.getElementById('eMandatory').checked;if(amount<=0){showToast('Укажи сумму расхода');return}STATE.expenses=arr(STATE.expenses);STATE.expenses.push({id:uid(),title,amount,date,mandatory,category:'other',createdAt:new Date().toISOString()});closeModal();persist();render();showToast('Расход внесён')}}

function debtModal(id){
  if(!safeState())return;
  const d=id?arr(STATE.debts).find(x=>x.id===id):null;
  if(!d){const x={id:uid(),name:'',amount:0,paid:0,paidDate:'',dueDate:today(),comment:''};let h='<div class="modal">'+modalHeader('Добавить «Должен»');h+=field('text','dName','Кому / за что','','');h+=field('number','dAmount','Сумма, ₽','','');h+=field('date','dDue','Когда вернуть',today(),'');h+=field('text','dComment','Комментарий','','');h+='<div class="modal-actions"><button class="btn btn-primary btn-block" id="dSave">Сохранить</button></div></div>';showModal(h);document.getElementById('dSave').onclick=()=>{x.name=document.getElementById('dName').value.trim()||'Долг';x.amount=kop(document.getElementById('dAmount').value);x.dueDate=document.getElementById('dDue').value||today();x.comment=document.getElementById('dComment').value.trim();STATE.debts=arr(STATE.debts);STATE.debts.push(x);closeModal();persist();render()};return}
  const left=Math.max(0,n(d.amount)-n(d.paid));let h='<div class="modal">'+modalHeader('Долг: '+esc(d.name));h+='<div class="card"><div class="label">Осталось</div><div class="mid-number">'+fmtR(left)+'</div></div>';if(left>0)h+='<button class="btn btn-primary btn-block" id="dPay">Погасить долг</button>';else h+='<div class="card"><b>Погашен</b><div class="faint">'+(d.paidDate?'Погашен '+fmtDateHuman(d.paidDate):'')+'</div></div>';h+='<div class="modal-actions"><button class="btn btn-danger" id="dDel">Удалить</button></div></div>';showModal(h);if(left>0)document.getElementById('dPay').onclick=()=>{d.paid=n(d.amount);d.paidDate=today();d.status='paid';closeModal();persist();showToast('Долг погашен');render()};document.getElementById('dDel').onclick=()=>confirmDelete('Удалить долг?',()=>{STATE.debts=STATE.debts.filter(x=>x.id!==id);closeModal();persist();render()})
}

function renderHomeV4(){
  try{
    if(!safeState())return;
    const {start,end}=currentPeriod(),s=model(STATE,start,end);
    const saved=arr(STATE.reserves).reduce((a,r)=>a+n(r.saved),0);
    const deb=arr(STATE.debts).filter(d=>n(d.amount)>n(d.paid));
    let h='<div class="card hero"><div class="hero-top"><div class="display" style="font-weight:800;font-size:16px;">'+MONTHS_NOM[VIEW_MONTH.m-1]+' '+VIEW_MONTH.y+'</div><div class="period-switch"><button data-act="prevmonth">‹</button><button data-act="nextmonth">›</button></div></div><div class="spend-today"><div class="label">Можно тратить сегодня</div><div class="big-number pos">'+fmtR(s.safeLimit)+'</div><div class="faint">после обязательств, резервов и долгов</div></div></div><div class="grid2">'+statCard('Доступно сейчас',fmtR(s.strictAvailable),'с учётом расходов, обязательных платежей и долгов',[],'')+statCard('Получено',fmtR(s.actualIncome),'введённый тобой доход',[],'income')+'</div><div class="grid2">'+statCard('Ожидается',fmtR(s.expectedIncome),'ещё не получено',[],'income')+statCard('Расходы',fmtR(s.actualRegular+s.actualObligatory),'уже потрачено',[['Будущие',fmtR(s.plannedRegular+s.plannedObligatory)]],'expenses')+'</div><div class="grid2">'+statCard('Резервы',fmtR(saved),'накоплено',[['Нужно отложить',fmtR(s.reservesNeeded)]],'reserves')+statCard('Должен',fmtR(deb.reduce((a,d)=>a+Math.max(0,n(d.amount)-n(d.paid)),0)),'не погашено',[['Погашено',fmtR(s.debtsPaid)]],'reserves')+'</div>';
    document.getElementById('main').innerHTML=h;
    const prev=document.querySelector('[data-act=prevmonth]');if(prev)prev.onclick=()=>shiftPeriod(-1);
    const next=document.querySelector('[data-act=nextmonth]');if(next)next.onclick=()=>shiftPeriod(1);
  }catch(e){console.error('renderHomeV4',e);if(typeof renderHome==='function')try{renderHome()}catch(_){}}
}

function renderIncomeV4(){
  try{
    if(!safeState())return;
    const {start,end}=currentPeriod(),s=model(STATE,start,end);
    let h='<div class="grid2">'+statCard('Получено',fmtR(s.actualIncome),'только вручённый доход',[],'')+statCard('Ожидается',fmtR(s.expectedIncome),'ещё не получено',[],'')+'</div><div class="card" style="text-align:center"><div class="label">Всего дохода за период</div><div class="mid-number">'+fmtR(s.totalIncome)+'</div></div><div class="section-title">Введённый доход</div><div class="card">';
    const list=arr(STATE.income).filter(i=>range(i.date,start,end));
    if(!list.length)h+=emptyState('Доходов пока нет','💰');else list.forEach(i=>{h+=itemRow('💰',i.title||'Доход',fmtDateHuman(i.date)+' · '+(i.status==='actual'?'получено':'ожидается'),fmtR(i.amount),'income:'+i.id)});
    h+='</div><button class="btn btn-primary btn-block" id="addIncomeV4">+ Добавить доход</button>';
    document.getElementById('main').innerHTML=h;bindListClicks();
    const btn=document.getElementById('addIncomeV4');if(btn)btn.onclick=()=>openIncomeModal();
  }catch(e){console.error('renderIncomeV4',e)}
}

function renderExpensesV4(){
  try{
    if(!safeState())return;
    const {start,end}=currentPeriod(),s=model(STATE,start,end);
    let h='<div class="grid2">'+statCard('Потрачено',fmtR(s.actualRegular+s.actualObligatory),'уже ушло',[],'')+statCard('Запланировано',fmtR(s.plannedRegular+s.plannedObligatory),'будущие расходы',[],'')+'</div><div class="section-title">Расходы</div><div class="card">';
    const list=arr(STATE.expenses).filter(e=>range(e.date,start,end));
    if(!list.length)h+=emptyState('Расходов пока нет','🛒');else list.forEach(e=>h+=itemRow('🛒',e.title,fmtDateHuman(e.date)+(e.mandatory?' · обязательный':''),'−'+fmtR(e.amount),'expense:'+e.id));
    h+='</div><button class="btn btn-primary btn-block" id="addExpenseV4">+ Внести расход</button>';
    document.getElementById('main').innerHTML=h;bindListClicks();
    const btn=document.getElementById('addExpenseV4');if(btn)btn.onclick=()=>expenseModal();
  }catch(e){console.error('renderExpensesV4',e)}
}

function renderReservesV4(){
  try{
    if(!safeState())return;
    const {start,end}=currentPeriod(),s=model(STATE,start,end);
    const saved=arr(STATE.reserves).reduce((a,r)=>a+n(r.saved),0);
    const deb=arr(STATE.debts).filter(d=>n(d.amount)>n(d.paid));
    let h='<div class="grid2">'+statCard('Доступно сейчас',fmtR(s.strictAvailable),'с учётом расходов, обязательных платежей и долгов',[],'')+statCard('Можно тратить в день',fmtR(s.safeLimit),'после будущих обязательств',[],'')+'</div><div class="card"><div class="row"><span>Получено</span><b class="pos">'+fmtR(s.actualIncome)+'</b></div><div class="row"><span>Потрачено</span><b class="neg">−'+fmtR(s.actualRegular+s.actualObligatory)+'</b></div><div class="row"><span>Ожидается</span><b>+'+fmtR(s.expectedIncome)+'</b></div><div class="row"><span>Будущие расходы</span><b class="neg">−'+fmtR(s.plannedRegular+s.plannedObligatory)+'</b></div><div class="row"><span>Должен</span><b class="neg">−'+fmtR(deb.reduce((a,d)=>a+Math.max(0,n(d.amount)-n(d.paid)),0))+'</b></div><div class="row"><span>Нужно отложить</span><b class="neg">−'+fmtR(s.reservesNeeded)+'</b></div><div class="row" style="margin-top:10px"><strong>Остаток по плану</strong><strong>'+fmtR(s.forecastAfterReserves)+'</strong></div></div><div class="section-title">Должен</div><div class="card">';
    if(!deb.length)h+='<div class="faint">Долгов нет</div>';
    deb.forEach(d=>{const left=Math.max(0,n(d.amount)-n(d.paid));h+='<div class="item" data-debt-v4="'+d.id+'"><div class="ico">💰</div><div class="body"><div class="title">'+esc(d.name||'Долг')+'</div><div class="sub">'+(d.dueDate?'до '+fmtDateHuman(d.dueDate):'без срока')+'</div></div><div class="amt">'+fmtR(left)+'</div></div>'});
    h+='<button class="btn btn-secondary btn-block" id="addDebtV4">+ Добавить «Должен»</button></div><div class="section-title">Резервы</div>';
    if(!arr(STATE.reserves).length)h+='<div class="card">'+emptyState('Резервов пока нет','💰')+'</div>';
    else arr(STATE.reserves).forEach(r=>{h+='<div class="card" data-open="reserve:'+r.id+'"><div class="row"><b>'+esc(r.name)+'</b><span>'+fmtR(r.saved)+' / '+fmtR(r.target)+'</span></div><div class="progress"><div style="width:'+(r.target?Math.min(100,n(r.saved)/n(r.target)*100):0)+'%"></div></div></div>'});
    document.getElementById('main').innerHTML=h;
    document.querySelectorAll('[data-debt-v4]').forEach(x=>x.onclick=()=>debtModal(x.dataset.debtV4));
    const addD=document.getElementById('addDebtV4');if(addD)addD.onclick=()=>debtModal();
    document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openReserveModal(x.dataset.open.slice(8)));
  }catch(e){console.error('renderReservesV4',e)}
}

function patchRender(){
  try{
    const orig=window.render;
    window.render=function(){
      try{
        if(typeof renderNav==='function')renderNav();
        if(ROUTE==='home')renderHomeV4();
        else if(ROUTE==='income')renderIncomeV4();
        else if(ROUTE==='expenses')renderExpensesV4();
        else if(ROUTE==='reserves')renderReservesV4();
        else if(typeof orig==='function')orig.apply(this,arguments);
      }catch(e){
        console.error('patched render',e);
        if(typeof orig==='function')try{orig.apply(this,arguments)}catch(_){}
      }
    };
    window.render.__v42=true;
    window.render();
  }catch(e){console.error('patchRender failed',e)}
}
setTimeout(patchRender,0);
})();
