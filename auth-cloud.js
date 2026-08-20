(async function(){
  try{
    const n=16;
    const parts=await Promise.all(Array.from({length:n},(_,i)=>fetch('s'+i+'.js?v=21',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('s'+i);
      return r.text();
    }));
    (0,eval)(parts.join(''));
    // load merge patch after cloud is ready
    const p=document.createElement('script');
    p.src='cloud-patch.js?v=1';
    document.head.appendChild(p);
  }catch(e){console.error('auth-cloud',e)}
})();
