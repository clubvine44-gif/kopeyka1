вано');
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
    let r=await c.rpc('save_user_finance_state',{p_state:payload,p_ve