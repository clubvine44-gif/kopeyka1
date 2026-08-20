/* KOPEYKA CLOUD v11 — optional cloud, soft errors, merge local+cloud */
(function(){'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co',KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_KEY='kopeyka_state_v1';
let sb=null,ready=false,saving=false,lastSent='',currentUser=null,bootDone=false;

function injectUiStyles(){
  if(document.getElementById('kc-ui-v11'))return;
  const s=document.createElement('style');s.id='kc-ui-v11';
  s.textContent=`#kc-account{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:12px;z-index:30001;font:12px Inter,system-ui,sans-serif}#kc-account-btn{width:42px;height:42px;padding:0!important;border-radius:50%!important;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}#kc-account-btn #kc-avatar{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--text);background:var(--surface-2)}#kc-dot{position:absolute!important;right:1px;bottom:1px;width:10px!important;height:10px!important;border:2px solid var(--surface);z-index:2}#kc-account-menu{right:0!important;top:50px!important;width:min(280px,calc(100vw - 24px))!important;max-height:calc(100dvh - 72px);overflow:auto}@media(max-width:899px){.topbar{padding-right:66px!important;min-height:64px}#main{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}.bottomnav{height:76px;min-height:76px;padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px))!important}.navbtn{min-width:0;padding:5px 7px!important;gap:3px!important}.navbtn svg{width:21px;height:21px}.fab{bottom:calc(88px + env(safe-area-inset-bottom,0px))!important;right:16px!important;width:54px;height:54px}}#kc-cloud{pointer-events:none}`;
  document.head.appendChild(s);
}

function loadSDK(){
  return new Promise((ok,bad)=>{
    if(window.supabase)return ok();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=ok;s.onerror=()=>bad(new Error('SDK'));
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

function status(text,tone){
  let x=document.getElementById('kc-cloud');
  if(!x){
    x=document.createElement('div');x.id='kc-cloud';
    x.style.cssText='position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:30000;font:11px Inter,system-ui,sans-serif;background:var(--surface);padding:6px 10px;border-radius:9px;border:1px solid var(--border);box-shadow:var(--shadow);max-width:calc(100vw - 120px);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    document.body.appendChild(x);
  }
  x.style.display='';
  const colors={ok:'var(--safe)',warn:'#E8A838',err:'var(--danger)',info:'var(--text-dim)'};
  x.style.color=colors[tone]||colors.info;
  x.textContent=text;
  clearTimeout(status._t);
  if(tone==='ok'||tone==='info') status._t=setTimeout(()=>{if(x.textContent===text)x.style.display='none'},4500);
}

function accountUI(){
  let x=document.getElementById('kc-account');
  if(x)return x;
  x=document.createElement('div');x.id='kc-account';
  x.innerHTML='<button id="kc-account-btn" class="icon-btn" aria-label="Профиль"><span id="kc-avatar">•••</span><span id="kc-dot"></span></button><div id="kc-account-menu" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:12px;box-shadow:var(--shadow)"><div style="font-weight:700" id="kc-user-email"></div><div id="kc-sync-label" style="font-size:11px;color:var(--text-dim);margin-top:4px">Локальный режим</div><button id="kc-sync" class="btn btn-secondary btn-block" style="margin-top:10px">Синхронизировать</button><button id="kc-login-btn" class="btn btn-primary btn-block" style="margin-top:8px">Войти в облако</button><button id="kc-logout" class="btn btn-danger btn-block" style="margin-top:8px;display:none">Выйти</button></div>';
  document.body.appendChild(x);
  document.getElementById('kc-account-btn').onclick=()=>{
    const m=document.getElementById('kc-account-menu');
    m.style.display=m.style.display==='none'?'block':'none';
  };
  document.getElementById('kc-sync').onclick=async()=>{
    if(!currentUser){auth();return;}
    status('синхронизация…','info');
    await waitForState();
    await saveCloud(true);
  };
  document.getElementById('kc-login-btn').onclick=()=>auth();
  document.getElementById('kc-logout').onclick=async()=>{
    try{await client().auth.signOut()}catch(_){}
    currentUser=null;ready=false;lastSent='';
    setAccount(null);
    status('работаем локально','info');
    setSyncLabel('Локальный режим');
  };
  document.addEventListener('click',(e)=>{
    const m=document.getElementById('kc-account-menu');
    const a=document.getElementById('kc-account');
    if(m&&a&&!a.contains(e.target))m.style.display='none';
  });
  return x;
}

function setAccount(user){
  accountUI();
  const email=user&&user.email||'';
  const avatar=document.getElementById('kc-avatar');
  if(avatar)avatar.textContent=email?email.slice(0,1).toUpperCase():'?';
  const em=document.getElementById('kc-user-email');
  if(em)em.textContent=email||'Не выполнен вход';
  const dot=document.getElementById('kc-dot');
  if(dot)dot.style.background=user?'var(--safe)':'var(--text-faint)';
  const lo=document.getElementById('kc-logout');
  const li=document.getElementById('kc-login-btn');
  if(lo)lo.style.display=user?'block':'none';
  if(li)li.style.display=user?'none':'block';
}

function setSyncLabel(t){
  const x=document.getElementById('kc-sync-label');
  if(x)x.textContent=t;
}

function auth(){
  if(document.getElementById('kc-auth'))return;
  const x=document.createElement('div');x.id='kc-auth';
  x.style.cssText='position:fixed;inset:0;z-index:29999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:18px';
  x.innerHTML='<div style="width:min(430px,100%);background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:24px;position:relative"><button id="kc-auth-close" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-dim);line-height:1">×</button><h2 style="margin-top:0">Облако Копейки</h2><p style="color:var(--text-dim);font-size:14px">Можно работать и без входа — данные хранятся в браузере. Вход нужен только для синхронизации между устройствами.</p><input id="kc-email" type="email" placeholder="Email" style="width:100%;margin:8px 0;padding:13px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"><input id="kc-pass" type="password" placeholder="Пароль" style="width:100%;margin:8px 0;padding:13px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-secondary" id="kc-signup">Создать</button><button class="btn btn-primary" id="kc-login">Войти</button></div><div id="kc-msg" style="font-size:12px;margin-top:10px;color:var(--text-dim)"></div></div>';
  document.body.appendChild(x);
  document.getElementById('kc-auth-close').onclick=closeAuth;
  x.addEventListener('click',e=>{if(e.target===x)closeAuth()});
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

function score(s){
  if(!s||typeof s!=='object')return 0;
  let n=0;
  ['income','expenses','reserves','debts','reserveOps','notes','recurring'].forEach(k=>{if(Array.isArray(s[k]))n+=s[k].length});
  if(s.shiftsOverride)n+=Object.keys(s.shiftsOverride).length;
  return n;
}

function ts(s){if(!s||!s.updatedAt)return 0;const t=Date.parse(s.updatedAt);return isNaN(t)?0:t}

function normalizeState(incoming){
  const base=(typeof defaultState==='function')?defaultState():{
    version:1,
    settings:{currentBalance:0,cyclePattern:['day','day','night','night','off','off'],shiftTypes:{},theme:'system'},
    shiftsOverride:{},income:[],expenses:[],recurring:[],reserves:[],reserveOps:[],categories:[],debts:[],notes:[]
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
  if(!out.shiftsOverride||typeof out.shiftsOverride!=='object')out.shiftsOverride={};
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
  if(!out.updatedAt)out.updatedAt=new Date().toISOString();
  return out;
}

function mergeStates(a,b){
  const A=normalizeState(a),B=normalizeState(b);
  const newer=ts(A)>=ts(B)?A:B;
  const pick = (score(A)>score(B)+2)?A:(score(B)>score(A)+2)?B:newer;
  const other = pick===A?B:A;
  const out=JSON.parse(JSON.stringify(pick));
  out.settings=Object.assign({},other.settings||{},pick.settings||{});
  ['income','expenses','recurring','reserves','reserveOps','debts','notes'].forEach(k=>{
    const m=new Map();
    (other[k]||[]).forEach(x=>{if(x&&x.id)m.set(x.id,x)});
    (pick[k]||[]).forEach(x=>{if(x&&x.id)m.set(x.id,x)});
    out[k]=Array.from(m.values());
  });
  out.shiftsOverride=Object.assign({},other.shiftsOverride||{},pick.shiftsOverride||{});
  out.updatedAt=new Date().toISOString();
  return normalizeState(out);
}

function readLocal(){
  try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'null')}catch(_){return null}
}

function applyState(raw){
  const normalized=normalizeState(raw);
  if(typeof window.setAppState==='function'){
    window.setAppState(normalized);
  }else if(typeof STATE!=='undefined'){
    try{
      Object.keys(STATE).forEach(k=>{if(!(k in normalized))delete STATE[k]});
      Object.assign(STATE,normalized);
    }catch(_){ window.STATE=normalized; }
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(STATE))}catch(_){}
    if(typeof window.render==='function')window.render();
  }else{
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(normalized))}catch(_){}
  }
  lastSent=JSON.stringify(normalized);
  return normalized;
}

async function doAuth(signup){
  const email=document.getElementById('kc-email').value.trim();
  const password=document.getElementById('kc-pass').value;
  if(!email||password.length<6)return authMsg('Email и пароль (мин. 6 символов)');
  authMsg(signup?'Создаю аккаунт…':'Вход…');
  try{
    const c=client();
    const r=signup?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
    if(r.error)throw r.error;
    if(signup&&!r.data.session)return authMsg('Подтверди email, затем войди.');
    await syncSession(r.data.session);
  }catch(e){authMsg((e&&e.message)||'Ошибка входа')}
}

async function syncSession(session){
  if(!session||!session.user){
    currentUser=null;ready=false;setAccount(null);
    setSyncLabel('Локальный режим');
    return;
  }
  currentUser=session.user;
  setAccount(currentUser);
  closeAuth();
  status('загрузка облака…','info');
  setSyncLabel('Загрузка…');
  const c=client();
  try{
    await waitForState();
    let row=null;
    try{
      const q=await c.rpc('load_user_finance_state');
      if(q.error)throw q.error;
      const d=q.data;
      row=Array.isArray(d)?d[0]:d;
    }catch(rpcErr){
      const q=await c.from('user_finance_state').select('state,version,updated_at').eq('user_id',currentUser.id).maybeSingle();
      if(q.error)throw q.error;
      row=q.data;
    }
    const local=readLocal()||(typeof STATE!=='undefined'?STATE:null);
    if(row&&row.state){
      const merged=mergeStates(local,row.state);
      applyState(merged);
      ready=true;
      status('облако синхронизировано','ok');
      setSyncLabel('Синхронизировано');
      saveCloud(true).catch(()=>{});
    }else{
      ready=true;
      if(local&&score(local)>0){
        const ok=await saveCloud(true);
        status(ok?'облако синхронизировано':'данные сохранены локально','ok');
        setSyncLabel(ok?'Синхронизировано':'Локально (облако не записалось)');
      }else{
        status('облако подключено','ok');
        setSyncLabel('Синхронизировано');
      }
    }
  }catch(e){
    ready=false;
    console.error('CLOUD LOAD',e);
    const msg=(e&&(e.message||e.code||e.hint))||'неизвестно';
    status('облако недоступно — локально','warn');
    setSyncLabel('Офлайн: '+msg);
  }
}

async function saveCloud(force){
  if(!currentUser){status('нужен вход в облако','warn');return false}
  if(typeof STATE==='undefined'||!STATE){
    await waitForState();
    if(typeof STATE==='undefined'||!STATE){return false}
  }
  if(saving)return false;
  saving=true;
  setSyncLabel('Сохранение…');
  try{
    const payload=normalizeState(STATE);
    payload.updatedAt=new Date().toISOString();
    const json=JSON.stringify(payload);
    if(!force&&json===lastSent){
      setSyncLabel('Синхронизировано');
      return true;
    }
    const c=client();
    let r=await c.rpc('save_user_finance_state',{p_state:payload,p_version:11});
    if(r.error){
      console.warn('RPC save failed, upsert',r.error);
      r=await c.from('user_finance_state').upsert({
        user_id:currentUser.id,
        state:payload,
        version:11,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(r.error)throw r.error;
    }
    lastSent=json;
    try{localStorage.setItem(LOCAL_KEY,json)}catch(_){}
    status('облако синхронизировано','ok');
    setSyncLabel('Синхронизировано');
    ready=true;
    return true;
  }catch(e){
    console.error('CLOUD SAVE',e);
    const msg=(e&&(e.message||e.code))||'ошибка';
    status('сохранено локально','warn');
    setSyncLabel('Локально: '+msg);
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
    accountUI();
    setAccount(null);
    setSyncLabel('Локальный режим');
    await loadSDK();
    client();
    const c=client();
    const session=await c.auth.getSession();
    if(session.error)throw session.error;
    if(session.data.session){
      await syncSession(session.data.session);
    }else{
      status('локальный режим','info');
    }
    c.auth.onAuthStateChange((_e,s)=>setTimeout(()=>syncSession(s),80));
    let lastObserved='';
    setInterval(()=>{
      if(!currentUser||!ready||typeof STATE==='undefined'||!STATE)return;
      try{
        const j=JSON.stringify(STATE);
        if(j!==lastObserved){lastObserved=j;saveCloud(false)}
      }catch(_){}
    },2000);
  }catch(e){
    console.error('CLOUD BOOT',e);
    accountUI();
    status('локальный режим','info');
    setSyncLabel('Локально');
  }
}

window.kopeykaCloud={
  save:()=>saveCloud(true),
  logout:async()=>{
    try{await client().auth.signOut()}catch(_){}
    currentUser=null;ready=false;setAccount(null);
  },
  user:()=>currentUser,
  normalizeState,
  mergeStates
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
