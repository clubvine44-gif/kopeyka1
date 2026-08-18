/* app.js — shell + pro, single enhancement */
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

function goBack(){
  if(OPEN){ closeNav(); return true; }
  var modal = document.querySelector('#modalRoot .modal');
  if(modal && typeof closeModal === 'function'){
    try{ closeModal(); return true; }catch(_){}
  }
  if(historyStack.length){
    var prev = historyStack.pop();
    if(typeof ROUTE !== 'undefined') ROUTE = prev;
    window.scrollTo(0,0);
    if(typeof render === 'function') render();
    return true;
  }
  if(typeof ROUTE !== 'undefined' && ROUTE !== 'home'){
    ROUTE = 'home';
    window.scrollTo(0,0);
    if(typeof render === 'function') render();
    return true;
  }
  return false;
}

function layoutArc(){
  var arc = document.getElementById('shellNavArc');
  if(!arc) return;
  var n = items.length;
  var radius = isMobile() ? 118 : 136;
  var start = Math.PI;
  var end = 0;
  arc.querySelectorAll('.shell-arc-btn').forEach(function(btn, i){
    var t = n === 1 ? 0.5 : i / (n - 1);
    var angle = start + (end - start) * t;
    var x = Math.cos(angle) * radius;
    var y = -Math.sin(angle) * radius;
    btn.dataset.tx = x;
    btn.dataset.ty = y;
    if(OPEN){
      btn.style.transform = 'translate('+x+'px,'+y+'px) scale(1)';
    } else {
      btn.style.transform = 'translate(0px,0px) scale(.35)';
    }
  });
}

function buildArc(){
  ensureDom();
  var arc = document.getElementById('shellNavArc');
  var html = '';
  items.forEach(function(it, idx){
    var active = (typeof ROUTE !== 'undefined' && ROUTE === it.id) ? ' active' : '';
    var add = it.id === '__add__' ? ' add-card' : '';
    html += '<button type="button" class="shell-arc-btn'+active+add+'" data-shell-route="'+it.id+'" style="transition-delay:'+(idx*26)+'ms">';
    html += iconSvg(it.icon);
    html += '<span class="lbl">'+it.label+'</span></button>';
  });
  arc.innerHTML = html;
  layoutArc();
  arc.querySelectorAll('[data-shell-route]').forEach(function(btn){
    btn.addEventListener('click', function(e){
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
  OPEN = true;
  buildArc();
  document.getElementById('shellNavBackdrop').classList.add('show');
  var arc = document.getElementById('shellNavArc');
  arc.classList.add('show');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      layoutArc();
      arc.querySelectorAll('.shell-arc-btn').forEach(function(btn){
        var x = btn.dataset.tx || 0;
        var y = btn.dataset.ty || 0;
        btn.style.transform = 'translate('+x+'px,'+y+'px) scale(1)';
        btn.style.opacity = '1';
      });
    });
  });
  var fab = document.getElementById('fabBtn');
  if(fab) fab.classList.add('open');
}

