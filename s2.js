x calc(18px + env(safe-area-inset-bottom,0px))!important}}@media(min-width:900px){#kc-account{top:14px;right:18px}.bottomnav{height:100vh}.fab{bottom:32px}}`;
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
    x.style.cssText='position:fixed;top:cal