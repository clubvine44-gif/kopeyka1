rsion:9});
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
    const c=client(