/* unified.js v1 — shell + pro, no ui-finance-v4 */
(function(){
'use strict';
var OPEN=false, historyStack=[], lastRoute=null;
var swipe={x0:0,y0:0,t0:0,active:false};
var items=[
  {id:'calendar',label:'\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c',icon:'calendar'},
  {id:'income',label:'\u0414\u043e\u0445\u043e\u0434\u044b',icon:'income'},
  {id:'expenses',label:'\u0420\u0430\u0441\u0445\u043e\u0434\u044b',icon:'expenses'},
  {id:'reserves',label:'\u0420\u0435\u0437\u0435\u0440\u0432\u044b',icon:'reserves'},
  {id:'notes',label:'\u0417\u0430\u043c\u0435\u0442\u043a\u0438',icon:'notes'},
  {id:'settings',label:'\u0415\u0449\u0451',icon:'settings'},
  {id:'__add__',label:'\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c',icon:'add'}
];
function isMobile(){return window.matchMedia('(max-width:899px)').matches}
function ensureDom(){
  if(document.getElementById('shellNavBackdrop'))return;
  var bd=document.createElement('div');bd.id='shellNavBackdrop';bd.className='shell-nav-backdrop';bd.onclick=closeNav;
  var arc=document.createElement('div');arc.id='shellNavArc';arc.className='shell-nav-arc';
  document.body.appendChild(bd);document.body.appendChild(arc);
}
function iconSvg(name){
  if(typeof ICONS!=='undefined'&&ICONS[name])return ICONS[name];
  if(name==='add')return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/></svg>';
}
function goRoute(id){
  if(typeof ROUTE==='undefined')return;
  if(ROUTE===id)return;
  historyStack.push(ROUTE);
  if(historyStack.length>30)historyStack.shift();
  ROUTE=id;window.scrollTo(0,0);
  if(typeof render==='function')render();
}
function openNav(){
  ensureDom();OPEN=true;
  document.getElementById('shellNavBackdrop').classList.add('open');
  var arc=document.getElementById('shellNavArc');arc.classList.add('open');arc.innerHTML='';
  var n=items.length, start=-Math.PI*0.92, end=Math.PI*0.92;
  items.forEach(function(it,i){
    var t=n===1?0.5:i/(n-1), ang=start+(end-start)*t;
    var r=isMobile()?112:130, x=Math.sin(ang)*r, y=-Math.cos(ang)*r;
    var b=document.createElement('button');b.type='button';b.className='shell-nav-item';
    b.style.transform='translate(calc(-50% + '+x+'px), calc(-50% + '+y+'px))';
    b.innerHTML='<span class="shell-ico">'+iconSvg(it.icon)+'</span><span class="shell-lab">'+it.label+'</span>';
    b.onclick=function(){
      closeNav();
      if(it.id==='__add__'){ if(typeof openFabMenu==='function')openFabMenu(); return; }
      goRoute(it.id);
    };
    arc.appendChild(b);
  });
  var fab=document.getElementById('fabBtn'); if(fab) fab.classList.add('open');
}
function closeNav(){
  OPEN=false;
  var bd=document.getElementById('shellNavBackdrop'); if(bd) bd.classList.remove('open');
  var arc=document.getElementById('shellNavArc'); if(arc) arc.classList.remove('open');
  var fab=document.getElementById('fabBtn'); if(fab) fab.classList.remove('open');
}
function wireFab(){
  var fab=document.getElementById('fabBtn');
  if(!fab||fab.__shellWired)return;
  fab.__shellWired=true;
  var neo=fab.cloneNode(true); fab.parentNode.replaceChild(neo,fab); neo.__shellWired=true;
  neo.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); if(OPEN)closeNav(); else openNav(); });
}
function wireSwipe(){
  if(window.__shellSwipe)return; window.__shellSwipe=true;
  document.addEventListener('touchstart',function(e){
    if(!e.touches||!e.touches.length)return;
    var t=e.touches[0]; swipe={x0:t.clientX,y0:t.clientY,t0:Date.now(),active:t.clientX<28};
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(!swipe.active)return; swipe.active=false;
    var t=e.changedTouches&&e.changedTouches[0]; if(!t)return;
    var dx=t.clientX-swipe.x0, dy=Math.abs(t.clientY-swipe.y0), dt=Date.now()-swipe.t0;
    if(dx>72&&dy<50&&dt<500){
      if(historyStack.length){ var prev=historyStack.pop(); ROUTE=prev; window.scrollTo(0,0); if(typeof render==='function')render(); }
      else if(ROUTE!=='home'){ ROUTE='home'; window.scrollTo(0,0); if(typeof render==='function')render(); }
    }
  },{passive:true});
}
function bootShell(){
  wireFab(); wireSwipe();
  setTimeout(wireFab,100); setTimeout(wireFab,400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootShell);
else bootShell();
})();

