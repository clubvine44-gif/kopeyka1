wait waitForState();
    await saveCloud(true);
  };
  document.getElementById('kc-logout').onclick=async()=>{
    try{await client().auth.signOut()}catch(_){}
    currentUser=null;ready=false;lastSent='';
    setAccount(null);status('выполнен выход',false);auth();
  };
  return x;
}

function setAccount(user){
  accountUI();
  const email=user?.email||'';
  const avatar=document.getElementById('kc-avatar');
  if(avatar)avatar.textContent=email?email.slice(0,1).toUpperCase():'?';
  const em=document.getElementById('kc-user-email');
  if(em)em.textContent=email||'Нет активного аккаунта';
  const dot=document.getElementById('kc-dot');
  if(dot)dot.style.background=user?'var(--safe)':'var(--text-faint)';
}

function setSyncLabel(t){
  const x=document.getElementById('kc-sync-label');
  if(x)x.textContent=t;
}

function auth(){
  if(document.getElementById('kc-auth'))return;
  const x=docume