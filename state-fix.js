/* KOPEYKA state-fix v1 — runs early, normalizes STATE, prevents crash/rollback */
(function(){
'use strict';
function fix(){
  try{
    if(typeof STATE==='undefined'||!STATE)return;
    if(!Array.isArray(STATE.debts))STATE.debts=[];
    if(!Array.isArray(STATE.income))STATE.income=[];
    if(!Array.isArray(STATE.expenses))STATE.expenses=[];
    if(!Array.isArray(STATE.recurring))STATE.recurring=[];
    if(!Array.isArray(STATE.reserves))STATE.reserves=[];
    if(!Array.isArray(STATE.reserveOps))STATE.reserveOps=[];
    if(!STATE.settings||typeof STATE.settings!=='object')STATE.settings={};
    if(typeof STATE.settings.currentBalance!=='number')STATE.settings.currentBalance=Number(STATE.settings.currentBalance)||0;
    if(!STATE.shiftsOverride||typeof STATE.shiftsOverride!=='object')STATE.shiftsOverride={};
  }catch(e){console.warn('state-fix',e)}
}
window.ensureState=function(incoming){
  try{
    if(incoming&&typeof incoming==='object'){
      if(typeof STATE==='undefined'||!STATE)window.STATE=incoming;else Object.assign(STATE,incoming);
    }
    fix();
    return STATE;
  }catch(e){console.warn('ensureState',e);return STATE}
};
// patch after load
setTimeout(fix,0);
setInterval(fix,2000);
// wrap persist if present
setTimeout(function(){
  if(typeof window.persist==='function'&&!window.persist.__fixed){
    var p=window.persist;
    window.persist=function(){fix();return p.apply(this,arguments)};
    window.persist.__fixed=true;
  }
  if(typeof window.saveState==='function'&&!window.saveState.__fixed){
    var s=window.saveState;
    window.saveState=function(){fix();return s.apply(this,arguments)};
    window.saveState.__fixed=true;
  }
},100);
})();
