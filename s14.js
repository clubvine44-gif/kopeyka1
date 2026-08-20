);
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

if(document.readyState==='loading')document