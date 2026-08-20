(async function(){
  try{
    const n=5;
    const parts=await Promise.all(Array.from({length:n},(_,i)=>fetch('ac'+i+'.js?v=11',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('ac'+i);
      return r.text();
    }));
    (0,eval)(parts.join(''));
  }catch(e){
    console.error(e);
  }
})();
