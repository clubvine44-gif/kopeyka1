/* KOPEYKA UI loader + undo manager */
(function(){
  'use strict';
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'ui-finance-v4-core.js', false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      (0, eval)(xhr.responseText + '\n//# sourceURL=ui-finance-v4-core.js');
    } else throw new Error('Не удалось загрузить ui-finance-v4-core.js: ' + xhr.status);
  } catch (e) { console.error('[Kopeyka] finance UI load failed', e); }

  var KEY='kopeyka_undo_history_v1', MAX=20, stack=[], lastSnapshot=null, restoring=false;
  function cloneState(){try{return JSON.parse(JSON.stringify(STATE))}catch(e){return null}}
  function loadHistory(){try{stack=JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch(e){stack=[]}}
  function saveHistory(){try{localStorage.setItem(KEY,JSON.stringify(stack.slice(-MAX)))}catch(e){}}
  function rememberBeforeSave(){if(restoring||window.__KO_UNDO_RESTORE__)return;var current=cloneState();if(!current)return;if(lastSnapshot&&JSON.stringify(lastSnapshot)!==JSON.stringify(current))stack.push(lastSnapshot);lastSnapshot=current;stack=stack.slice(-MAX);saveHistory()}
  loadHistory();lastSnapshot=cloneState();
  if(typeof window.persist==='function'){var originalPersist=window.persist;window.persist=function(){rememberBeforeSave();return originalPersist.apply(this,arguments)}}
  document.addEventListener('keydown',function(e){if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z')return;var tag=document.activeElement&&document.activeElement.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;e.preventDefault();if(window.koOpenUndo)window.koOpenUndo()});
  window.kopeykaUndo=function(){if(window.koOpenUndo)window.koOpenUndo()};
  var s=document.createElement('script');s.src='notes-undo.js?v=2';s.async=false;s.onload=function(){console.log('[Kopeyka] notes/undo ready')};s.onerror=function(e){console.error('[Kopeyka] notes-undo.js load failed',e)};document.head.appendChild(s);
})();