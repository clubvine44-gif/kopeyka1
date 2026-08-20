/* KOPEYKA CLOUD v9 — account UI + cloud sync (normalize, no silent overwrite) */
(function(){'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co',KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_KEY='kopeyka_state_v1';
let sb=null,ready=false,saving=false,lastSent='',currentUser=null,bootDone=false;

function injectUiStyles(){
  if(document.getElementById('kc-ui-v8'))return;
  const s=document.createElement('style');s.id='kc-ui-v8';
  s.textContent=`#kc-account{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:12px;z-index:30001;font:12px Inter,system-ui,sans-serif}#kc-account-btn{width:42px;height:42px;padding:0!important;border-radius:50%!important;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}#kc-account-btn #kc-avatar{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--text);background:var(--surface-2)}#kc-dot{position:absolute!important;right:1px;bottom:1px;width:10px!important;height:10px!important;border:2px solid var(--surface);z-index:2}#kc-account-menu{right:0!important;top:50px!important;width:min(280px,calc(100vw - 24px))!important;max-height:calc(100dvh - 72px);overflow:auto}@media(max-width:899px){.topbar{padding-right:66px!important;min-height:64px}#main{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}.bottomnav{height:76px;min-height:76px;padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px))!important}.navbtn{min-width:0;padding:5px 7px!important;gap:3px!important}.navbtn svg{width:21px;height:21px}.fab{bottom:calc(88px + env(safe-area-inset-bottom,0px))!important;right:16px!important;width:54px;height:54px}#kc-auth{padding:calc(18px + env(safe-area-inset-top,0px)) 14p