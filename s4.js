</span></button><div id="kc-account-menu" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:12px;box-shadow:var(--shadow)"><div style="font-weight:700" id="kc-user-email"></div><div id="kc-sync-label" style="font-size:11px;color:var(--text-dim);margin-top:4px">Облако не синхронизировано</div><button id="kc-sync" class="btn btn-secondary btn-block" style="margin-top:10px">Синхронизировать сейчас</button><button id="kc-logout" class="btn btn-danger btn-block" style="margin-top:8px">Выйти из аккаунта</button></div>';
  document.body.appendChild(x);
  document.getElementById('kc-account-btn').onclick=()=>{
    const m=document.getElementById('kc-account-menu');
    m.style.display=m.style.display==='none'?'block':'none';
  };
  document.getElementById('kc-sync').onclick=async()=>{
    status('синхронизация…',true);
    a