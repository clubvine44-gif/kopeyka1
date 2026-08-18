/* KOPEYKA — finance compatibility + Notes + Undo */
(function(){
'use strict';
/* Compatibility layer: ui-finance-v4.js replaces computePeriodSummary with a smaller object.
   Legacy screens still expect reserveBreakdown/allocation and manual-income fields. */
(function(){
  var N=function(v){return Number(v)||0};
  var T=function(){return typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10)};
  var IR=function(d,s,e){var x=String(d||'');return x>=String(s||'')&&x<=String(e||'')};
  var DD=function(a,b){if(typeof diffDays==='function')return diffDays(a,b);var x=new Date(a),y=new Date(b);return Math.round((y-x)/86400000)};
  function arr(v){return Array.isArray(v)?v:[]}
  function reserveNeed(r,s,e,totalIncome,state){
    var today=T(), need=0, target=N(r.target), saved=N(r.saved);
    if(r.method==='fixed') need=N(r.fixedAmount);
    else if(r.method==='percent') need=totalIncome*N(r.percent)/100;
    else if(r.method==='target'&&r.targetDate){
      var left=Math.max(0,target-saved);
      if(left>0&&String(r.targetDate)>=today){
        var end=String(e)<String(r.targetDate)?e:r.targetDate;
        if(String(end)>=today){
          var total=Math.max(1,DD(today,r.targetDate)+1), part=Math.max(1,DD(today,end)+1);
          need=left*part/total;
        }
      }
    }
    var ops=arr(state.reserveOps); if(!ops.length)ops=arr(state.reserve_ops);
    var dep=ops.filter(function(o){return o&&o.reserveId===r.id&&o.type==='deposit'&&IR(o.date,s,e)&&String(o.date)<=today;}).reduce(function(a,o){return a+N(o.amount)},0);
    return Math.max(0,Math.round(need)-dep);
  }
  window.computePeriodSummary=function(state,s,e){
    state=state||{}; var income=arr(state.income), expenses=arr(state.expenses), recurring=arr(state.recurring), debts=arr(state.debts), reserves=arr(state.reserves);
    var actualManualIncome=income.filter(function(i){return IR(i.date,s,e)&&i.status==='actual'}).reduce(function(a,i){return a+N(i.amount)},0);
    var expectedManualIncome=income.filter(function(i){return IR(i.date,s,e)&&i.status!=='actual'}).reduce(function(a,i){return a+N(i.amount)},0);
    var actualRegular=0,plannedRegular=0,actualObligatory=0,plannedObligatory=0,today=T();
    expenses.forEach(function(x){if(!IR(x.date,s,e))return;var v=N(x.amount);if(x.mandatory){if(String(x.date)<=today)actualObligatory+=v;else plannedObligatory+=v}else{if(String(x.date)<=today)actualRegular+=v;else plannedRegular+=v}});
    if(typeof occurrencesInRange==='function') recurring.filter(function(r){return r.active}).forEach(function(r){try{occurrencesInRange(r,s,e).forEach(function(d){var v=N(r.amount);if(String(d)<=today)actualObligatory+=v;else plannedObligatory+=v})}catch(_) {}});
    var actualIncome=actualManualIncome, expectedIncome=expectedManualIncome;
    var paidDebts=0,unpaidDebts=0; debts.forEach(function(d){var amount=N(d.amount),paid=N(d.paid),left=Math.max(0,amount-paid),due=d.dueDate||e;if(left>0&&IR(due,s,e))unpaidDebts+=left;if(paid>0)paidDebts+=Math.min(paid,amount)});
    var ops=arr(state.reserveOps);if(!ops.length)ops=arr(state.reserve_ops);
    var reserveDeposits=ops.filter(function(o){return o&&o.type==='deposit'&&IR(o.date,s,e)&&String(o.date)<=today;}).reduce(function(a,o){return a+N(o.amount)},0);
    var reserveWithdrawals=ops.filter(function(o){return o&&o.type==='withdraw'&&IR(o.date,s,e)&&String(o.date)<=today;}).reduce(function(a,o){return a+N(o.amount)},0);
    var reservesNeeded=0,reserveBreakdown=[];reserves.filter(function(r){return r.active}).forEach(function(r){var need=reserveNeed(r,s,e,actualIncome+expectedIncome,state);reservesNeeded+=need;reserveBreakdown.push({reserve:r,need:need})});
    var settings=state.settings||{},base=N(settings.currentBalance!=null?settings.currentBalance:state.current_balance),cash=base+actualIncome-actualRegular-actualObligatory-paidDebts-reserveDeposits+reserveWithdrawals;
    var noReservePool=Math.max(0,cash+expectedIncome-plannedRegular-plannedObligatory-unpaidDebts),forecastBeforeReserves=noReservePool;
    var forecastAfterReserves=Math.max(0,noReservePool-reservesNeeded),strictAvailable=Math.max(0,cash-plannedRegular-plannedObligatory-unpaidDebts-reservesNeeded);
    var start=String(today)>String(s)?today:s,days=String(e)<String(today)?0:Math.max(0,DD(start,e)+1),allocation=[],leftPool=forecastBeforeReserves;
    reserveBreakdown.slice().sort(function(a,b){return (a.reserve.priority||99)-(b.reserve.priority||99)}).forEach(function(x){var allocated=Math.min(x.need,Math.max(0,leftPool));leftPool-=allocated;allocation.push({reserve:x.reserve,need:x.need,allocated:allocated,deficit:Math.max(0,x.need-allocated)})});
    return {periodStart:s,periodEnd:e,remainingDays:days,shiftsList:[],actualShiftIncome:0,expectedShiftIncome:0,actualManualIncome:actualManualIncome,expectedManualIncome:expectedManualIncome,actualIncome:actualIncome,expectedIncome:expectedIncome,totalIncome:actualIncome+expectedIncome,actualRegular:actualRegular,plannedRegular:plannedRegular,totalRegular:actualRegular+plannedRegular,actualObligatory:actualObligatory,plannedObligatory:plannedObligatory,totalObligatory:actualObligatory+plannedObligatory,reservesNeeded:reservesNeeded,reserveBreakdown:reserveBreakdown,allocation:allocation,currentBalance:cash,availableNow:cash,forecastBeforeReserves:forecastBeforeReserves,forecastAfterReserves:forecastAfterReserves,strictAvailable:strictAvailable,noReserveLimit:days?Math.floor(noReservePool/days):null,safeLimit:days?Math.floor(forecastAfterReserves/days):null,strictLimit:days?Math.floor(strictAvailable/days):null,debtsDue:unpaidDebts,debtsPaid:paidDebts,reserveDeposits:reserveDeposits,reserveWithdrawals:reserveWithdrawals};
  };
  window.financeCore=window.computePeriodSummary;
})();

var HKEY='kopeyka_undo_history_v1', NKEY='kopeyka_notes_v1', MAX=20, restoring=false, lastSnapshot=null;
function clone(x){try{return JSON.parse(JSON.stringify(x))}catch(e){return null}}
function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return false}}
function readH(){try{var v=JSON.parse(localStorage.getItem(HKEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function writeH(v){try{localStorage.setItem(HKEY,JSON.stringify(v.slice(-MAX)))}catch(e){}}
function historyLabel(a,b){if(!a||!b)return'Изменение данных';var g=[['debts','Долг'],['income','Доход'],['expenses','Расход'],['reserves','Резерв'],['reserveOps','Операция резерва'],['shiftsOverride','Смена'],['recurring','Обязательный платёж'],['settings','Настройки']];for(var i=0;i<g.length;i++)if(!same(a[g[i][0]],b[g[i][0]]))return g[i][1];return'Изменение данных'}
lastSnapshot=clone(typeof STATE!=='undefined'?STATE:null);
if(typeof window.persist==='function'){
  var origPersist=window.persist;
  window.persist=function(){if(!restoring){var cur=clone(STATE);if(cur&&lastSnapshot&&!same(lastSnapshot,cur)){var h=readH();h.push(lastSnapshot);writeH(h)}lastSnapshot=cur}return origPersist.apply(this,arguments)};
}
window.kopeykaOpenUndo=function(){var list=readH(),current=clone(window.STATE),h='<div class="modal" style="max-width:420px;">'+modalHeader('Отменить действие');if(!list.length){h+=emptyState('Нет действий для отмены','↶')+'</div>';showModal(h);return}h+='<div class="faint" style="margin:0 0 12px">Выбери действие — приложение вернёт данные к состоянию до него.</div><div id="koUndoRows"></div></div>';showModal(h);var rows=document.getElementById('koUndoRows');for(var i=list.length-1;i>=0;i--)(function(idx){var after=idx===list.length-1?current:list[idx+1],row=document.createElement('button');row.type='button';row.className='btn btn-secondary btn-block';row.style.cssText='text-align:left;margin-bottom:8px;display:block';row.innerHTML='<b>'+esc(historyLabel(list[idx],after))+'</b><div class="faint" style="margin-top:3px">Вернуть данные до этого действия</div>';row.addEventListener('click',function(){confirmDelete('Отменить это действие и все изменения после него?',function(){var h2=readH(),target=h2[idx];if(!target)return;restoring=true;window.STATE=clone(target);writeH(h2.slice(0,idx));lastSnapshot=clone(window.STATE);restoring=false;persist();closeModal();render();showToast('Действие отменено')})});rows.appendChild(row)})(i)};
function readN(){try{var v=JSON.parse(localStorage.getItem(NKEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function writeN(v){try{localStorage.setItem(NKEY,JSON.stringify(v))}catch(e){}}
window.renderNotes=function(){var notes=readN(),h='<div class="card"><div class="section-title" style="margin-top:0">Новая заметка</div><div class="field"><textarea id="noteText" rows="3" placeholder="Напиши что-нибудь…" style="width:100%;resize:vertical"></textarea></div><button class="btn btn-primary btn-block" id="noteAdd">Добавить заметку</button></div><div class="section-title">Мои заметки</div>';if(!notes.length)h+=emptyState('Заметок пока нет','📝');else{h+='<div>';notes.slice().reverse().forEach(function(nt,ri){var real=notes.length-1-ri;h+='<div class="card card-tight" style="margin-bottom:8px"><div style="white-space:pre-wrap;line-height:1.45">'+esc(nt.text)+'</div><div class="faint" style="margin-top:8px">'+new Date(nt.ts).toLocaleString('ru-RU')+'</div><button class="btn btn-ghost" style="padding-left:0" data-del-note="'+real+'">Удалить</button></div>'});h+='</div>'}document.getElementById('main').innerHTML=h;var add=document.getElementById('noteAdd');if(add)add.addEventListener('click',function(){var ta=document.getElementById('noteText'),t=ta.value.trim();if(!t)return;if(t.length>2000){showToast('Заметка слишком длинная');return}var a=readN();a.push({text:t,ts:new Date().toISOString()});writeN(a);window.renderNotes()});document.querySelectorAll('[data-del-note]').forEach(function(b){b.addEventListener('click',function(){var a=readN();a.splice(Number(b.dataset.delNote),1);writeN(a);window.renderNotes()})})};
})();