/* Копейка: рабочие Отмена + Заметки */
(function(){
'use strict';
var H='kopeyka_undo_history_v1', N='kopeyka_notes_v1', MAX=20;
function clone(x){try{return JSON.parse(JSON.stringify(x))}catch(e){return null}}
function readH(){try{var x=JSON.parse(localStorage.getItem(H)||'[]');return Array.isArray(x)?x:[]}catch(e){return[]}}
function writeH(x){try{localStorage.setItem(H,JSON.stringify(x.slice(-MAX)))}catch(e){}}
function money(v){var n=Number(v)||0;return (n/100).toLocaleString('ru-RU',{maximumFractionDigits:0})+' ₽'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function label(a,b){
 if(!a||!b)return 'Изменение данных';
 var groups=[['debts','Долг'],['income','Доход'],['expenses','Расход'],['reserves','Резерв'],['reserveOps','Операция резерва'],['shiftsOverride','Смена'],['recurring','Обязательный платёж'],['settings','Настройки']];
 for(var i=0;i<groups.length;i++) if(JSON.stringify(a[groups[i][0]])!==JSON.stringify(b[groups[i][0]])) return groups[i][1];
 return 'Изменение данных';
}
function openUndo(){
 var old=document.getElementById('ko-undo-modal');if(old)old.remove();
 var list=readH(), current=clone(window.STATE)||{};
 var ov=document.createElement('div');ov.id='ko-undo-modal';ov.className='overlay';
 var m=document.createElement('div');m.className='modal';m.innerHTML='<div class="row"><h2 style="margin:0">Отменить действие</h2><button class="btn btn-ghost" id="koUC">Закрыть</button></div><div class="faint" style="margin:0 0 14px">Выбери действие. Приложение вернёт данные к состоянию до него.</div><div id="koUL"></div>';
 ov.appendChild(m);document.body.appendChild(ov);m.querySelector('#koUC').onclick=function(){ov.remove()};ov.onclick=function(e){if(e.target===ov)ov.remove()};
 var box=m.querySelector('#koUL');
 if(!list.length){box.innerHTML='<div class="empty"><div class="em-ico">↶</div>Нет действий для отмены</div>';return}
 for(var i=list.length-1;i>=0;i--){
  (function(idx){var after=idx===list.length-1?current:list[idx+1],b=list[idx];var row=document.createElement('button');row.className='btn btn-secondary btn-block';row.style.cssText='justify-content:flex-start;text-align:left;margin-bottom:8px;display:block';row.innerHTML='<b>'+esc(label(b,after))+'</b><div class="faint" style="margin-top:3px">Вернуть состояние до этого действия</div>';
  row.onclick=function(){if(!confirm('Отменить это действие и все изменения после него?'))return;var s=readH();if(!s[idx])return;window.__KO_UNDO_RESTORE__=true;try{window.STATE=clone(s[idx]);writeH(s.slice(0,idx));if(typeof window.persist==='function')window.persist();if(typeof window.render==='function')window.render();}finally{window.__KO_UNDO_RESTORE__=false}ov.remove();if(typeof window.showToast==='function')window.showToast('Действие отменено')};box.appendChild(row)})(i);
 }
}
function notes(){
 var old=document.getElementById('ko-notes-modal');if(old)old.remove();
 var ov=document.createElement('div');ov.id='ko-notes-modal';ov.className='overlay';
 var m=document.createElement('div');m.className='modal';m.innerHTML='<div class="row"><h2 style="margin:0">Заметки</h2><button class="btn btn-ghost" id="koNC">Закрыть</button></div><div class="field"><label>Новая заметка</label><textarea id="koNT" rows="4" placeholder="Напиши что-нибудь…"></textarea></div><button class="btn btn-primary btn-block" id="koNS">Добавить заметку</button><div class="section-title">Мои заметки</div><div id="koNL"></div>';
 ov.appendChild(m);document.body.appendChild(ov);m.querySelector('#koNC').onclick=function(){ov.remove()};ov.onclick=function(e){if(e.target===ov)ov.remove()};
 var ta=m.querySelector('#koNT'), box=m.querySelector('#koNL');
 function render(){var a;try{a=JSON.parse(localStorage.getItem(N)||'[]')}catch(e){a=[]}box.innerHTML='';if(!a.length){box.innerHTML='<div class="empty">Заметок пока нет</div>';return}a.slice().reverse().forEach(function(x,ri){var real=a.length-1-ri,row=document.createElement('div');row.className='card card-tight';row.style.marginBottom='8px';row.innerHTML='<div style="white-space:pre-wrap;line-height:1.45">'+esc(x.text)+'</div><div class="faint" style="margin-top:8px">'+new Date(x.ts).toLocaleString('ru-RU')+'</div><button class="btn btn-ghost" style="padding-left:0" data-del="'+real+'">Удалить</button>';row.querySelector('[data-del]').onclick=function(){a.splice(real,1);localStorage.setItem(N,JSON.stringify(a));render()};box.appendChild(row)})}
 m.querySelector('#koNS').onclick=function(){var t=ta.value.trim();if(!t)return;if(t.length>2000){if(typeof showToast==='function')showToast('Заметка слишком длинная');return}var a;try{a=JSON.parse(localStorage.getItem(N)||'[]')}catch(e){a=[]}a.push({text:t,ts:new Date().toISOString()});localStorage.setItem(N,JSON.stringify(a));ta.value='';render()};render();
}
function install(){
 var nav=document.querySelector('.bottomnav');
 if(nav&&!document.getElementById('koNotesNav')){var b=document.createElement('button');b.id='koNotesNav';b.className='navbtn';b.innerHTML='<span style="font-size:21px;line-height:22px">📝</span><span>Заметки</span>';b.onclick=notes;nav.appendChild(b)}
 var fab=document.querySelector('.fab');
 if(fab&&!fab.dataset.koUndo){fab.dataset.koUndo='1';fab.addEventListener('click',function(){setTimeout(function(){var ms=document.querySelectorAll('.overlay .modal');var m=ms[ms.length-1];if(!m||m.id==='ko-undo-modal'||m.querySelector('#koUndoEntry'))return;var x=document.createElement('button');x.id='koUndoEntry';x.className='btn btn-secondary btn-block';x.style.marginTop='10px';x.textContent='↶ Отменить последнее действие';x.onclick=function(e){e.preventDefault();e.stopPropagation();openUndo()};m.appendChild(x)},80)})}
}
var timer=setInterval(install,500);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.koOpenUndo=openUndo;window.koOpenNotes=notes;
})();