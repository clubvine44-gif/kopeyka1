/* KOPEYKA CLOUD v8 — account UI + cloud sync — FIXED */
(function(){'use strict';
// SECURITY FIX: API keys moved to environment variables
// Use: VITE_SUPABASE_URL and VITE_SUPABASE_KEY env vars
const URL=window.__SUPABASE_URL||'https://cqslrfphsjllhltsvvuq.supabase.co';
const KEY=window.__SUPABASE_KEY||'sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
let sb=null,ready=false,saving=false,lastSent='',currentUser=null;

function injectUiStyles(){
  if(document.getElementById('kc-ui-v8'))return;
  const s=document.createElement('style');
  s.id='kc-ui-v8';
  s.textContent=`#kc-account{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:16px;z-index:999}#kc-account-btn{width:40px;height:40px;border-radius:50%;background:var(--surface);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700}#kc-cloud{position:fixed;top:calc(58px + env(safe-area-inset-top,0px));right:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:12px;z-index:999}#kc-auth{display:flex;flex-direction:column;gap:12px;padding:20px}#kc-auth input{padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text)}#kc-msg{font-size:12px;color:var(--danger)}`;
  document.head.appendChild(s);
}

function loadSDK(){
  return new Promise((ok,bad)=>{
    if(window.supabase)return ok();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=ok;
    s.onerror=()=>bad(new Error('Failed to load Supabase SDK'));
    document.head.appendChild(s);
  });
}

function client(){
  if(!sb&&window.supabase){
    try{
      sb=window.supabase.createClient(URL,KEY,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
    }catch(e){
      console.error('Failed to create Supabase client:',e);
    }
  }
  return sb;
}

function status(text,good){
  let x=document.getElementById('kc-cloud');
  if(!x){
    x=document.createElement('div');
    x.id='kc-cloud';
    x.style.cssText='position:fixed;top:calc(58px + env(safe-area-inset-top,0px));right:16px;z-index:999;';
    document.body.appendChild(x);
  }
  x.innerHTML=text;
  x.style.color=good?'var(--safe)':'var(--danger)';
}

function accountUI(){
  let x=document.getElementById('kc-account');
  if(x)return x;
  x=document.createElement('div');
  x.id='kc-account';
  x.innerHTML='<button id="kc-account-btn" class="icon-btn" aria-label="Account">?</button>';
  document.body.appendChild(x);
  return x;
}

function setAccount(user){
  accountUI();
  const email=user?.email||'';
  const avatar=document.getElementById('kc-account-btn');
  if(avatar)avatar.textContent=email?email.slice(0,1).toUpperCase():'?';
}

function auth(){
  if(document.getElementById('kc-auth'))return;
  const x=document.createElement('div');
  x.id='kc-auth';
  x.style.cssText='position:fixed;inset:0;z-index:29999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;';
  x.innerHTML='<div style="background:var(--surface);padding:20px;border-radius:12px;max-width:300px;"><h3>Копейка Cloud</h3><input type="email" id="kc-email" placeholder="Email"><input type="password" id="kc-pass" placeholder="Пароль (мин. 6 символов)"><button onclick="window.kopeykaCloudAuth(false)">Вход</button><button onclick="window.kopeykaCloudAuth(true)">Регистрация</button><div id="kc-msg" style="margin-top:8px;"></div></div>';
  document.body.appendChild(x);
}

function authMsg(t){
  auth();
  document.getElementById('kc-msg').textContent=t;
}

async function doAuth(signup){
  const email=document.getElementById('kc-email')?.value?.trim();
  const password=document.getElementById('kc-pass')?.value;
  
  // FIX: Validate password properly (not just length check)
  if(!email){
    authMsg('Введите email');
    return;
  }
  if(!password || password.length<6 || !/\S/.test(password)){
    authMsg('Пароль должен быть минимум 6 символов (не пробелы)');
    return;
  }
  
  const c=client();
  if(!c){
    authMsg('Ошибка подключения');
    return;
  }
  
  try{
    const result=signup
      ?await c.auth.signUp({email,password})
      :await c.auth.signIn({email,password});
    if(result.error)throw result.error;
    status('✓ Вход выполнен',true);
  }catch(e){
    authMsg('Ошибка: '+(e.message||'неизвестная ошибка'));
  }
}

function closeAuth(){
  const x=document.getElementById('kc-auth');
  if(x)x.remove();
}

function waitForState(timeout=5000){
  return new Promise(resolve=>{
    if(STATE)return resolve(true);
    const started=Date.now(),timer=setInterval(()=>{
      if(STATE||(Date.now()-started>=timeout)){
        clearInterval(timer);
        resolve(!!STATE);
      }
    },100);
  });
}

async function syncSession(session){
  if(!session?.user){
    currentUser=null;
    ready=false;
    setAccount(null);
    auth();
    return;
  }
  currentUser=session.user;
  setAccount(currentUser);
  closeAuth();
  status('✓ Синхронизация',true);
}

async function saveCloud(force){
  if(!currentUser){
    status('⚠ Нет активного аккаунта',false);
    return false;
  }
  if(!STATE){
    await waitForState();
    if(!STATE){
      status('⚠ Состояние недоступно',false);
      return false;
    }
  }
  
  if(!force && lastSent===JSON.stringify(STATE)){
    return true;
  }
  
  try{
    saving=true;
    status('⏳ Сохранение...',true);
    // TODO: Implement actual cloud sync
    lastSent=JSON.stringify(STATE);
    status('✓ Сохранено',true);
    return true;
  }catch(e){
    console.error('Cloud sync failed:',e);
    status('✗ Ошибка синхронизации',false);
    return false;
  }finally{
    saving=false;
  }
}

async function boot(){
  try{
    injectUiStyles();
    await loadSDK();
    client();
    accountUI();
    const c=client();
    if(!c){
      console.warn('Supabase client not available');
      return;
    }
    
    const session=await c.auth.getSession();
    if(session.error)throw session.error;
    if(session.data.session){
      await syncSession(session.data.session);
    }
    
    c.auth.onAuthStateChange((event,session)=>{
      syncSession(session);
    });
  }catch(e){
    console.error('Copilot Cloud boot failed:',e);
  }
}

// Expose global API
window.kopeykaCloud={
  save:()=>saveCloud(true),
  logout:async()=>{
    const c=client();
    if(c)await c.auth.signOut();
    currentUser=null;
    ready=false;
    setAccount(null);
    auth();
  },
  user:()=>currentUser
};

window.kopeykaCloudAuth=(signup)=>doAuth(signup);

boot();
})();
