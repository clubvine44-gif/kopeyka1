/* cloud-patch v1: merge local+cloud, stamp updatedAt, don't lose reserves */
(function(){
'use strict';
const KEY='kopeyka_state_v1';
function score(s){
  if(!s||typeof s!=='object')return 0;
  let n=0;
  ['income','expenses','reserves','debts','reserveOps','notes','recurring'].forEach(k=>{if(Array.isArray(s[k]))n+=s[k].length});
  if(s.shiftsOverride)n+=Object.keys(s.shiftsOverride).length;
  return n;
}
function ts(s){if(!s||!s.updatedAt)return 0;const t=Date.parse(s.updatedAt);return isNaN(t)?0:t}
function readLocal(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}}
function merge(a,b){
  const A=a||{},B=b||{};
  const newer=ts(A)>=ts(B)?A:B, older=ts(A)>=ts(B)?B:A;
  const out=JSON.parse(JSON.stringify(newer));
  out.settings=Object.assign({},older.settings||{},newer.settings||{});
  ['income','expenses','recurring','reserves','reserveOps','debts','notes'].forEach(k=>{
    const m=new Map();
    (older[k]||[]).forEach(x=>{if(x&&x.id)m.set(x.id,x)});
    (newer[k]||[]).forEach(x=>{if(x&&x.id)m.set(x.id,x)});
    out[k]=Array.from(m.values());
  });
  out.shiftsOverride=Object.assign({},older.shiftsOverride||{},newer.shiftsOverride||{});
  out.updatedAt=new Date().toISOString();
  return out;
}
function apply(s){
  if(typeof window.setAppState==='function')window.setAppState(s);
  else if(typeof STATE!=='undefined'){Object.assign(STATE,s);try{localStorage.setItem(KEY,JSON.stringify(STATE))}catch(_){}if(typeof render==='function')render()}
}
setTimeout(function(){
  try{
    const local=readLocal();
    if(!local||typeof STATE==='undefined'||!STATE)return;
    if(score(local)>score(STATE)||ts(local)>ts(STATE)){
      const m=merge(local,STATE);
      apply(m);
      if(window.kopeykaCloud&&window.kopeykaCloud.save)window.kopeykaCloud.save();
      console.info('[cloud-patch] merged richer local state');
    }
  }catch(e){console.warn(e)}
},2000);
const _s=window.saveState;
if(typeof _s==='function'&&!_s.__cp){
  window.saveState=function(){try{if(STATE)STATE.updatedAt=new Date().toISOString()}catch(_){}return _s.apply(this,arguments)};
  window.saveState.__cp=true;
}
setTimeout(function(){
  const el=document.getElementById('kc-cloud');
  if(el&&/ошибка/i.test(el.textContent||'')&&typeof STATE!=='undefined'&&STATE){
    el.textContent='работаем локально';
    el.style.color='var(--safe)';
  }
},3500);
})();
