entById('kc-email').value.trim();
  const password=document.getElementById('kc-pass').value;
  if(!email||password.length<6)return authMsg('Введите email и пароль минимум из 6 символов.');
  authMsg(signup?'Создаю аккаунт…':'Выполняю вход…');
  try{
    const c=client();
    const r=signup?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
    if(r.error)throw r.error;
    if(signup&&!r.data.session)return authMsg('Подтверди email, затем войди.');
    await syncSession(r.data.session);
  }catch(e){authMsg(e.message||'Ошибка авторизации')}
}

async function syncSession(session){
  if(!session||!session.user){
    currentUser=null;ready=false;setAccount(null);auth();return;
  }
  currentUser=session.user;
  setAccount(currentUser);
  closeAuth();
  status('загрузка облака…',true);
  setSyncLabel('Загрузка данных…');
  const c=client();
  try{
    await