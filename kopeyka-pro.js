/* kopeyka-pro.js v2 loader */
(function(){
function go(a,b){
  var b64=a+b;
  var bin=atob(b64);
  var u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  var s=new TextDecoder("utf-8").decode(u);
  (0,eval)(s);
}
Promise.all([
  fetch("kopeyka-pro.b64a.txt?v=2").then(function(r){return r.text()}),
  fetch("kopeyka-pro.b64b.txt?v=2").then(function(r){return r.text()})
]).then(function(parts){ go(parts[0], parts[1]); }).catch(function(e){ console.error("pro load", e); });
})();
