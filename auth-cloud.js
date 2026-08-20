(async function(){
  const n=4;
  const parts=await Promise.all(Array.from({length:n},(_,i)=>fetch('ac'+i+'.js?v=10',{cache:'no-store'}).then(r=>r.text())));
  (0,eval)(parts.join(''));
})();
