c(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:30000;font:11px Inter,system-ui,sans-serif;background:var(--surface);padding:6px 10px;border-radius:9px;border:1px solid var(--border);box-shadow:var(--shadow);pointer-events:none;max-width:calc(100vw - 120px);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
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
  x.innerHTML='<button id="kc-account-btn" class="icon-btn" aria-label="Профиль"><span id="kc-avatar">•••</span><span id="kc-dot">