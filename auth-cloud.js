/* KOPEYKA CLOUD v9 — account UI + cloud sync (normalize, no silent overwrite) */
(function(){'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co',KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_KEY='kopeyka_state_v1';
let sb=null,ready=false,saving=false,lastSent='',currentUser=null,bootDone=false;

function injectUiStyles(){
  if(document.getElementById('kc-ui-v8'))return;
  const s=document.createElement('style');s.id='kc-ui-v8';
  s.textContent=`#kc-account{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:12px;z-index:30001;font:12px Inter,system-ui,sans-serif}#kc-account-btn{width:42px;height:42px;padding:0!important;border-radius:50%!important;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}#kc-account-btn #kc-avatar{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--text);background:var(--surface-2)}#kc-dot{position:absolute!important;right:1px;bottom:1px;width:10px!important;height:10px!important;border:2px solid var(--surface);z-index:2}#kc-account-menu{right:0!important;top:50px!important;width:min(280px,calc(100vw - 24px))!important;max-height:calc(100dvh - 72px);overflow:auto}@media(max-width:899px){.topbar{padding-right:66px!important;min-height:64px}#main{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}.bottomnav{height:76px;min-height:76px;padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px))!important}.navbtn{min-width:0;padding:5px 7px!important;gap:3px!important}.navbtn svg{width:21px;height:21px}.fab{bottom:calc(88px + env(safe-area-inset-bottom,0px))!important;right:16px!important;width:54px;height:54px}#kc-auth{padding:calc(18px + env(safe-area-inset-top,0px)) 14px calc(18px + env(safe-area-inset-bottom,0px))!important}}@media(min-width:900px){#kc-account{top:14px;right:18px}.bottomnav{height:100vh}.fab{bottom:32px}}`;
  document.head.appendChild(s);
}

function loadSDK(){
  return new Promise((ok,bad)=>{
    if(window.supabase)return ok();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=ok;s.onerror=()=>bad(new Error('Не удалось загрузить Supabase SDK'));
    document.head.appendChild(s);
  });
}

function client(){
  if(!sb&&window.supabase){
    sb=window.supabase.createClient(URL,KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  return sb;
}

function status(text,good){
  let x=document.getElementById('kc-cloud');
  if(!x){
    x=document.createElement('div');x.id='kc-cloud';
    x.style.cssText='position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:30000;font:11px Inter,system-ui,sans-serif;background:var(--surface);padding:6px 10px;border-radius:9px;border:1px solid var(--border);box-shadow:var(--shadow);pointer-events:none;max-width:calc(100vw - 120px);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    document.body.appendChild(x);
  }
  x.style.color=good?'var(--safe)':'var(--danger)';
  x.textContent=text;
  clearTimeout(status._t);
  if(good) status._t=setTimeout(()=>{if(x.textContent===text)x.style.display='none'},3200);
  else x.style.display='';
}

function accountUI(){
  let x=document.getElementById('kc-account');
  if(x)return x;
  x=document.createElement('div');x.id='kc-account';
  x.innerHTML='<button id="kc-account-btn" class="icon-btn" aria-label="Профиль"><span id="kc-avatar">•••</span><span id="kc-dot"></span></button><div id="kc-account-menu" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:12px;box-shadow:var(--shadow)"><div style="font-weight:700" id="kc-user-email"></div><div id="kc-sync-label" style="font-size:11px;color:var(--text-dim);margin-top:4px">Облако не синхронизировано</div><button id="kc-sync" class="btn btn-secondary btn-block" style="margin-top:10px">Синхронизировать сейчас</button><button id="kc-logout" class="btn btn-danger btn-block" style="margin-top:8px">Выйти из аккаунта</button></div>';
  document.body.appendChild(x);
  document.getElementById('kc-account-btn').onclick=()=>{
    const m=document.getElementById('kc-account-menu');
    m.style.display=m.style.display==='none'?'block':'none';
  };
  document.getElementById('kc-sync').onclick=async()=>{
    status('синхронизация…',true);
    await waitForState();
    await saveCloud(true);
  };
  document.getElementById('kc-logout').onclick=async()=>{
    try{await client().auth.signOut()}catch(_){}
    currentUser=null;ready=false;lastSent='';
    setAccount(null);status('выполнен выход',false);auth();
  };
  return x;
}

function setAccount(user){
  accountUI();
  const email=user?.email||'';
  const avatar=document.getElementById('kc-avatar');
  if(avatar)avatar.textContent=email?email.slice(0,1).toUpperCase():'?';
  const em=document.getElementById('kc-user-email');
  if(em)em.textContent=email||'Нет активного аккаунта';
  const dot=document.getElementById('kc-dot');
  if(dot)dot.style.background=user?'var(--safe)':'var(--text-faint)';
}

function setSyncLabel(t){
  const x=document.getElementById('kc-sync-label');
  if(x)x.textContent=t;
}

function auth(){
  if(document.getElementById('kc-auth'))return;
  const x=document.createElement('div');x.id='kc-auth';
  x.style.cssText='position:fixed;inset:0;z-index:29999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:18px';
  x.innerHTML='<div style="width:min(430px,100%);background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:24px"><h2 style="margin-top:0">Копейка</h2><p>Войди в аккаунт, чтобы данные синхронизировались между браузерами и устройствами.</p><input id="kc-email" type="email" placeholder="Email" style="width:100%;margin:8px 0;padding:13px"><input id="kc-pass" type="password" placeholder="Пароль" style="width:100%;margin:8px 0;padding:13px"><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-secondary" id="kc-signup">Создать аккаунт</button><button class="btn btn-primary" id="kc-login">Войти</button></div><div id="kc-msg" style="font-size:12px;margin-top:10px"></div></div>';
  document.body.appendChild(x);
  document.getElementById('kc-login').onclick=()=>doAuth(false);
  document.getElementById('kc-signup').onclick=()=>doAuth(true);
}

function authMsg(t){auth();const m=document.getElementById('kc-msg');if(m)m.textContent=t}
function closeAuth(){const x=document.getElementById('kc-auth');if(x)x.remove()}

function waitForState(timeout=8000){
  return new Promise(resolve=>{
    if(typeof STATE!=='undefined'&&STATE)return resolve(true);
    const started=Date.now();
    const timer=setInterval(()=>{
      if((typeof STATE!=='undefined'&&STATE)||(Date.now()-started>=timeout)){
        clearInterval(timer);resolve(!!(typeof STATE!=='undefined'&&STATE));
      }
    },40);
  });
}

function normalizeState(incoming){
  const base=(typeof defaultState==='function')?defaultState():{
    version:1,
    settings:{currentBalance:0,cyclePattern:['day','day','night','night','off','off'],shiftTypes:{},theme:'system'},
    shiftsOverride:{},income:[],expenses:[],recurring:[],reserves:[],reserveOps:[],categories:[],debts:[]
  };
  const src=incoming&&typeof incoming==='object'?incoming:{};
  const out=Object.assign({},base,src);
  out.settings=Object.assign({},base.settings||{},src.settings||{});
  if(base.settings&&base.settings.shiftTypes){
    out.settings.shiftTypes=Object.assign({},base.settings.shiftTypes,(src.settings&&src.settings.shiftTypes)||{});
  }
  if(!Array.isArray(out.settings.cyclePattern)||!out.settings.cyclePattern.length){
    out.settings.cyclePattern=(base.settings&&base.settings.cyclePattern)||['day','day','night','night','off','off'];
  }
  ['shiftsOverride'].forEach(k=>{ if(!out[k]||typeof out[k]!=='object')out[k]={}; });
  ['income','expenses','recurring','reserves','reserveOps','categories','debts','notes'].forEach(k=>{
    if(!Array.isArray(out[k]))out[k]=Array.isArray(base[k])?base[k].slice():[];
  });
  out.settings.currentBalance=Number(out.settings.currentBalance)||0;
  (out.reserves||[]).forEach(r=>{
    r.saved=Number(r.saved)||0;
    r.target=Number(r.target)||0;
    r.fixedAmount=Number(r.fixedAmount)||0;
    r.percent=Number(r.percent)||0;
    if(r.active==null)r.active=true;
  });
  (out.reserveOps||[]).forEach(o=>{o.amount=Number(o.amount)||0});
  return out;
}

function applyState(raw){
  const normalized=normalizeState(raw);
  if(typeof window.setAppState==='function'){
    window.setAppState(normalized);
  }else{
    STATE=normalized;
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(STATE))}catch(_){}
    if(typeof window.render==='function')window.render();
  }
  lastSent=JSON.stringify(STATE);
  return STATE;
}

async function doAuth(signup){
  const email=document.getElementById('kc-email').value.trim();
  const password=document.getElementById('kc-pass').value;
  if(!email||password.length<6)return authMsg('Введите email и пароль минимум из 6 символов.');
  authMsg(signup?'Создаю аккаунт…':'Выполняю вход…');
  try{
    const c=client();
    const r=signup?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
    if(r.error)throw r.error;
    if(signup&&!r.data.session)return authMsg('Подтверди email, затем войди.');
    await syncSession(r.data.session);
  }catch(e){authMsg(e.message||'Ошибка авторизации')}
}

async function syncSession(session){
  if(!session||!session.user){
    currentUser=null;ready=false;setAccount(null);auth();return;
  }
  currentUser=session.user;
  setAccount(currentUser);
  closeAuth();
  status('загрузка облака…',true);
  setSyncLabel('Загрузка данных…');
  const c=client();
  try{
    await waitForState();
    let q;
    try{
      q=await c.rpc('load_user_finance_state');
    }catch(rpcErr){
      q=await c.from('user_finance_state').select('state,version,updated_at').eq('user_id',currentUser.id).maybeSingle();
      if(q.error)throw q.error;
      q={data:q.data?[{state:q.data.state,version:q.data.version}]:[]};
    }
    if(q.error)throw q.error;
    const row=Array.isArray(q.data)?q.data[0]:q.data;
    if(row&&row.state){
      applyState(row.state);
      ready=true;
      status('облако синхронизировано',true);
      setSyncLabel('Синхронизировано');
    }else{
      if(typeof STATE==='undefined'||!STATE)throw new Error('Локальное состояние ещё не готово');
      ready=true;
      const ok=await saveCloud(true);
      if(!ok)throw new Error('Не удалось записать первое состояние в облако');
      status('облако синхронизировано',true);
      setSyncLabel('Синхронизировано');
    }
  }catch(e){
    ready=false;
    console.error('CLOUD LOAD',e);
    const msg=(e&&(e.message||e.code||e.hint))||'неизвестная ошибка';
    status('ошибка облака: '+msg,false);
    setSyncLabel('Ошибка: '+msg);
  }
}

async function saveCloud(force){
  if(!currentUser){status('нет активного аккаунта',false);return false}
  if(typeof STATE==='undefined'||!STATE){
    await waitForState();
    if(typeof STATE==='undefined'||!STATE){status('состояние ещё не готово',false);return false}
  }
  if(saving)return false;
  saving=true;
  setSyncLabel('Сохранение…');
  try{
    const payload=normalizeState(STATE);
    const json=JSON.stringify(payload);
    if(!force&&json===lastSent){
      setSyncLabel('Синхронизировано');
      status('облако синхронизировано',true);
      return true;
    }
    const c=client();
    let r=await c.rpc('save_user_finance_state',{p_state:payload,p_version:9});
    if(r.error){
      console.warn('RPC save failed, upsert',r.error);
      r=await c.from('user_finance_state').upsert({
        user_id:currentUser.id,
        state:payload,
        version:9,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(r.error)throw r.error;
    }
    lastSent=json;
    try{localStorage.setItem(LOCAL_KEY,json)}catch(_){}
    status('облако синхронизировано',true);
    setSyncLabel('Синхронизировано');
    return true;
  }catch(e){
    console.error('CLOUD SAVE',e);
    const msg=(e&&(e.message||e.code))||'неизвестная ошибка';
    status('ошибка облака: '+msg,false);
    setSyncLabel('Ошибка: '+msg);
    return false;
  }finally{
    saving=false;
  }
}

async function boot(){
  if(bootDone)return;
  bootDone=true;
  try{
    injectUiStyles();
    await loadSDK();
    client();
    accountUI();
    const c=client();
    const session=await c.auth.getSession();
    if(session.error)throw session.error;
    if(session.data.session)await syncSession(session.data.session);
    else auth();
    c.auth.onAuthStateChange((_e,s)=>setTimeout(()=>syncSession(s),80));
    let lastObserved='';
    setInterval(()=>{
      if(!currentUser||!ready||typeof STATE==='undefined'||!STATE)return;
      try{
        const j=JSON.stringify(STATE);
        if(j!==lastObserved){lastObserved=j;saveCloud(false)}
      }catch(_){}
    },1500);
  }catch(e){
    console.error('CLOUD BOOT',e);
    authMsg('Ошибка подключения к облаку: '+(e.message||''));
  }
}

window.kopeykaCloud={
  save:()=>saveCloud(true),
  logout:async()=>{
    try{await client().auth.signOut()}catch(_){}
    currentUser=null;ready=false;setAccount(null);auth();
  },
  user:()=>currentUser,
  normalizeState
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