/* pro extras */
(function(){
'use strict';
function N(v){return Number(v)||0}
function A(v){return Array.isArray(v)?v:[]}
function T(){return typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10)}
function M(k){return typeof fmt==='function'?fmt(k):Math.round(N(k)/100).toLocaleString('ru-RU')+' \u20bd'}
function life(){
  if(typeof STATE==='undefined'||!STATE)return{monthGoal:0,viewOnly:false,autoBackup:true};
  if(!STATE.life)STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
  return STATE.life;
}
function mig(){
  if(typeof STATE==='undefined'||!STATE)return;
  ['debts','income','expenses','reserves','reserveOps','recurring'].forEach(function(k){if(!Array.isArray(STATE[k]))STATE[k]=[]});
  if(!STATE.life)STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
  STATE.version=Math.max(N(STATE.version),3);
}
function save(){if(typeof saveState==='function')saveState()}
function toast(m){if(typeof showToast==='function')showToast(m)}
function tiedUp(){
  var res=0,debt=0;
  A(STATE.reserves).forEach(function(r){if(r&&r.active!==false)res+=N(r.saved)});
  A(STATE.debts).forEach(function(d){debt+=Math.max(0,N(d.amount)-N(d.paid))});
  return{res:res,debt:debt,total:res+debt};
}
function openBreakdown(){
  mig(); if(typeof currentPeriod!=='function'||typeof computePeriodSummary!=='function')return;
  var p=currentPeriod(),s=computePeriodSummary(STATE,p.start,p.end);
  var cash=N(s.currentBalance),pl=N(s.plannedRegular)+N(s.plannedObligatory),d=N(s.debtsDue),r=N(s.reservesNeeded),a=N(s.strictAvailable!=null?s.strictAvailable:s.availableNow);
  var h='<div class="modal" style="max-width:420px">'+(typeof modalHeader==='function'?modalHeader('\u041e\u0442\u043a\u0443\u0434\u0430 \u00ab\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u00bb'):'');
  h+='<div class="pro-breakdown card" style="margin:0"><div class="row"><span>\u041a\u0430\u0441\u0441\u0430</span><b>'+M(cash)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0430\u0441\u0445\u043e\u0434\u044b</span><b class="neg">\u2212'+M(pl)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0414\u043e\u043b\u0433\u0438</span><b class="neg">\u2212'+M(d)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0435\u0437\u0435\u0440\u0432\u044b</span><b class="neg">\u2212'+M(r)+'</b></div>';
  h+='<div class="row total"><span>\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e</span><b class="pos">'+M(a)+'</b></div></div>';
  h+='<button class="btn btn-primary btn-block" style="margin-top:12px" id="pc">\u041f\u043e\u043d\u044f\u0442\u043d\u043e</button></div>';
  showModal(h); document.getElementById('pc').onclick=closeModal;
}
function injectHome(){
  var main=document.getElementById('main');
  if(!main||typeof ROUTE==='undefined'||ROUTE!=='home')return;
  var oldEx=document.getElementById('proHomeExtras'); if(oldEx)oldEx.remove();
  mig(); var L=life(), html='', t=tiedUp();
  html+='<div class="card pro-tied"><div class="label">\u0417\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u043e</div><div class="mid-number">'+M(t.total)+'</div>';
  html+='<div class="faint">\u0440\u0435\u0437\u0435\u0440\u0432\u044b '+M(t.res)+' + \u0434\u043e\u043b\u0433\u0438 '+M(t.debt)+'</div></div>';
  if(typeof currentPeriod==='function'&&typeof getShift==='function'){
    var p3=currentPeriod(),today=T(),left=0,inc=0;
    for(var d=p3.start;d<=p3.end;d=addDays(d,1)){
      var sh=getShift(d,STATE);
      if(!sh||sh.type==='off'||sh.status==='cancelled')continue;
      if(d>=today){left++;inc+=(typeof shiftIncomeAmount==='function'?shiftIncomeAmount(sh):N(sh.amount))}
    }
    html+='<div class="card"><div class="label">\u0414\u043e \u043a\u043e\u043d\u0446\u0430 \u043f\u0435\u0440\u0438\u043e\u0434\u0430</div>';
    html+='<div class="row"><span>\u0421\u043c\u0435\u043d</span><b>'+left+'</b></div>';
    html+='<div class="row"><span>\u0415\u0449\u0451</span><b class="pos">'+M(inc)+'</b></div></div>';
  }
  html+='<div class="pro-chip-row"><button type="button" class="pro-chip hot" id="c1">\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u043a\u0430</button>';
  html+='<button type="button" class="pro-chip" id="c4">\u041f\u043e\u0438\u0441\u043a</button></div>';
  var box=document.createElement('div'); box.id='proHomeExtras'; box.className='pro-block'; box.innerHTML=html;
  var grids=main.querySelectorAll('.grid2');
  var anchor=grids.length?grids[0]:main.querySelector('.card');
  if(anchor&&anchor.parentNode){ if(anchor.nextSibling)anchor.parentNode.insertBefore(box,anchor.nextSibling); else anchor.parentNode.appendChild(box); }
  else main.appendChild(box);
  var b1=document.getElementById('c1'); if(b1)b1.onclick=openBreakdown;
  var b4=document.getElementById('c4'); if(b4)b4.onclick=function(){
    var h='<div class="modal" style="max-width:420px">'+(typeof modalHeader==='function'?modalHeader('\u041f\u043e\u0438\u0441\u043a'):'')+'<div class="field"><input id="pq" placeholder="\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435"></div><div id="ph" class="card"></div></div>';
    showModal(h);
    document.getElementById('pq').oninput=function(){
      var q=this.value.toLowerCase(),hits=[];
      A(STATE.expenses).forEach(function(e){if((e.title||'').toLowerCase().indexOf(q)>=0)hits.push(e)});
      document.getElementById('ph').innerHTML=hits.slice(0,25).map(function(e){return '<div class="life-search-hit"><b>'+e.title+'</b><div class="faint">'+e.date+' \u00b7 '+M(e.amount)+'</div></div>'}).join('')||'<div class="faint">\u2014</div>';
    };
  };
}
function injectSettings(){
  var main=document.getElementById('main');
  if(!main||ROUTE!=='settings')return;
  var oldS=document.getElementById('proSettingsExtras'); if(oldS)oldS.remove();
  mig(); var L=life();
  var box=document.createElement('div'); box.id='proSettingsExtras';
  box.innerHTML='<div class="section-title">\u0426\u0435\u043b\u0438</div><div class="card"><div class="field"><label>\u0426\u0435\u043b\u044c \u043d\u0430 \u043c\u0435\u0441\u044f\u0446, \u20bd</label><input id="g1" type="number" value="'+Math.round(N(L.monthGoal)/100)+'"></div><button class="btn btn-primary btn-block" id="gS">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button></div>';
  main.appendChild(box);
  document.getElementById('gS').onclick=function(){ L.monthGoal=Math.round(N(document.getElementById('g1').value)*100); save(); toast('\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e'); render(); };
}
function wireVoice(){
  var root=document.getElementById('modalRoot');
  if(!root||root.__v)return; root.__v=1;
  new MutationObserver(function(){
    var m=root.querySelector('.modal');
    if(!m||m.querySelector('.life-mic'))return;
    var inp=m.querySelector('#fComment, #dComment, input[id*="omment"]');
    if(!inp)return;
    if(inp.parentNode&&inp.parentNode.querySelector('.life-mic'))return;
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:8px;align-items:center';
    inp.parentNode.insertBefore(wrap,inp); wrap.appendChild(inp); inp.style.flex='1';
    var btn=document.createElement('button'); btn.type='button'; btn.className='life-mic'; btn.textContent='\uD83C\uDFA4';
    wrap.appendChild(btn);
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    btn.onclick=function(){
      if(!SR)return toast('\u0413\u043e\u043b\u043e\u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d');
      var r=new SR(); r.lang='ru-RU'; btn.classList.add('rec');
      r.onresult=function(ev){ inp.value+=(inp.value?' ':'')+ev.results[0][0].transcript; };
      r.onend=function(){ btn.classList.remove('rec'); };
      try{ r.start(); }catch(e){ btn.classList.remove('rec'); }
    };
  }).observe(root,{childList:true,subtree:true});
}
function ensureProOuter(){
  var cur=window.render;
  if(typeof cur!=='function')return;
  if(cur.__proOuter)return;
  window.render=function(){
    mig();
    try{ cur.apply(this,arguments); }catch(e){ console.error(e); }
    try{ injectHome(); injectSettings(); }catch(e){ console.error(e); }
  };
  window.render.__pro=true;
  window.render.__proOuter=true;
}
function boot(){
  mig(); wireVoice();
  ensureProOuter();
  setTimeout(ensureProOuter,0);
  setTimeout(ensureProOuter,100);
  setTimeout(function(){ ensureProOuter(); if(typeof render==='function')render(); },400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
