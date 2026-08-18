/* kopeyka-pro.js v1 */
(function(){
'use strict';
var STATE_VER = 2;
function N(v){ return Number(v)||0; }
function arr(v){ return Array.isArray(v)?v:[]; }
function T(){ return typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10); }
function fmtMoney(kops){
  if(typeof fmt==='function') return fmt(kops);
  return Math.round(N(kops)/100).toLocaleString('ru-RU')+' \u20bd';
}
function migrateState(st){
  if(!st || typeof st!=='object') return st;
  var v = N(st.version)||1;
  if(!Array.isArray(st.debts)) st.debts = [];
  if(!Array.isArray(st.income)) st.income = [];
  if(!Array.isArray(st.expenses)) st.expenses = [];
  if(!Array.isArray(st.recurring)) st.recurring = [];
  if(!Array.isArray(st.reserves)) st.reserves = [];
  if(!Array.isArray(st.reserveOps)) st.reserveOps = [];
  if(!st.shiftsOverride || typeof st.shiftsOverride!=='object') st.shiftsOverride = {};
  if(!st.settings) st.settings = {};
  if(!Array.isArray(st.templates)) st.templates = defaultTemplates();
  if(v < 2) st.version = 2;
  st.version = Math.max(N(st.version), STATE_VER);
  return st;
}
function defaultTemplates(){
  return [
    {id:'t_food', kind:'expense', title:'\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u044b', amount:300000, mandatory:false},
    {id:'t_taxi', kind:'expense', title:'\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442', amount:50000, mandatory:false},
    {id:'t_comm', kind:'expense', title:'\u0421\u0432\u044f\u0437\u044c', amount:50000, mandatory:true},
    {id:'t_debt', kind:'debt', name:'\u0414\u043e\u043b\u0433', amount:500000},
    {id:'t_res', kind:'reserve', name:'\u041f\u043e\u0434\u0443\u0448\u043a\u0430', target:5000000, method:'fixed', fixedAmount:500000}
  ];
}
function ensureMigrated(){
  if(typeof STATE==='undefined'||!STATE) return;
  STATE = migrateState(STATE);
  if(!Array.isArray(STATE.templates) || !STATE.templates.length) STATE.templates = defaultTemplates();
}
function lockFinanceEngine(){
  if(typeof window.financeCore === 'function') window.computePeriodSummary = window.financeCore;
  if(window.computePeriodSummary && window.computePeriodSummary.__proLocked) return;
  var core = window.computePeriodSummary;
  if(typeof core === 'function'){
    core.__proLocked = true;
    window.computePeriodSummary = core;
    window.financeCore = core;
  }
}
function buildBreakdown(){
  ensureMigrated();
  var start, end;
  if(typeof currentPeriod==='function'){ var p=currentPeriod(); start=p.start; end=p.end; }
  else { var t=T(); start=t.slice(0,8)+'01'; end=t; }
  var s = typeof computePeriodSummary==='function' ? computePeriodSummary(STATE, start, end) : null;
  if(!s) return null;
  return {
    cash:N(s.currentBalance),
    planned:N(s.plannedRegular)+N(s.plannedObligatory),
    debts:N(s.debtsDue),
    reserves:N(s.reservesNeeded),
    available:N(s.strictAvailable!=null?s.strictAvailable:s.availableNow),
    expectedIncome:N(s.expectedIncome),
    forecast:N(s.forecastAfterReserves)
  };
}
function openBreakdown(){
  var b=buildBreakdown();
  if(!b||typeof showModal!=='function') return;
  var h='<div class="modal" style="max-width:420px">';
  h+=(typeof modalHeader==='function'?modalHeader('\u041e\u0442\u043a\u0443\u0434\u0430 \u00ab\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0441\u0435\u0439\u0447\u0430\u0441\u00bb'):'<h3>\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e</h3>');
  h+='<div class="pro-breakdown card" style="margin:0">';
  h+='<div class="row"><span>\u041a\u0430\u0441\u0441\u0430 (\u0444\u0430\u043a\u0442)</span><b>'+fmtMoney(b.cash)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0411\u0443\u0434\u0443\u0449\u0438\u0435 \u0440\u0430\u0441\u0445\u043e\u0434\u044b</span><b class="neg">\u2212'+fmtMoney(b.planned)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0412\u0441\u0435 \u0434\u043e\u043b\u0433\u0438</span><b class="neg">\u2212'+fmtMoney(b.debts)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0435\u0437\u0435\u0440\u0432\u044b \u043f\u0435\u0440\u0438\u043e\u0434\u0430</span><b class="neg">\u2212'+fmtMoney(b.reserves)+'</b></div>';
  h+='<div class="row total"><span>\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0441\u0435\u0439\u0447\u0430\u0441</span><b class="pos">'+fmtMoney(b.available)+'</b></div></div>';
  h+='<div class="faint" style="margin-top:12px">\u0420\u0435\u0437\u0435\u0440\u0432\u044b \u00ab\u043a \u0434\u0430\u0442\u0435\u00bb \u0441\u043b\u0435\u0434. \u043c\u0435\u0441\u044f\u0446\u0430 \u043d\u0435 \u0432\u0445\u043e\u0434\u044f\u0442. \u041e\u0436\u0438\u0434\u0430\u0435\u043c\u044b\u0439 \u0434\u043e\u0445\u043e\u0434: '+fmtMoney(b.expectedIncome)+'. \u041f\u0440\u043e\u0433\u043d\u043e\u0437: '+fmtMoney(b.forecast)+'.</div>';
  h+='<button class="btn btn-primary btn-block" style="margin-top:14px" id="proBdClose">\u041f\u043e\u043d\u044f\u0442\u043d\u043e</button></div>';
  showModal(h);
  var c=document.getElementById('proBdClose'); if(c) c.onclick=function(){ if(typeof closeModal==='function') closeModal(); };
}
function collectReminders(){
  ensureMigrated();
  var today=T(), list=[], tomorrow=typeof addDays==='function'?addDays(today,1):today;
  if(typeof getShift==='function'){
    [today,tomorrow].forEach(function(d){
      try{
        var sh=getShift(d,STATE);
        if(sh&&sh.type!=='off'&&sh.status!=='cancelled'&&sh.status!=='absence'){
          list.push({when:d===today?'\u0421\u0435\u0433\u043e\u0434\u043d\u044f':'\u0417\u0430\u0432\u0442\u0440\u0430', text:(sh.type==='night'?'\u041d\u043e\u0447\u043d\u0430\u044f':'\u0414\u043d\u0435\u0432\u043d\u0430\u044f')+' \u0441\u043c\u0435\u043d\u0430'+(sh.amount?(' \u00b7 '+fmtMoney(typeof shiftIncomeAmount==='function'?shiftIncomeAmount(sh):sh.amount)):'')});
        }
      }catch(_){}
    });
  }
  arr(STATE.recurring).filter(function(r){return r&&r.active;}).forEach(function(r){
    if(typeof occurrencesInRange==='function'){
      try{
        var end=typeof addDays==='function'?addDays(today,7):today;
        occurrencesInRange(r,today,end).forEach(function(d){
          list.push({when:d===today?'\u0421\u0435\u0433\u043e\u0434\u043d\u044f':d, text:(r.title||'\u041f\u043b\u0430\u0442\u0451\u0436')+' \u00b7 '+fmtMoney(r.amount)});
        });
      }catch(_){}
    }
  });
  arr(STATE.reserves).filter(function(r){return r&&r.active&&r.targetDate;}).forEach(function(r){
    var td=String(r.targetDate);
    if(td>=today&&td<=(typeof addDays==='function'?addDays(today,14):td)){
      var left=Math.max(0,N(r.target)-N(r.saved));
      if(left>0) list.push({when:td, text:'\u0420\u0435\u0437\u0435\u0440\u0432 \u00ab'+(r.name||'')+'\u00bb \u00b7 '+fmtMoney(left)});
    }
  });
  arr(STATE.debts).forEach(function(d){
    var left=Math.max(0,N(d.amount)-N(d.paid));
    if(left<=0||!d.dueDate) return;
    var dd=String(d.dueDate);
    if(dd>=today&&dd<=(typeof addDays==='function'?addDays(today,14):dd))
      list.push({when:dd, text:'\u0414\u043e\u043b\u0433 \u00ab'+(d.name||'')+'\u00bb \u00b7 '+fmtMoney(left)});
  });
  return list.slice(0,8);
}
function periodPulse(){
  ensureMigrated();
  if(typeof currentPeriod!=='function'||typeof getShift!=='function') return null;
  var p=currentPeriod(), today=T(), shiftsLeft=0, shiftsDone=0, incomeLeft=0, incomeDone=0;
  for(var d=p.start; d<=p.end; d=addDays(d,1)){
    var sh=getShift(d,STATE);
    if(!sh||sh.type==='off'||sh.status==='cancelled'||sh.status==='absence') continue;
    var amt=typeof shiftIncomeAmount==='function'?shiftIncomeAmount(sh):N(sh.amount);
    if(d<today){ shiftsDone++; incomeDone+=amt; } else { shiftsLeft++; incomeLeft+=amt; }
  }
  return {shiftsLeft:shiftsLeft, shiftsDone:shiftsDone, incomeLeft:incomeLeft, incomeDone:incomeDone, end:p.end};
}
function applyTemplate(t){
  ensureMigrated();
  if(!t) return;
  if(t.kind==='expense'){
    STATE.expenses=arr(STATE.expenses);
    STATE.expenses.push({id:typeof uid==='function'?uid():('id'+Date.now()), title:t.title||'\u0420\u0430\u0441\u0445\u043e\u0434', amount:N(t.amount), date:T(), mandatory:!!t.mandatory, category:'other', createdAt:new Date().toISOString()});
    if(typeof showToast==='function') showToast('\u0420\u0430\u0441\u0445\u043e\u0434 \u043f\u043e \u0448\u0430\u0431\u043b\u043e\u043d\u0443');
  } else if(t.kind==='debt'){
    STATE.debts=arr(STATE.debts);
    STATE.debts.push({id:typeof uid==='function'?uid():('id'+Date.now()), name:t.name||'\u0414\u043e\u043b\u0433', amount:N(t.amount), paid:0, dueDate:T(), comment:''});
    if(typeof showToast==='function') showToast('\u0414\u043e\u043b\u0433 \u043f\u043e \u0448\u0430\u0431\u043b\u043e\u043d\u0443');
  } else if(t.kind==='reserve'){
    STATE.reserves=arr(STATE.reserves);
    STATE.reserves.push({id:typeof uid==='function'?uid():('id'+Date.now()), name:t.name||'\u0420\u0435\u0437\u0435\u0440\u0432', target:N(t.target), saved:0, active:true, method:t.method||'fixed', fixedAmount:N(t.fixedAmount)||0, percent:N(t.percent)||0, priority:50});
    if(typeof showToast==='function') showToast('\u0420\u0435\u0437\u0435\u0440\u0432 \u043f\u043e \u0448\u0430\u0431\u043b\u043e\u043d\u0443');
  }
  if(typeof persist==='function') persist();
  else if(typeof saveState==='function'){ saveState(); if(typeof render==='function') render(); }
}
function openTemplates(){
  ensureMigrated();
  var h='<div class="modal" style="max-width:420px">';
  h+=(typeof modalHeader==='function'?modalHeader('\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u0448\u0430\u0431\u043b\u043e\u043d\u044b'):'<h3>\u0428\u0430\u0431\u043b\u043e\u043d\u044b</h3>');
  h+='<div class="faint" style="margin-bottom:10px">\u041e\u0434\u0438\u043d \u0442\u0430\u043f \u2014 \u0433\u043e\u0442\u043e\u0432\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c.</div>';
  arr(STATE.templates).forEach(function(t){
    var label=t.kind==='expense'?(t.title||'\u0420\u0430\u0441\u0445\u043e\u0434'):(t.kind==='debt'?(t.name||'\u0414\u043e\u043b\u0433'):(t.name||'\u0420\u0435\u0437\u0435\u0440\u0432'));
    var sub=t.kind==='expense'?fmtMoney(t.amount):(t.kind==='debt'?fmtMoney(t.amount):('\u0446\u0435\u043b\u044c '+fmtMoney(t.target)));
    h+='<button class="btn btn-secondary btn-block" style="margin-bottom:8px;text-align:left" data-tpl="'+t.id+'"><b>'+label+'</b><div class="faint">'+sub+'</div></button>';
  });
  h+='</div>'; showModal(h);
  document.querySelectorAll('[data-tpl]').forEach(function(btn){
    btn.onclick=function(){
      var t=arr(STATE.templates).find(function(x){return x.id===btn.getAttribute('data-tpl');});
      if(typeof closeModal==='function') closeModal();
      applyTemplate(t);
    };
  });
}
function analyticsData(){
  ensureMigrated();
  var today=T(), from=typeof addDays==='function'?addDays(today,-30):today, byCat={}, spent=0;
  arr(STATE.expenses).forEach(function(e){
    if(String(e.date)<from||String(e.date)>today) return;
    var c=e.category||e.title||'\u041f\u0440\u043e\u0447\u0435\u0435';
    byCat[c]=(byCat[c]||0)+N(e.amount); spent+=N(e.amount);
  });
  var cats=Object.keys(byCat).map(function(k){return {name:k,v:byCat[k]};}).sort(function(a,b){return b.v-a.v;}).slice(0,5);
  var shiftSum=0, shiftN=0;
  if(typeof getShift==='function'&&typeof addDays==='function'){
    for(var d=from;d<=today;d=addDays(d,1)){
      var sh=getShift(d,STATE);
      if(!sh||sh.type==='off'||sh.status==='cancelled'||sh.status==='absence') continue;
      shiftSum+=typeof shiftIncomeAmount==='function'?shiftIncomeAmount(sh):N(sh.amount); shiftN++;
    }
  }
  var resTarget=0, resSaved=0;
  arr(STATE.reserves).filter(function(r){return r&&r.active;}).forEach(function(r){ resTarget+=N(r.target); resSaved+=N(r.saved); });
  return {spent:spent, cats:cats, avgShift:shiftN?Math.round(shiftSum/shiftN):0, shiftN:shiftN, resPct:resTarget?Math.min(100,Math.round(resSaved/resTarget*100)):0, resSaved:resSaved, resTarget:resTarget};
}
function openAnalytics(){
  var a=analyticsData();
  var h='<div class="modal pro-analytics" style="max-width:440px">';
  h+=(typeof modalHeader==='function'?modalHeader('30 \u0434\u043d\u0435\u0439'):'<h3>30 \u0434\u043d\u0435\u0439</h3>');
  h+='<div class="card"><div class="label">\u041f\u043e\u0442\u0440\u0430\u0447\u0435\u043d\u043e</div><div class="metric neg">'+fmtMoney(a.spent)+'</div></div>';
  if(a.cats.length){
    h+='<div class="section-title">\u041a\u0443\u0434\u0430 \u0443\u0448\u043b\u0438</div><div class="card">';
    a.cats.forEach(function(c){
      var pct=a.spent?Math.round(c.v/a.spent*100):0;
      h+='<div class="row"><span>'+c.name+'</span><b>'+fmtMoney(c.v)+' \u00b7 '+pct+'%</b></div><div class="pro-bar"><i style="width:'+pct+'%"></i></div>';
    });
    h+='</div>';
  }
  h+='<div class="grid2"><div class="card card-tight"><div class="label">\u0421\u0440\u0435\u0434\u043d\u044f\u044f \u0441\u043c\u0435\u043d\u0430</div><div class="mid-number">'+fmtMoney(a.avgShift)+'</div><div class="faint">'+a.shiftN+' \u0441\u043c\u0435\u043d</div></div>';
  h+='<div class="card card-tight"><div class="label">\u0420\u0435\u0437\u0435\u0440\u0432\u044b</div><div class="mid-number">'+a.resPct+'%</div><div class="faint">'+fmtMoney(a.resSaved)+' / '+fmtMoney(a.resTarget)+'</div></div></div></div>';
  showModal(h);
}
function exportBackup(){
  ensureMigrated();
  var payload={app:'kopeyka', exportedAt:new Date().toISOString(), stateVersion:STATE.version||STATE_VER, state:STATE};
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kopeyka-backup-'+T()+'.json'; a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
  if(typeof showToast==='function') showToast('\u0411\u044d\u043a\u0430\u043f \u0441\u043a\u0430\u0447\u0430\u043d');
}
function importBackupFile(file){
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var data=JSON.parse(reader.result); var st=data.state||data;
      if(!st||typeof st!=='object') throw new Error('bad');
      st=migrateState(st);
      var apply=function(){ window.STATE=st; if(typeof saveState==='function') saveState(); if(typeof persist==='function') persist(); else if(typeof render==='function') render(); if(typeof showToast==='function') showToast('\u0414\u0430\u043d\u043d\u044b\u0435 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u044b'); };
      if(typeof confirmDelete==='function') confirmDelete('\u0417\u0430\u043c\u0435\u043d\u0438\u0442\u044c \u0432\u0441\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435?', apply);
      else if(confirm('\u0417\u0430\u043c\u0435\u043d\u0438\u0442\u044c \u0432\u0441\u0435 \u0434\u0430\u043d\u043d\u044b\u0435?')) apply();
    }catch(e){ if(typeof showToast==='function') showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0438\u043c\u043f\u043e\u0440\u0442\u0430'); console.error(e); }
  };
  reader.readAsText(file);
}
function injectHomeExtras(){
  var main=document.getElementById('main');
  if(!main||typeof ROUTE==='undefined'||ROUTE!=='home') return;
  if(document.getElementById('proHomeExtras')) return;
  var box=document.createElement('div'); box.id='proHomeExtras'; box.className='pro-block';
  var pulse=periodPulse(), reminds=collectReminders(), html='';
  if(pulse){
    html+='<div class="card"><div class="label">\u0414\u043e \u043a\u043e\u043d\u0446\u0430 \u043f\u0435\u0440\u0438\u043e\u0434\u0430</div>';
    html+='<div class="row"><span>\u0421\u043c\u0435\u043d \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c</span><b>'+pulse.shiftsLeft+'</b></div>';
    html+='<div class="row"><span>\u0415\u0449\u0451 \u0441\u043e \u0441\u043c\u0435\u043d</span><b class="pos">'+fmtMoney(pulse.incomeLeft)+'</b></div>';
    html+='<div class="row"><span>\u0423\u0436\u0435 \u043e\u0442\u0440\u0430\u0431\u043e\u0442\u0430\u043d\u043e</span><b>'+pulse.shiftsDone+' \u00b7 '+fmtMoney(pulse.incomeDone)+'</b></div></div>';
  }
  if(reminds.length){
    html+='<div class="section-title">\u041d\u0430 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0434\u043d\u0438</div><div class="card pro-remind"><ul style="margin:0;padding:0">';
    reminds.forEach(function(r){ html+='<li><div class="when">'+r.when+'</div><div>'+r.text+'</div></li>'; });
    html+='</ul></div>';
  }
  html+='<div class="pro-chip-row">';
  html+='<button type="button" class="pro-chip hot" id="proBdBtn">\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u043a\u0430 \u00ab\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u00bb</button>';
  html+='<button type="button" class="pro-chip" id="proTplBtn">\u0428\u0430\u0431\u043b\u043e\u043d\u044b</button>';
  html+='<button type="button" class="pro-chip" id="proAnBtn">30 \u0434\u043d\u0435\u0439</button></div>';
  box.innerHTML=html;
  var anchor=main.querySelector('.grid2')||main.querySelector('.card');
  if(anchor&&anchor.parentNode){
    if(anchor.classList.contains('grid2')&&anchor.nextSibling) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else main.appendChild(box);
  } else main.appendChild(box);
  var bd=document.getElementById('proBdBtn'); if(bd) bd.onclick=openBreakdown;
  var tp=document.getElementById('proTplBtn'); if(tp) tp.onclick=openTemplates;
  var an=document.getElementById('proAnBtn'); if(an) an.onclick=openAnalytics;
  main.querySelectorAll('.card.card-tight').forEach(function(card){
    var label=card.querySelector('.label');
    if(label&&/\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e/i.test(label.textContent||'')){ card.classList.add('pro-tap'); card.addEventListener('click', openBreakdown); }
  });
}
function injectSettingsExtras(){
  var main=document.getElementById('main');
  if(!main||typeof ROUTE==='undefined'||ROUTE!=='settings') return;
  if(document.getElementById('proSettingsExtras')) return;
  var box=document.createElement('div'); box.id='proSettingsExtras';
  box.innerHTML='<div class="section-title">\u041a\u043e\u043f\u0435\u0439\u043a\u0430 Pro</div><div class="card">'+
    '<button class="btn btn-secondary btn-block" id="proExp" style="margin-bottom:10px">\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0431\u044d\u043a\u0430\u043f (JSON)</button>'+
    '<button class="btn btn-secondary btn-block" id="proImp" style="margin-bottom:10px">\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0438\u0437 \u0444\u0430\u0439\u043b\u0430</button>'+
    '<input type="file" id="proImpFile" accept="application/json" style="display:none">'+
    '<button class="btn btn-secondary btn-block" id="proAn2" style="margin-bottom:10px">\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430 30 \u0434\u043d\u0435\u0439</button>'+
    '<button class="btn btn-secondary btn-block" id="proTpl2">\u0428\u0430\u0431\u043b\u043e\u043d\u044b</button>'+
    '<div class="faint" style="margin-top:12px">\u0412\u0435\u0440\u0441\u0438\u044f \u0434\u0430\u043d\u043d\u044b\u0445: '+(STATE&&STATE.version?STATE.version:STATE_VER)+'. \u0411\u044d\u043a\u0430\u043f \u0445\u0440\u0430\u043d\u0438 \u0443 \u0441\u0435\u0431\u044f.</div></div>';
  main.appendChild(box);
  document.getElementById('proExp').onclick=exportBackup;
  document.getElementById('proImp').onclick=function(){ document.getElementById('proImpFile').click(); };
  document.getElementById('proImpFile').onchange=function(e){ importBackupFile(e.target.files&&e.target.files[0]); e.target.value=''; };
  document.getElementById('proAn2').onclick=openAnalytics;
  document.getElementById('proTpl2').onclick=openTemplates;
}
function patchRender(){
  var orig=window.render;
  if(typeof orig!=='function'||orig.__pro) return;
  window.render=function(){
    ensureMigrated(); lockFinanceEngine();
    try{ orig.apply(this,arguments); }catch(e){ console.error(e); }
    try{ injectHomeExtras(); injectSettingsExtras(); }catch(e){ console.error('pro inject',e); }
  };
  window.render.__pro=true;
}
function boot(){
  ensureMigrated(); lockFinanceEngine(); patchRender();
  console.info('[kopeyka-pro] Check Supabase RLS: auth.uid() must match row owner.');
  setTimeout(function(){ lockFinanceEngine(); patchRender(); ensureMigrated(); },100);
  setTimeout(function(){ lockFinanceEngine(); patchRender(); if(typeof render==='function') render(); },500);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
window.kopeykaPro={openBreakdown:openBreakdown,openTemplates:openTemplates,openAnalytics:openAnalytics,exportBackup:exportBackup,importBackupFile:importBackupFile,migrateState:migrateState};
})();
