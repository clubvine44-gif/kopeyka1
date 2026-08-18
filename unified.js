/* unified.js v2 — working shell (show/shell-arc-btn) + pro */
/* ui-shell.js v3 — arc without home, swipe-back */
(function(){
'use strict';

var OPEN = false;
var historyStack = [];
var lastRoute = null;
var swipe = {x0:0,y0:0,t0:0,active:false};

var items = [
  {id:'calendar', label:'\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c', icon:'calendar'},
  {id:'income', label:'\u0414\u043e\u0445\u043e\u0434\u044b', icon:'income'},
  {id:'expenses', label:'\u0420\u0430\u0441\u0445\u043e\u0434\u044b', icon:'expenses'},
  {id:'reserves', label:'\u0420\u0435\u0437\u0435\u0440\u0432\u044b', icon:'reserves'},
  {id:'notes', label:'\u0417\u0430\u043c\u0435\u0442\u043a\u0438', icon:'notes'},
  {id:'settings', label:'\u0415\u0449\u0451', icon:'settings'},
  {id:'__add__', label:'\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c', icon:'add'}
];

function isMobile(){ return window.matchMedia('(max-width: 899px)').matches; }

function ensureDom(){
  if(document.getElementById('shellNavBackdrop')) return;
  var bd = document.createElement('div');
  bd.id = 'shellNavBackdrop';
  bd.className = 'shell-nav-backdrop';
  bd.addEventListener('click', closeNav);
  var arc = document.createElement('div');
  arc.id = 'shellNavArc';
  arc.className = 'shell-nav-arc';
  document.body.appendChild(bd);
  document.body.appendChild(arc);
}

function iconSvg(name){
  if(typeof ICONS !== 'undefined' && ICONS[name]) return ICONS[name];
  if(name === 'add') return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/></svg>';
}

function goRoute(id){
  if(typeof ROUTE === 'undefined') return;
  if(ROUTE === id) return;
  historyStack.push(ROUTE);
  if(historyStack.length > 30) historyStack.shift();
  ROUTE = id;
  window.scrollTo(0,0);
  if(typeof render === 'function') render();
}

function buildArc(){
  ensureDom();
  var arc = document.getElementById('shellNavArc');
  var html = '';
  var n = items.length;
  var start = -Math.PI * 0.95;
  var end = Math.PI * 0.95;
  var radius = isMobile() ? 118 : 136;
  items.forEach(function(it, idx){
    var t = n === 1 ? 0.5 : idx / (n - 1);
    var ang = start + (end - start) * t;
    var x = Math.sin(ang) * radius;
    var y = -Math.cos(ang) * radius;
    var active = (typeof ROUTE !== 'undefined' && ROUTE === it.id) ? ' active' : '';
    var add = it.id === '__add__' ? ' add-card' : '';
    html += '<button type="button" class="shell-arc-btn'+active+add+'" data-shell-route="'+it.id+'" style="transform:translate('+x+'px,'+y+'px);transition-delay:'+(idx*26)+'ms">';
    html += iconSvg(it.icon);
    html += '<span class="lbl">'+it.label+'</span></button>';
  });
  arc.innerHTML = html;
  arc.querySelectorAll('.shell-arc-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var id = btn.getAttribute('data-shell-route');
      closeNav();
      if(id === '__add__'){
        if(typeof openFabMenu === 'function') openFabMenu();
        return;
      }
      goRoute(id);
    });
  });
}

function openNav(){
  ensureDom();
  buildArc();
  OPEN = true;
  document.getElementById('shellNavBackdrop').classList.add('show');
  var arc = document.getElementById('shellNavArc');
  arc.classList.add('show');
  requestAnimationFrame(function(){
    arc.querySelectorAll('.shell-arc-btn').forEach(function(btn){
      btn.style.opacity = '1';
    });
  });
  var fab = document.getElementById('fabBtn');
  if(fab) fab.classList.add('open');
}

function closeNav(){
  OPEN = false;
  var bd = document.getElementById('shellNavBackdrop');
  if(bd) bd.classList.remove('show');
  var arc = document.getElementById('shellNavArc');
  if(arc){
    arc.querySelectorAll('.shell-arc-btn').forEach(function(btn){
      btn.style.opacity = '0';
    });
    setTimeout(function(){ arc.classList.remove('show'); }, 280);
  }
  var fab = document.getElementById('fabBtn');
  if(fab) fab.classList.remove('open');
}

function wireFab(){
  var fab = document.getElementById('fabBtn');
  if(!fab || fab.__shellWired) return;
  fab.__shellWired = true;
  var neo = fab.cloneNode(true);
  fab.parentNode.replaceChild(neo, fab);
  neo.__shellWired = true;
  neo.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    if(OPEN) closeNav();
    else openNav();
  });
}

