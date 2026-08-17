/* Копейка — undo history menu */
(function(){
  'use strict';
  if(window.__KOPEYKA_UNDO_MENU__) return;
  window.__KOPEYKA_UNDO_MENU__=true;

  var KEY='kopeyka_undo_history_v1';
  var MAX=20;

  function read(){
    try{
      var v=JSON.parse(localStorage.getItem(KEY)||'[]');
      return Array.isArray(v)?v:[];
    }catch(e){return []}
  }
  function write(v){try{localStorage.setItem(KEY,JSON.stringify(v.slice(-MAX)));}catch(e){}}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return null}}
  function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b);}catch(e){return false}}

  function diffLabel(before,after){
    if(!before||!after) return 'Изменение данных';
    var checks=[
      ['debts','Изменение долга'],
      ['income','Изменение дохода'],
      ['expenses','Изменение расхода'],
      ['reserves','Изменение накоплений'],
      ['reserveOps','Изменение резерва'],
      ['shiftsOverride','Изменение смен'],
      ['recurring','Изменение обязательного платежа'],
      ['settings','Изменение настроек']
    ];
    for(var i=0;i<checks.length;i++) if(!same(before[checks[i][0]],after[checks[i][0]])) return checks[i][1];
    return 'Изменение данных';
  }

  function fmtDate(ts){
    if(!ts) return '';
    try{return new Date(ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return ''}
  }

  function restoreAt(index){
    var stack=read();
    if(!stack.length || index<0 || index>=stack.length) return;
    var state=clone(stack[index]);
    if(!state) return;
    try{
      if(typeof window.STATE!=='undefined') window.STATE=state;
      stack=stack.slice(0,index);
      write(stack);
      if(typeof window.persist==='function') window.persist();
      if(typeof window.render==='function') window.render();
      var toast=document.getElementById('kopeykaUndoMenuOverlay');
      if(toast) toast.remove();
      if(typeof window.showToast==='function') window.showToast('Действие отменено');
    }catch(e){console.error('[Kopeyka] undo restore failed',e)}
  }

  function openHistory(){
    var old=document.getElementById('kopeykaUndoHistoryOverlay');
    if(old) old.remove();
    var overlay=document.createElement('div');
    overlay.id='kopeykaUndoHistoryOverlay';
    overlay.className='overlay';
    var modal=document.createElement('div');
    modal.className='modal';
    modal.style.position='relative';
    var stack=read();
    var current=window.STATE;
    var html='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="margin:0">Отменить действие</h2><button type="button" class="btn btn-ghost" data-undo-close>Закрыть</button></div>';
    if(!stack.length){
      html+='<div class="empty"><div class="em-ico">↶</div><div>Нет действий для отмены</div></div>';
    }else{
      html+='<div style="margin:-4px 0 12px;color:var(--text-dim);font-size:12px">Выбери действие, до которого нужно вернуть данные.</div>';
      for(var i=stack.length-1;i>=0;i--){
        var after=(i===stack.length-1)?current:stack[i+1];
        var label=diffLabel(stack[i],after);
        var btn=document.createElement('button');
      }
      html+='<div id="kopeykaUndoRows"></div>';
    }
    modal.innerHTML=html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('[data-undo-close]')?.addEventListener('click',function(){overlay.remove()});
    overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove()});
    var rows=modal.querySelector('#kopeykaUndoRows');
    if(rows){
      for(var j=stack.length-1;j>=0;j--){
        var after=(j===stack.length-1)?current:stack[j+1];
        var row=document.createElement('button');
        row.type='button';
        row.style.cssText='width:100%;text-align:left;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:13px;padding:12px 13px;margin:0 0 8px;cursor:pointer;display:block;';
        var title=document.createElement('div');
        title.textContent=diffLabel(stack[j],after);
        title.style.cssText='font-weight:600;font-size:14px;';
        var sub=document.createElement('div');
        sub.textContent=fmtDate(Date.now() - ((stack.length-1-j)*1000));
        sub.style.cssText='margin-top:3px;color:var(--text-dim);font-size:11px;';
        var action=document.createElement('div');
        action.textContent='Вернуть состояние до этого действия';
        action.style.cssText='margin-top:6px;color:var(--safe);font-size:12px;font-weight:600;';
        row.appendChild(title);row.appendChild(sub);row.appendChild(action);
        (function(index){row.addEventListener('click',function(){
          if(!confirm('Отменить это действие и все изменения после него?')) return;
          restoreAt(index);
        });})(j);
        rows.appendChild(row);
      }
    }
  }

  function injectPlusEntry(){
    var fab=document.querySelector('.fab');
    if(!fab || fab.dataset.undoHook==='1') return;
    fab.dataset.undoHook='1';
    fab.addEventListener('click',function(){
      setTimeout(function(){
        var modals=document.querySelectorAll('.overlay .modal');
        var modal=modals.length?modals[modals.length-1]:null;
        if(!modal || modal.id==='kopeykaUndoHistoryOverlay') return;
        if(modal.querySelector('[data-open-undo-history]')) return;
        var box=document.createElement('div');
        box.style.cssText='margin-top:10px;padding-top:10px;border-top:1px solid var(--border);';
        var btn=document.createElement('button');
        btn.type='button';
        btn.dataset.openUndoHistory='1';
        btn.className='btn btn-secondary btn-block';
        btn.textContent='↶ Отменить последнее действие';
        btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openHistory()});
        box.appendChild(btn);
        modal.appendChild(box);
      },60);
    });
  }

  function boot(){
    injectPlusEntry();
    setInterval(injectPlusEntry,1000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();