/* ui-shell.js v2 — round FAB + semicircle nav */
(function(){
'use strict';

var OPEN = false;
var items = [
  {id:'home', label:'Главная', icon:'home'},
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

function layoutArc(){
  var arc = document.getElementById('shellNavArc');
  if(!arc) return;
  var n = items.length;
  var route = (typeof ROUTE !== 'undefined' ? ROUTE : 'home');
  var html = '';
  items.forEach(function(it, idx){
    var active = it.id === route ? ' active' : '';
    var add = it.id === '__add__' ? ' add-card' : '';
    html += '<button type="button" class="shell-arc-btn'+active+add+'" data-shell-route="'+it.id+'" data-idx="'+idx+'" style="transition-delay:'+(idx*28)+'ms">';
    html += iconSvg(it.icon);
    html += '<span class="lbl">'+it.label+'</span>';
    html += '</button>';
  });
  arc.innerHTML = html;

  var vw = Math.min(window.innerWidth, 420);
  var radius = Math.max(118, Math.min(148, vw * 0.38));
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

  arc.querySelectorAll('[data-shell-route]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var id = btn.getAttribute('data-shell-route');
      closeNav();
      if(id === '__add__'){
        if(typeof openFabMenu === 'function') openFabMenu();
        return;
      }
      if(typeof ROUTE !== 'undefined') ROUTE = id;
      window.scrollTo(0,0);
      if(typeof render === 'function') render();
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
        var x = btn.dataset.tx || 0;
        var y = btn.dataset.ty || 0;
        btn.style.transform = 'translate('+x+'px,'+y+'px) scale(1)';
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
    mobileBrand.innerHTML = '<div class="shell-top-brand"><span class="coin-dot"></span> Копейка</div>';
  }
}

function patchRenderNav(){
  if(typeof window.renderNav !== 'function' || window.renderNav.__shell) return;
  var orig = window.renderNav;
  window.renderNav = function(){
    try{ orig.apply(this, arguments); }catch(_){}
    compactTopbar();
    wireFab();
  };
  window.renderNav.__shell = true;
}

function boot(){
  ensureDom();
  patchRenderNav();
  wireFab();
  compactTopbar();
  window.addEventListener('resize', function(){
    if(OPEN) layoutArc();
  });
  setTimeout(function(){ patchRenderNav(); wireFab(); compactTopbar(); }, 50);
  setTimeout(function(){ patchRenderNav(); wireFab(); }, 400);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