function wireSwipe(){
  if(window.__shellSwipe) return;
  window.__shellSwipe = true;
  document.addEventListener('touchstart', function(e){
    if(!e.touches || !e.touches.length) return;
    var t = e.touches[0];
    swipe = {x0:t.clientX, y0:t.clientY, t0:Date.now(), active:t.clientX < 28};
  }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(!swipe.active) return;
    swipe.active = false;
    var t = e.changedTouches && e.changedTouches[0];
    if(!t) return;
    var dx = t.clientX - swipe.x0;
    var dy = Math.abs(t.clientY - swipe.y0);
    var dt = Date.now() - swipe.t0;
    if(dx > 72 && dy < 50 && dt < 500){
      if(historyStack.length){
        var prev = historyStack.pop();
        if(typeof ROUTE !== 'undefined') ROUTE = prev;
        window.scrollTo(0,0);
        if(typeof render === 'function') render();
      } else if(typeof ROUTE !== 'undefined' && ROUTE !== 'home'){
        ROUTE = 'home';
        window.scrollTo(0,0);
        if(typeof render === 'function') render();
      }
    }
  }, {passive:true});
}

function bootShell(){
  wireFab();
  wireSwipe();
  setTimeout(wireFab, 80);
  setTimeout(wireFab, 300);
  setTimeout(wireFab, 800);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootShell);
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
  if(typeof STATE==='undefined'||!STATE) return {monthGoal:0,viewOnly:false,autoBackup:true};
  if(!STATE.life) STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
  return STATE.life;
}
function mig(){
  if(typeof STATE==='undefined'||!STATE) return;
  ['debts','income','expenses','reserves','reserveOps','recurring'].forEach(function(k){
    if(!Array.isArray(STATE[k])) STATE[k]=[];
  });
  if(!STATE.life) STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
  STATE.version=Math.max(N(STATE.version),3);
}
function save(){ if(typeof saveState==='function') saveState(); }
function toast(m){ if(typeof showToast==='function') showToast(m); }
function tiedUp(){
  var res=0, debt=0;
  A(STATE.reserves).forEach(function(r){ if(r&&r.active!==false) res+=N(r.saved); });
  A(STATE.debts).forEach(function(d){ debt+=Math.max(0, N(d.amount)-N(d.paid)); });
  return {res:res, debt:debt, total:res+debt};
}
function openBreakdown(){
  mig();
  if(typeof currentPeriod!=='function'||typeof computePeriodSummary!=='function') return;
  var p=currentPeriod(), s=computePeriodSummary(STATE,p.start,p.end);
  var cash=N(s.currentBalance), pl=N(s.plannedRegular)+N(s.plannedObligatory);
  var d=N(s.debtsDue), r=N(s.reservesNeeded);
  var a=N(s.strictAvailable!=null?s.strictAvailable:s.availableNow);
  var h='<div class="modal" style="max-width:420px">';
  h+=(typeof modalHeader==='function'?modalHeader('\u041e\u0442\u043a\u0443\u0434\u0430 \u00ab\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u00bb'):'');
  h+='<div class="pro-breakdown card" style="margin:0">';
  h+='<div class="row"><span>\u041a\u0430\u0441\u0441\u0430</span><b>'+M(cash)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0430\u0441\u0445\u043e\u0434\u044b</span><b class="neg">\u2212'+M(pl)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0414\u043e\u043b\u0433\u0438</span><b class="neg">\u2212'+M(d)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0435\u0437\u0435\u0440\u0432\u044b</span><b class="neg">\u2212'+M(r)+'</b></div>';
  h+='<div class="row total"><span>\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e</span><b class="pos">'+M(a)+'</b></div></div>';
  h+='<button class="btn btn-primary btn-block" style="margin-top:12px" id="pc">\u041f\u043e\u043d\u044f\u0442\u043d\u043e</button></div>';
  showModal(h);
  document.getElementById('pc').onclick=closeModal;
}
function injectHome(){
  var main=document.getElementById('main');
  if(!main || typeof ROUTE==='undefined' || ROUTE!=='home') return;
  var oldEx=document.getElementById('proHomeExtras'); if(oldEx) oldEx.remove();
  mig();
  var t=tiedUp();
  var html='';
  html+='<div class="card pro-tied"><div class="label">\u0417\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u043e</div>';
  html+='<div class="mid-number">'+M(t.total)+'</div>';
  html+='<div class="faint">\u0440\u0435\u0437\u0435\u0440\u0432\u044b '+M(t.res)+' + \u0434\u043e\u043b\u0433\u0438 '+M(t.debt)+'</div></div>';
  if(typeof currentPeriod==='function' && typeof getShift==='function'){
    var p3=currentPeriod(), today=T(), left=0, inc=0;
    for(var d=p3.start; d<=p3.end; d=addDays(d,1)){
      var sh=getShift(d, STATE);
      if(!sh || sh.type==='off' || sh.status==='cancelled' || sh.status==='absence') continue;
      if(d>=today){
        left++;
        inc += (typeof shiftIncomeAmount==='function' ? shiftIncomeAmount(sh) : N(sh.amount));
      }
    }
    html+='<div class="card"><div class="label">\u0414\u043e \u043a\u043e\u043d\u0446\u0430 \u043f\u0435\u0440\u0438\u043e\u0434\u0430</div>';
    html+='<div class="row"><span>\u0421\u043c\u0435\u043d \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c</span><b>'+left+'</b></div>';
    html+='<div class="row"><span>\u0415\u0449\u0451 \u0441\u043e \u0441\u043c\u0435\u043d</span><b class="pos">'+M(inc)+'</b></div></div>';
  }
  html+='<div class="pro-chip-row"><button type="button" class="pro-chip hot" id="c1">\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u043a\u0430</button></div>';
  var box=document.createElement('div');
  box.id='proHomeExtras';
  box.className='pro-block';
  box.innerHTML=html;
  var grids=main.querySelectorAll('.grid2');
  var anchor = grids.length>=1 ? grids[0] : main.querySelector('.card');
  if(anchor && anchor.parentNode){
    if(anchor.nextSibling) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else anchor.parentNode.appendChild(box);
  } else main.appendChild(box);
  var b1=document.getElementById('c1'); if(b1) b1.onclick=openBreakdown;
}
function injectSettings(){
  var main=document.getElementById('main');
  if(!main || typeof ROUTE==='undefined' || ROUTE!=='settings') return;
  var oldS=document.getElementById('proSettingsExtras'); if(oldS) oldS.remove();
  mig();
  var L=life();
  var box=document.createElement('div');
  box.id='proSettingsExtras';
  box.innerHTML=
    '<div class="section-title">\u0426\u0435\u043b\u0438</div><div class="card">'+
    '<div class="field"><label>\u0426\u0435\u043b\u044c \u043d\u0430 \u043c\u0435\u0441\u044f\u0446, \u20bd</label>'+
    '<input id="g1" type="number" value="'+Math.round(N(L.monthGoal)/100)+'"></div>'+
    '<button class="btn btn-primary btn-block" id="gS">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button></div>';
  main.appendChild(box);
  document.getElementById('gS').onclick=function(){
    L.monthGoal=Math.round(N(document.getElementById('g1').value)*100);
    save(); toast('\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e'); render();
  };
}
function wireVoice(){
  var root=document.getElementById('modalRoot');
  if(!root || root.__v) return;
  root.__v=1;
  new MutationObserver(function(){
    var m=root.querySelector('.modal');
    if(!m || m.querySelector('.life-mic')) return;
    var inp = m.querySelector('#fComment, #dComment, input[id*="omment"]');
    if(!inp) return;
    if(inp.parentNode && inp.parentNode.querySelector('.life-mic')) return;
    var wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:8px;align-items:center';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    inp.style.flex='1';
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='life-mic';
    btn.textContent='\uD83C\uDFA4';
    wrap.appendChild(btn);
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    btn.onclick=function(){
      if(!SR) return toast('\u0413\u043e\u043b\u043e\u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d');
      var r=new SR(); r.lang='ru-RU';
      btn.classList.add('rec');
      r.onresult=function(ev){ inp.value+=(inp.value?' ':'')+ev.results[0][0].transcript; };
      r.onend=function(){ btn.classList.remove('rec'); };
      try{ r.start(); }catch(e){ btn.classList.remove('rec'); }
    };
  }).observe(root,{childList:true,subtree:true});
}
function ensureProOuter(){
  var cur=window.render;
  if(typeof cur!=='function') return;
  if(cur.__proOuter) return;
  window.render=function(){
    mig();
    try{ cur.apply(this, arguments); }catch(e){ console.error(e); }
    try{ injectHome(); injectSettings(); }catch(e){ console.error(e); }
  };
  window.render.__pro=true;
  window.render.__proOuter=true;
}
function bootPro(){
  mig();
  wireVoice();
  ensureProOuter();
  setTimeout(ensureProOuter, 0);
  setTimeout(ensureProOuter, 100);
  setTimeout(function(){ ensureProOuter(); if(typeof render==='function') render(); }, 350);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bootPro);
else bootPro();
})();
