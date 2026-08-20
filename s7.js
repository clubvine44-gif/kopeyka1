"></div></div>';
  document.body.appendChild(x);
  document.getElementById('kc-login').onclick=()=>doAuth(false);
  document.getElementById('kc-signup').onclick=()=>doAuth(true);
}

function authMsg(t){auth();const m=document.getElementById('kc-msg');if(m)m.textContent=t}
function closeAuth(){const x=document.getElementById('kc-auth');if(x)x.remove()}

function waitForState(timeout=8000){
  return new Promise(resolve=>{
    if(typeof STATE!=='undefined'&&STATE)return resolve(true);
    const started=Date.now();
    const timer=setInterval(()=>{
      if((typeof STATE!=='undefined'&&STATE)||(Date.now()-started>=timeout)){
        clearInterval(timer);resolve(!!(typeof STATE!=='undefined'&&STATE));
      }
    },40);
  });
}

function normalizeState(incoming){
  const base=(typeof defaultState==='function')?defaultState():{
    version:1,
    settings:{currentBalance:0,cyclePattern:['day',