function closeNav(){
  OPEN = false;
  var bd = document.getElementById('shellNavBackdrop');
  var arc = document.getElementById('shellNavArc');
  if(bd) bd.classList.remove('show');
  if(arc){
    arc.querySelectorAll('.shell-arc-btn').forEach(function(btn){
      btn.style.transform = 'translate(0px,0px) scale(.35)';
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

function compactTopbar(){
  var top = document.querySelector('.topbar');
  if(!top) return;
  if(!document.getElementById('shellBrandHome')){
    var brand = document.createElement('div');
    brand.id = 'shellBrandHome';
    brand.className = 'shell-brand';
    brand.innerHTML = '<span class="coin-dot"></span> \u041a\u043e\u043f\u0435\u0439\u043a\u0430';
    top.insertBefore(brand, top.firstChild);
  }
  var brandEl = document.getElementById('shellBrandHome');
  if(brandEl && !brandEl.__wired){
    brandEl.__wired = true;
    brandEl.addEventListener('click', function(){ goRoute('home'); });
  }
}

function patchRenderNav(){
  if(typeof window.renderNav !== 'function' || window.renderNav.__shell) return;
  var orig = window.renderNav;
  window.renderNav = function(){
    try{ orig.apply(this, arguments); }catch(_){}
    lastRoute = typeof ROUTE !== 'undefined' ? ROUTE : lastRoute;
    compactTopbar();
    wireFab();
  };
  window.renderNav.__shell = true;
}

function wireSwipeBack(){
  if(window.__shellSwipe) return;
  window.__shellSwipe = true;
  document.addEventListener('touchstart', function(e){
    if(!isMobile() || e.touches.length !== 1) return;
    var t = e.touches[0];
    swipe.x0 = t.clientX; swipe.y0 = t.clientY; swipe.t0 = Date.now(); swipe.active = true;
  }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(!swipe.active || !e.changedTouches || !e.changedTouches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipe.x0, dy = t.clientY - swipe.y0, dt = Date.now() - swipe.t0;
    swipe.active = false;
    if(dx > 72 && Math.abs(dy) < 56 && dt < 450){
      if(swipe.x0 < 40 || dx > 120) goBack();
    }
  }, {passive:true});
}

function bootShell(){
  ensureDom();
  patchRenderNav();
  wireFab();
  compactTopbar();
  wireSwipeBack();
  window.addEventListener('resize', function(){ if(OPEN) layoutArc(); });
  setTimeout(function(){ patchRenderNav(); wireFab(); compactTopbar(); }, 50);
  setTimeout(function(){ patchRenderNav(); wireFab(); }, 400);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootShell);
else bootShell();
})();

/* pro */
(function(){
'use strict';
function N(v){return Number(v)||0}
function A(v){return Array.isArray(v)?v:[]}
function T(){return typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10)}
function M(k){return typeof fmt==='function'?fmt(k):Math.round(N(k)/100).toLocaleString('ru-RU')+' \u20bd'}
function mig(){
  if(typeof STATE==='undefined'||!STATE) return;
  ['debts','income','expenses','reserves','reserveOps','recurring'].forEach(function(k){
    if(!Array.isArray(STATE[k])) STATE[k]=[];
  });
  if(!STATE.life) STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
}
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
  var old=document.getElementById('proHomeExtras'); if(old) old.remove();
  mig();
  var t=tiedUp();
  var html='<div class="card pro-tied"><div class="label">\u0417\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u043e</div>';
  html+='<div class="mid-number">'+M(t.total)+'</div>';
  html+='<div class="faint">\u0440\u0435\u0437\u0435\u0440\u0432\u044b '+M(t.res)+' + \u0434\u043e\u043b\u0433\u0438 '+M(t.debt)+'</div></div>';
  html+='<div class="pro-chip-row"><button type="button" class="pro-chip hot" id="c1">\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u043a\u0430</button></div>';
  var box=document.createElement('div'); box.id='proHomeExtras'; box.className='pro-block'; box.innerHTML=html;
  var grids=main.querySelectorAll('.grid2');
  var anchor=grids.length?grids[0]:main.querySelector('.card');
  if(anchor&&anchor.parentNode){
    if(anchor.nextSibling) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else anchor.parentNode.appendChild(box);
  } else main.appendChild(box);
  var b=document.getElementById('c1'); if(b) b.onclick=openBreakdown;
}
function wireVoice(){
  var root=document.getElementById('modalRoot');
  if(!root||root.__voice) return; root.__voice=1;
  new MutationObserver(function(){
    var m=root.querySelector('.modal');
    if(!m||m.querySelector('.life-mic')) return;
    var inp=m.querySelector('#fComment,#dComment,input[id*="omment"]');
    if(!inp) return;
    var wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:8px;align-items:center';
    inp.parentNode.insertBefore(wrap,inp); wrap.appendChild(inp); inp.style.flex='1';
    var btn=document.createElement('button'); btn.type='button'; btn.className='life-mic'; btn.textContent='\uD83C\uDFA4';
    wrap.appendChild(btn);
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    btn.onclick=function(){
      if(!SR){ if(typeof showToast==='function') showToast('\u0413\u043e\u043b\u043e\u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d'); return; }
      var r=new SR(); r.lang='ru-RU'; btn.classList.add('rec');
      r.onresult=function(ev){ inp.value+=(inp.value?' ':'')+ev.results[0][0].transcript; };
      r.onend=function(){ btn.classList.remove('rec'); };
      try{ r.start(); }catch(e){ btn.classList.remove('rec'); }
    };
  }).observe(root,{childList:true,subtree:true});
}
function ensureOuter(){
  var cur=window.render;
  if(typeof cur!=='function'||cur.__appOuter) return;
  window.render=function(){
    mig();
    try{ cur.apply(this,arguments); }catch(e){ console.error(e); }
    try{ injectHome(); }catch(e){ console.error(e); }
  };
  window.render.__appOuter=true;
}
function bootApp(){
  mig(); wireVoice(); ensureOuter();
  setTimeout(ensureOuter,0);
  setTimeout(ensureOuter,150);
  setTimeout(function(){ ensureOuter(); if(typeof render==='function') render(); },400);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootApp);
else bootApp();
})();
