/* KOPEYKA CLOUD v9 — account UI + cloud sync (normalize, no silent overwrite) */
(function(){'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co',KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_KEY='kopeyka_state_v1';
let sb=null,ready=false,saving=false,lastSent='',currentUser=null,bootDone=false;

function injectUiStyles(){
  if(document.getElementById('kc-ui-v8'))return;
  const s=document.createElement('style');s.id='kc-ui-v8';
  s.textContent=`#kc-account{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:12px;z-index:30001;font:12px Inter,system-ui,sans-serif}#kc-account-btn{width:42px;height:42px;padding:0!important;border-radius:50%!important;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}#kc-account-btn #kc-avatar{width:100%;height:100%;display:flex;align-items:center;justify-content:cente