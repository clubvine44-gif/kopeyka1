(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.onload=function(){
    var a=document.createElement('script');
    a.src='./auth-cloud.js?v=3';
    document.body.appendChild(a);
  };
  s.onerror=function(){console.error('Supabase client failed to load');};
  document.head.appendChild(s);
})();
