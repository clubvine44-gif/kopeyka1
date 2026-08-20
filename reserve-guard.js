/* Reserve deposit guard — нельзя отложить больше, чем в кассе */
(function(){
'use strict';
function patch(){
  if(typeof openReserveOpModal!=='function')return false;
  const orig=openReserveOpModal;
  window.openReserveOpModal=function(reserveId,type){
    orig(reserveId,type);
    setTimeout(function(){
      const btn=document.querySelector('[data-act=ok]');
      if(!btn||btn.__guarded)return;
      btn.__guarded=true;
      btn.addEventListener('click',function(ev){
        try{
          const amount=(typeof toKop==='function')?toKop(document.getElementById('fAmt').value):Math.round(Number(document.getElementById('fAmt').value||0)*100);
          if(type==='deposit'&&amount>0){
            let cash=0;
            try{
              const per=(typeof currentPeriod==='function')?currentPeriod():null;
              if(per&&typeof computePeriodSummary==='function'){
                const s=computePeriodSummary(STATE,per.start,per.end);
                cash=s.currentBalance!=null?s.currentBalance:(STATE.settings.currentBalance||0);
              }else cash=STATE.settings.currentBalance||0;
            }catch(_){cash=STATE.settings.currentBalance||0}
            if(amount>Math.max(0,cash)){
              ev.preventDefault();ev.stopPropagation();
              if(typeof showToast==='function')showToast('Нельзя отложить больше, чем есть в кассе ('+(typeof fmt==='function'?fmt(Math.max(0,cash)):Math.round(Math.max(0,cash)/100)+' ₽')+')');
              return false;
            }
          }
        }catch(e){console.warn(e)}
      },true);
    },50);
  };
  return true;
}
if(!patch())setTimeout(patch,100);
setTimeout(patch,500);
})();
