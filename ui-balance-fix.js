/* Main balance display: show money that is actually free to spend now. */
(function(){'use strict';
setTimeout(function(){
  if(typeof window.renderHomeV5!=='function') return;
  const original=window.renderHomeV5;
  window.renderHomeV5=function(){
    original();
    const {start,end}=currentPeriod(), s=window.financeCore(STATE,start,end);
    const cards=document.querySelectorAll('#main .grid2');
    if(cards.length){
      const first=cards[0], card=first.children[0];
      if(card){
        const nums=card.querySelectorAll('.mid-number,.big-number');
        if(nums.length) nums[0].textContent=fmt(Math.max(0,Math.round(s.strictAvailable)));
      }
      const label=card&&card.querySelector('.label');
      if(label) label.textContent='Доступно сейчас';
      const faint=card&&card.querySelector('.faint');
      if(faint) faint.textContent='после расходов, долгов и резервов';
    }
  };
  window.renderHomeV5.__balanceFix=true;
  if(typeof render==='function' && ROUTE==='home') render();
},50);
})();
