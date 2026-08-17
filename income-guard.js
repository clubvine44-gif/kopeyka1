/* Income guard v1: preserves a user-entered income through accidental render/save resets. */
(function(){'use strict';
const KEY='kopeyka_income_guard_v1';
const copy=()=>Array.isArray(window.STATE?.income)?JSON.parse(JSON.stringify(STATE.income)):[];
const nonempty=a=>Array.isArray(a)&&a.length>0;
const shadow=()=>{try{const a=copy();if(nonempty(a))localStorage.setItem(KEY,JSON.stringify(a))}catch(_){}};
const restore=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'null');if(nonempty(a)&&!nonempty(window.STATE?.income)){STATE.income=a;return true}}catch(_){}return false};
function wrap(name){if(typeof window[name]!=='function'||window[name].__incomeGuard)return;const real=window[name];const w=function(){const before=copy();if(nonempty(before))shadow();const result=real.apply(this,arguments);if(nonempty(before)&&!nonempty(STATE.income)){STATE.income=before;shadow();if(name==='render'){try{real.apply(this,arguments)}catch(_){}}}return result};w.__incomeGuard=true;window[name]=w}
wrap('saveState');wrap('render');
setInterval(()=>{if(window.STATE&&nonempty(STATE.income))shadow();},250);
})();
