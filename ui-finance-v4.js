/* KOPEYKA UI loader + undo manager */
(function(){
  'use strict';
  // Keep the original finance UI intact in a separate blob, then load it synchronously.
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

  // Undo any saved application action. Every persist() call becomes one undo point.
  // The snapshot is taken BEFORE the new state is written, so an accidental action
  // (for example, marking a debt as paid) can be restored exactly.
  var KEY = 'kopeyka_undo_history_v1';
  var MAX = 20;
  var stack = [];
  var lastSnapshot = null;
  var restoring = false;

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

  // Keyboard shortcut: Ctrl/Cmd+Z. Do not interfere with text fields.
  document.addEventListener('keydown', function(e){
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    restorePrevious();
  });

  // Compact floating undo button. It stays available on every screen.
  function addUndoButton(){
    if (document.getElementById('kopeykaUndoBtn')) return;
    var b = document.createElement('button');
    b.id = 'kopeykaUndoBtn';
    b.type = 'button';
    b.textContent = '↶ Отменить';
    b.title = 'Отменить последнее действие';
    b.style.cssText = 'position:fixed;right:18px;bottom:calc(148px + env(safe-area-inset-bottom,0px));z-index:90;border:1px solid var(--border);border-radius:999px;padding:9px 13px;background:var(--surface);color:var(--text);font:600 13px Inter,system-ui,sans-serif;box-shadow:var(--shadow);cursor:pointer;opacity:.92;';
    b.onclick = restorePrevious;
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addUndoButton); else addUndoButton();
  window.kopeykaUndo = restorePrevious;
})();