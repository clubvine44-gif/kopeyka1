/* ui-shell.js — center FAB → carousel navigation + compact chrome */
(function(){
'use strict';

var OPEN = false;
var items = [
  {id:'home', label:'Главная', hint:'Сводка периода', icon:'home'},
  {id:'calendar', label:'Календарь', hint:'Смены и график', icon:'calendar'},
  {id:'income', label:'Доходы', hint:'Факт и план', icon:'income'},
  {id:'expenses', label:'Расходы', hint:'Траты', icon:'expenses'},
  {id:'reserves', label:'Резервы', hint:'Цели и долги', icon:'reserves'},
  {id:'notes', label:'Заметки', hint:'Быстрые записи', icon:'notes'},
  {id:'settings', label:'Настройки', hint:'Профиль и цикл', icon:'settings'},
  {id:'__add__', label:'Добавить', hint:'Смена, доход, расход…', icon:'add'}
];

function isMobile(){ return window.matchMedia('(max-width: 899px)').matches; }

function ensureDom(){
  if(document.getElementById('shellNavBackdrop')) return;
  var bd = document.createElement('div');
  bd.id = 'shellNavBackdrop';
  bd.className = 'shell-nav-backdrop';
  bd.addEventListener('click', closeNav);
  var sheet = document.createElement('div');
  sheet.id = 'shellNavSheet';
  sheet.className = 'shell-nav-sheet';
  sheet.innerHTML = '<div class="handle"></div><div class="shell-nav-title">Навигация</div><div class="shell-carousel" id="shellCarousel"></div><div class="shell-dots" id="shellDots"></div>';
  document.body.appendChild(bd);
  document.body.appendChild(sheet);
}

function iconSvg(name){
  if(typeof ICONS !== 'undefined' && ICONS[name]) return ICONS[name];
  if(name === 'add') return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/></svg>';
}

function buildCarousel(){
  var car = document.getElementById('shellCarousel');
  var dots = document.getElementById('shellDots');
  if(!car) return;
  var route = (typeof ROUTE !== 'undefined' ? ROUTE : 'home');
  var h = '';
  var d = '';
  items.forEach(function(it, idx){
    var active = it.id === route ? ' active' : '';
    var add = it.id === '__add__' ? ' add-card' : '';
    h += '<button type="button" class="shell-nav-card'+active+add+'" data-shell-route="'+it.id+'" data-idx="'+idx+'">';
    h += iconSvg(it.icon);
    h += '<div class="lbl">'+it.label+'</div>';
    h += '<div class="hint">'+it.hint+'</div>';
    h += '</button>';
    d += '<span class="'+(it.id===route?'on':'')+'" data-dot="'+idx+'"></span>';
  });
  car.innerHTML = h;
  dots.innerHTML = d;
  car.querySelectorAll('[data-shell-route]').forEach(function(btn){
    btn.addEventListener('click', function(){
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
  requestAnimationFrame(function(){
    var active = car.querySelector('.shell-nav-card.active') || car.querySelector('.shell-nav-card');
    if(active){
      var left = active.offsetLeft - (car.clientWidth - active.clientWidth) / 2;
      car.scrollTo({left: Math.max(0,left), behavior: 'smooth'});
    }
  });
  car.onscroll = function(){
    var cards = car.querySelectorAll('.shell-nav-card');
    var mid = car.scrollLeft + car.clientWidth/2;
    var best = 0, bestDist = 1e9;
    cards.forEach(function(c, i){
      var cmid = c.offsetLeft + c.clientWidth/2;
      var dist = Math.abs(cmid - mid);
      if(dist < bestDist){ bestDist = dist; best = i; }
    });
    dots.querySelectorAll('span').forEach(function(s,i){
      s.classList.toggle('on', i===best);
    });
  };
}

function openNav(){
  ensureDom();
  buildCarousel();
  OPEN = true;
  document.getElementById('shellNavBackdrop').classList.add('show');
  document.getElementById('shellNavSheet').classList.add('show');
  var fab = document.getElementById('fabBtn');
  if(fab) fab.classList.add('open');
}

function closeNav(){
  OPEN = false;
  var bd = document.getElementById('shellNavBackdrop');
  var sh = document.getElementById('shellNavSheet');
  if(bd) bd.classList.remove('show');
  if(sh) sh.classList.remove('show');
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
  setTimeout(function(){ patchRenderNav(); wireFab(); compactTopbar(); }, 50);
  setTimeout(function(){ patchRenderNav(); wireFab(); }, 400);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
