 waitForState();
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
      setSyncLabel('Синхронизиро