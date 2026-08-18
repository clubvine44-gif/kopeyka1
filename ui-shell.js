/* ui-shell.js v3 — arc without home, swipe-back */
(function(){
'use strict';

var OPEN = false;
var historyStack = [];
var lastRoute = null;
var swipe = {x0:0,y0:0,t0:0,active:false};

var items = [
  {id:'calendar', label:'Календарь', icon:'calendar'},
  {id:'income', label:'Доходы', icon:'income'},
  {id:'expenses', label:'Расходы', icon:'expenses'},
  {id:'reserves', label:'Резервы', icon:'reserves'},
  {id:'notes', label:'Заметки', icon:'notes'},
  {id:'settings', label:'Ещё', icon:'settings'},
  {id:'__add__', label:'Добавить', icon:'add'}
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
  var route = (typeof ROUTE !== 'undefined' ? ROUTE : 'home');
  var html = '';
  items.forEach(function(it, idx){
    var active = it.id === route ? ' active' : '';
    var add = it.id === '__add__' ? ' add-card' : '';
    html += '<button type="button" class="shell-arc-btn'+active+add+'" data-shell-route="'+it.id+'" style="transition-delay:'+(idx*26)+'ms">';
    html += iconSvg(it.icon);
    html += '<span class="lbl">'+it.label+'</span></button>';
  });
  arc.innerHTML = html;

  var vw = Math.min(window.innerWidth, 420);
  var radius = Math.max(122, Math.min(158, vw * 0.40));
  var start = Math.PI * 0.92;
  var end = Math.PI * 0.08;
  arc.querySelectorAll('.shell-arc-btn').forEach(function(btn, i){
    var t = n === 1 ? 0.5 : i / (n - 1);
    var angle = start + (end - start) * t;
    var x = Math.cos(angle) * radius;
    var y = -Math.sin(angle) * radius;
    btn.dataset.tx = x;
    btn.dataset.ty = y;
    btn.style.transform = OPEN
      ? 'translate('+x+'px,'+y+'px) scale(1)'
      : 'translate(0px,0px) scale(.35)';
  });

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
  layoutArc();
  document.getElementById('shellNavBackdrop').classList.add('show');
  var arc = document.getElementById('shellNavArc');
  arc.classList.add('show');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      arc.querySelectorAll('.shell-arc-btn').forEach(function(btn){
        btn.style.transform = 'translate('+(btn.dataset.tx||0)+'px,'+(btn.dataset.ty||0)+'px) scale(1)';
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
    if(!isMobile()){
      if(typeof openFabMenu === 'function') openFabMenu();
      return;
    }
    if(OPEN) closeNav();
    else openNav();
  });
}

function compactTopbar(){
  var top = document.querySelector('.topbar');
  if(!top) return;
  var mobileBrand = top.querySelector('.sidebar-brand-mobile');
  if(mobileBrand && !mobileBrand.querySelector('.shell-top-brand')){
    mobileBrand.innerHTML = '<div class="shell-top-brand" id="shellBrandHome"><span class="coin-dot"></span> Копейка</div>';
  }
  var brand = document.getElementById('shellBrandHome');
  if(brand && !brand.__wired){
    brand.__wired = true;
    brand.addEventListener('click', function(){ goRoute('home'); });
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

function patchNavClicks(){
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('[data-route]');
    if(!btn) return;
    var id = btn.getAttribute('data-route');
    if(!id || typeof ROUTE === 'undefined') return;
    if(id !== ROUTE){
      historyStack.push(ROUTE);
      if(historyStack.length > 30) historyStack.shift();
    }
  }, true);
}

function wireSwipeBack(){
  if(window.__shellSwipe) return;
  window.__shellSwipe = true;
  document.addEventListener('touchstart', function(e){
    if(!isMobile() || e.touches.length !== 1) return;
    var t = e.touches[0];
    swipe.x0 = t.clientX;
    swipe.y0 = t.clientY;
    swipe.t0 = Date.now();
    swipe.active = true;
  }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(!swipe.active || !e.changedTouches || !e.changedTouches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipe.x0;
    var dy = t.clientY - swipe.y0;
    var dt = Date.now() - swipe.t0;
    swipe.active = false;
    if(dx > 72 && Math.abs(dy) < 56 && dt < 450){
      if(swipe.x0 < 40 || dx > 120){
        goBack();
      }
    }
  }, {passive:true});
  try{
    history.pushState({shell:1}, '');
    window.addEventListener('popstate', function(){
      if(goBack()){
        history.pushState({shell:1}, '');
      }
    });
  }catch(_){}
}

function boot(){
  ensureDom();
  patchRenderNav();
  patchNavClicks();
  wireFab();
  compactTopbar();
  wireSwipeBack();
  if(typeof ROUTE !== 'undefined') lastRoute = ROUTE;
  window.addEventListener('resize', function(){ if(OPEN) layoutArc(); });
  setTimeout(function(){ patchRenderNav(); wireFab(); compactTopbar(); }, 50);
  setTimeout(function(){ patchRenderNav(); wireFab(); }, 400);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
