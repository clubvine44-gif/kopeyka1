/* Main balance display: money actually free to spend now. */
(function(){'use strict';
function apply(){
  if(typeof ROUTE==='undefined'||ROUTE!=='home'||typeof currentPeriod!=='function'||typeof window.financeCore!=='function')return;
  const {start,end}=currentPeriod(),s=window.financeCore(STATE,start,end);
  const first=document.querySelector('#main .grid2');
  const card=first&&first.children[0];
  if(!card)return;
  const value=card.querySelector('.mid-number,.big-number');
  const faint=card.querySelector('.faint');
  if(value)value.textContent=fmt(Math.max(0,Math.round(s.strictAvailable)));
  if(faint)faint.textContent='после расходов, долгов и резервов';
}
setTimeout(function(){apply();const main=document.getElementById('main');if(main)new MutationObserver(()=>setTimeout(apply,0)).observe(main,{childList:true,subtree:true});},100);
})();
