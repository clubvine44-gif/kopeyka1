ach(k=>{
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
  const email=document.getElem