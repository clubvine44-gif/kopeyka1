/* KOPEYKA UI loader + undo manager */
(function(){
  'use strict';
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'ui-finance-v4-core.js', false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      (0, eval)(xhr.responseText + '\n//# sourceURL=ui-finance-v4-core.js');
    } else {
      throw new Error('Не удалось загрузить ui-finance-v4-core.js: ' + xhr.status);
    }
  } catch (e) {
    console.error('[Kopeyka] finance UI load failed', e);
  }

  var KEY = 'kopeyka_undo_history_v1';
  var MAX = 20;
  var stack = [];
  var lastSnapshot = null;
  var restoring = false;
  var undoTimer = null;

  function cloneState(){
    try { return JSON.parse(JSON.stringify(STATE)); } catch(e) { return null; }
  }
  function loadHistory(){
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) stack = JSON.parse(raw) || [];
    } catch(e) { stack = []; }
  }
  function saveHistory(){
    try { localStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX))); } catch(e) {}
  }
  function rememberBeforeSave(){
    if (restoring) return;
    var current = cloneState();
    if (!current) return;
    if (lastSnapshot) {
      var a = JSON.stringify(lastSnapshot), b = JSON.stringify(current);
      if (a !== b) stack.push(lastSnapshot);
    }
    lastSnapshot = current;
    stack = stack.slice(-MAX);
    saveHistory();
  }
  function showUndoToast(message){
    var old = document.getElementById('kopeykaUndoToast');
    if (old) old.remove();
    if (undoTimer) clearTimeout(undoTimer);

    var toast = document.createElement('div');
    toast.id = 'kopeykaUndoToast';
    toast.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:95;display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);font:500 13px Inter,system-ui,sans-serif;';

    var text = document.createElement('span');
    text.textContent = message || 'Действие выполнено';
    text.style.flex = '1';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Отменить';
    btn.style.cssText = 'border:0;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:8px 11px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;';
    btn.onclick = function(){
      if (undoTimer) clearTimeout(undoTimer);
      restorePrevious();
      var current = document.getElementById('kopeykaUndoToast');
      if (current) current.remove();
    };

    toast.appendChild(text);
    toast.appendChild(btn);
    document.body.appendChild(toast);
    undoTimer = setTimeout(function(){
      var current = document.getElementById('kopeykaUndoToast');
      if (current) current.remove();
    }, 7000);
  }

  function restorePrevious(){
    if (!stack.length) {
      if (typeof showToast === 'function') showToast('Нечего отменять');
      return;
    }
    var previous = stack.pop();
    restoring = true;
    try {
      STATE = JSON.parse(JSON.stringify(previous));
      lastSnapshot = cloneState();
      if (typeof persist === 'function') persist();
      if (typeof render === 'function') render();
      saveHistory();
      if (typeof showToast === 'function') showToast('Последнее действие отменено');
    } catch(e) {
      console.error('[Kopeyka] undo failed', e);
      stack.push(previous);
    } finally { restoring = false; }
  }

  loadHistory();
  lastSnapshot = cloneState();

  if (typeof window.persist === 'function') {
    var originalPersist = window.persist;
    window.persist = function(){
      rememberBeforeSave();
      return originalPersist.apply(this, arguments);
    };
  }

  document.addEventListener('keydown', function(e){
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    restorePrevious();
  });

  window.kopeykaUndo = restorePrevious;
  window.kopeykaShowUndo = showUndoToast;
})();