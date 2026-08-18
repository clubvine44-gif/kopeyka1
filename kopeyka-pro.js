/* kopeyka-pro v8 — voice on existing fComment only */
(function(){'use strict';
function N(v){return Number(v)||0}
function A(v){return Array.isArray(v)?v:[]}
function T(){return typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10)}
function M(k){return typeof fmt==='function'?fmt(k):Math.round(N(k)/100).toLocaleString('ru-RU')+' \u20bd'}
function life(){
  if(typeof STATE==='undefined'||!STATE) return {monthGoal:0,viewOnly:false,autoBackup:true};
  if(!STATE.life) STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
  return STATE.life;
}
function mig(){
  if(typeof STATE==='undefined'||!STATE) return;
  ['debts','income','expenses','reserves','reserveOps','recurring'].forEach(function(k){
    if(!Array.isArray(STATE[k])) STATE[k]=[];
  });
  if(!STATE.templates) STATE.templates=[
    {id:'t1',kind:'expense',title:'\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u044b',amount:300000},
    {id:'t2',kind:'expense',title:'\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442',amount:50000}
  ];
  if(!STATE.life) STATE.life={monthGoal:0,viewOnly:false,autoBackup:true};
  STATE.version=Math.max(N(STATE.version),3);
}
function save(){ if(typeof saveState==='function') saveState(); }
function toast(m){ if(typeof showToast==='function') showToast(m); }

function tiedUp(){
  var res=0, debt=0;
  A(STATE.reserves).forEach(function(r){ if(r&&r.active!==false) res+=N(r.saved); });
  A(STATE.debts).forEach(function(d){ debt+=Math.max(0, N(d.amount)-N(d.paid)); });
  return {res:res, debt:debt, total:res+debt};
}

function openBreakdown(){
  mig();
  if(typeof currentPeriod!=='function'||typeof computePeriodSummary!=='function') return;
  var p=currentPeriod(), s=computePeriodSummary(STATE,p.start,p.end);
  var cash=N(s.currentBalance), pl=N(s.plannedRegular)+N(s.plannedObligatory);
  var d=N(s.debtsDue), r=N(s.reservesNeeded);
  var a=N(s.strictAvailable!=null?s.strictAvailable:s.availableNow);
  var h='<div class="modal" style="max-width:420px">';
  h+=(typeof modalHeader==='function'?modalHeader('\u041e\u0442\u043a\u0443\u0434\u0430 \u00ab\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u00bb'):'');
  h+='<div class="pro-breakdown card" style="margin:0">';
  h+='<div class="row"><span>\u041a\u0430\u0441\u0441\u0430</span><b>'+M(cash)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0430\u0441\u0445\u043e\u0434\u044b \u043f\u0435\u0440\u0438\u043e\u0434\u0430</span><b class="neg">\u2212'+M(pl)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0414\u043e\u043b\u0433\u0438</span><b class="neg">\u2212'+M(d)+'</b></div>';
  h+='<div class="row"><span>\u2212 \u0420\u0435\u0437\u0435\u0440\u0432\u044b \u043f\u0435\u0440\u0438\u043e\u0434\u0430</span><b class="neg">\u2212'+M(r)+'</b></div>';
  h+='<div class="row total"><span>\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e</span><b class="pos">'+M(a)+'</b></div></div>';
  h+='<button class="btn btn-primary btn-block" style="margin-top:12px" id="pc">\u041f\u043e\u043d\u044f\u0442\u043d\u043e</button></div>';
  showModal(h);
  document.getElementById('pc').onclick=closeModal;
}

function openTemplates(){
  mig();
  var h='<div class="modal" style="max-width:400px">'+(typeof modalHeader==='function'?modalHeader('\u0428\u0430\u0431\u043b\u043e\u043d\u044b'):'');
  A(STATE.templates).forEach(function(t){
    h+='<button class="btn btn-secondary btn-block" style="margin-bottom:8px" data-tpl="'+t.id+'">'+(t.title||t.name)+'</button>';
  });
  h+='</div>';
  showModal(h);
  document.querySelectorAll('[data-tpl]').forEach(function(b){
    b.onclick=function(){
      var t=A(STATE.templates).find(function(x){return x.id===b.dataset.tpl;});
      closeModal();
      if(life().viewOnly) return toast('\u0422\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440');
      if(!t) return;
      STATE.expenses.push({id:uid(),title:t.title||'\u0420\u0430\u0441\u0445\u043e\u0434',amount:N(t.amount),date:T(),mandatory:false,category:'other'});
      if(typeof persist==='function') persist(); else { save(); render(); }
      toast('\u0413\u043e\u0442\u043e\u0432\u043e');
    };
  });
}

function openAnalytics(){
  mig();
  var today=T(), from=addDays(today,-30), spent=0, by={};
  A(STATE.expenses).forEach(function(e){
    if(String(e.date)<from||String(e.date)>today) return;
    spent+=N(e.amount);
    by[e.title||'?']=(by[e.title||'?']||0)+N(e.amount);
  });
  var h='<div class="modal" style="max-width:420px">'+(typeof modalHeader==='function'?modalHeader('30 \u0434\u043d\u0435\u0439'):'');
  h+='<div class="card"><div class="label">\u041f\u043e\u0442\u0440\u0430\u0447\u0435\u043d\u043e</div><div class="mid-number neg">'+M(spent)+'</div></div>';
  Object.keys(by).sort(function(a,b){return by[b]-by[a];}).slice(0,5).forEach(function(k){
    h+='<div class="row"><span>'+k+'</span><b>'+M(by[k])+'</b></div>';
  });
  h+='</div>';
  showModal(h);
}

function openSearch(){
  mig();
  var h='<div class="modal" style="max-width:420px">'+(typeof modalHeader==='function'?modalHeader('\u041f\u043e\u0438\u0441\u043a'):'');
  h+='<div class="field"><input id="pq" placeholder="\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435"></div><div id="ph" class="card"></div></div>';
  showModal(h);
  document.getElementById('pq').oninput=function(){
    var q=this.value.toLowerCase(), hits=[];
    A(STATE.expenses).forEach(function(e){ if((e.title||'').toLowerCase().indexOf(q)>=0) hits.push(e); });
    A(STATE.debts).forEach(function(e){ if((e.name||'').toLowerCase().indexOf(q)>=0) hits.push({title:e.name,amount:e.amount,date:e.dueDate||'',_debt:1}); });
    document.getElementById('ph').innerHTML = hits.slice(0,25).map(function(e){
      return '<div class="life-search-hit"><b>'+(e._debt?'\u0414\u043e\u043b\u0433: ':'')+(e.title||'')+'</b><div class="faint">'+(e.date||'')+' \u00b7 '+M(e.amount)+'</div></div>';
    }).join('') || '<div class="faint">\u2014</div>';
  };
}

function exportBackup(){
  mig();
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'kopeyka',state:STATE},null,2)],{type:'application/json'}));
  a.download='kopeyka-'+T()+'.json';
  a.click();
  life().lastBackupAt=new Date().toISOString();
  save();
  toast('\u0411\u044d\u043a\u0430\u043f \u0441\u043a\u0430\u0447\u0430\u043d');
}
function importBackup(f){
  if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var d=JSON.parse(r.result);
      try{ localStorage.setItem('kopeyka_snapshot_before_danger', JSON.stringify(STATE)); }catch(e){}
      var apply=function(){ window.STATE=d.state||d; mig(); save(); render(); toast('\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e'); };
      if(typeof confirmDelete==='function') confirmDelete('\u0417\u0430\u043c\u0435\u043d\u0438\u0442\u044c \u0432\u0441\u0435 \u0434\u0430\u043d\u043d\u044b\u0435?', apply);
      else if(confirm('\u0417\u0430\u043c\u0435\u043d\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435?')) apply();
    }catch(e){ toast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0444\u0430\u0439\u043b\u0430'); }
  };
  r.readAsText(f);
}

function injectHome(){
  var main=document.getElementById('main');
  if(!main || typeof ROUTE==='undefined' || ROUTE!=='home') return;
  if(document.getElementById('proHomeExtras')) return;
  mig();
  var L=life();
  var html='';
  if(L.viewOnly) html+='<div class="life-viewonly-banner">\u0420\u0435\u0436\u0438\u043c \u00ab\u0442\u043e\u043b\u044c\u043a\u043e \u0441\u043c\u043e\u0442\u0440\u044e\u00bb</div>';
  if(N(L.monthGoal)>0){
    var y=T().slice(0,7), sv=0;
    A(STATE.reserveOps).forEach(function(o){
      if(o && o.type==='deposit' && String(o.date).slice(0,7)===y) sv+=N(o.amount);
    });
    var pct=Math.min(100, Math.round(sv/N(L.monthGoal)*100));
    html+='<div class="card"><div class="label">\u0426\u0435\u043b\u044c \u043c\u0435\u0441\u044f\u0446\u0430</div>';
    html+='<div class="row"><span>\u041f\u043b\u0430\u043d</span><b>'+M(L.monthGoal)+'</b></div>';
    html+='<div class="row"><span>\u041e\u0442\u043b\u043e\u0436\u0435\u043d\u043e</span><b class="pos">'+M(sv)+'</b></div>';
    html+='<div class="pro-bar"><i style="width:'+pct+'%"></i></div></div>';
  }
  var t=tiedUp();
  html+='<div class="card pro-tied"><div class="label">\u0417\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u043e</div>';
  html+='<div class="mid-number">'+M(t.total)+'</div>';
  html+='<div class="faint">\u0440\u0435\u0437\u0435\u0440\u0432\u044b '+M(t.res)+' + \u0434\u043e\u043b\u0433\u0438 '+M(t.debt)+'</div></div>';
  if(typeof currentPeriod==='function' && typeof getShift==='function'){
    var p3=currentPeriod(), today=T(), left=0, inc=0;
    for(var d=p3.start; d<=p3.end; d=addDays(d,1)){
      var sh=getShift(d, STATE);
      if(!sh || sh.type==='off' || sh.status==='cancelled' || sh.status==='absence') continue;
      if(d>=today){
        left++;
        inc += (typeof shiftIncomeAmount==='function' ? shiftIncomeAmount(sh) : N(sh.amount));
      }
    }
    html+='<div class="card pro-period"><div class="label">\u0414\u043e \u043a\u043e\u043d\u0446\u0430 \u043f\u0435\u0440\u0438\u043e\u0434\u0430</div>';
    html+='<div class="row"><span>\u0421\u043c\u0435\u043d \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c</span><b>'+left+'</b></div>';
    html+='<div class="row"><span>\u0415\u0449\u0451 \u0441\u043e \u0441\u043c\u0435\u043d</span><b class="pos">'+M(inc)+'</b></div></div>';
  }
  html+='<div class="pro-chip-row">';
  html+='<button type="button" class="pro-chip hot" id="c1">\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u043a\u0430</button>';
  html+='<button type="button" class="pro-chip" id="c2">\u0428\u0430\u0431\u043b\u043e\u043d\u044b</button>';
  html+='<button type="button" class="pro-chip" id="c3">30 \u0434\u043d\u0435\u0439</button>';
  html+='<button type="button" class="pro-chip" id="c4">\u041f\u043e\u0438\u0441\u043a</button>';
  html+='</div>';
  var box=document.createElement('div');
  box.id='proHomeExtras';
  box.className='pro-block';
  box.innerHTML=html;
  var grids=main.querySelectorAll('.grid2');
  var anchor = grids.length>=1 ? grids[0] : main.querySelector('.card');
  if(anchor && anchor.parentNode){
    if(anchor.nextSibling) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else anchor.parentNode.appendChild(box);
  } else {
    main.appendChild(box);
  }
  document.getElementById('c1').onclick=openBreakdown;
  document.getElementById('c2').onclick=openTemplates;
  document.getElementById('c3').onclick=openAnalytics;
  document.getElementById('c4').onclick=openSearch;
  main.querySelectorAll('.card.card-tight').forEach(function(card){
    var label=card.querySelector('.label');
    if(label && /\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e/i.test(label.textContent||'')){
      card.style.cursor='pointer';
      card.addEventListener('click', openBreakdown);
    }
  });
}

function injectSettings(){
  var main=document.getElementById('main');
  if(!main || ROUTE!=='settings' || document.getElementById('proSettingsExtras')) return;
  mig();
  var L=life();
  var box=document.createElement('div');
  box.id='proSettingsExtras';
  box.innerHTML=
    '<div class="section-title">\u0426\u0435\u043b\u0438</div><div class="card">'+
    '<div class="field"><label>\u0426\u0435\u043b\u044c \u043d\u0430 \u043c\u0435\u0441\u044f\u0446, \u20bd</label>'+
    '<input id="g1" type="number" value="'+Math.round(N(L.monthGoal)/100)+'"></div>'+
    '<label style="display:flex;gap:8px;font-size:13px;margin:8px 0"><input type="checkbox" id="g2" '+(L.viewOnly?'checked':'')+'> \u0422\u043e\u043b\u044c\u043a\u043e \u0441\u043c\u043e\u0442\u0440\u044e</label>'+
    '<button class="btn btn-primary btn-block" id="gS">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button></div>'+
    '<div class="section-title">\u0414\u0430\u043d\u043d\u044b\u0435</div><div class="card">'+
    '<button class="btn btn-secondary btn-block" id="b1" style="margin-bottom:8px">\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0431\u044d\u043a\u0430\u043f</button>'+
    '<button class="btn btn-secondary btn-block" id="b2">\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0438\u0437 \u0444\u0430\u0439\u043b\u0430</button>'+
    '<input type="file" id="b2f" accept="application/json" style="display:none"></div>';
  main.appendChild(box);
  document.getElementById('gS').onclick=function(){
    L.monthGoal=Math.round(N(document.getElementById('g1').value)*100);
    L.viewOnly=document.getElementById('g2').checked;
    save(); toast('\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e'); render();
  };
  document.getElementById('b1').onclick=exportBackup;
  document.getElementById('b2').onclick=function(){ document.getElementById('b2f').click(); };
  document.getElementById('b2f').onchange=function(e){ importBackup(e.target.files && e.target.files[0]); };
}

function wireVoice(){
  var root=document.getElementById('modalRoot');
  if(!root || root.__v) return;
  root.__v=1;
  new MutationObserver(function(){
    var m=root.querySelector('.modal');
    if(!m || m.querySelector('.life-mic')) return;
    var inp = m.querySelector('#fComment, #dComment, input[id*="omment"], textarea[id*="omment"]');
    if(!inp){
      m.querySelectorAll('.field').forEach(function(f){
        var lab=f.querySelector('label');
        if(lab && /\u043a\u043e\u043c\u043c\u0435\u043d\u0442/i.test(lab.textContent||'')){
          var cand=f.querySelector('input,textarea');
          if(cand) inp=cand;
        }
      });
    }
    if(!inp) return;
    if(inp.parentNode && inp.parentNode.querySelector('.life-mic')) return;
    var wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:8px;align-items:center';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    inp.style.flex='1';
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='life-mic';
    btn.id='lifeMic';
    btn.textContent='\uD83C\uDFA4';
    btn.title='\u0413\u043e\u043b\u043e\u0441';
    wrap.appendChild(btn);
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    btn.onclick=function(){
      if(!SR) return toast('\u0413\u043e\u043b\u043e\u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d');
      var r=new SR(); r.lang='ru-RU';
      btn.classList.add('rec');
      r.onresult=function(ev){
        inp.value+=(inp.value?' ':'')+ev.results[0][0].transcript;
      };
      r.onend=function(){ btn.classList.remove('rec'); };
      r.onerror=function(){ btn.classList.remove('rec'); };
      try{ r.start(); }catch(e){ btn.classList.remove('rec'); }
    };
  }).observe(root,{childList:true,subtree:true});
}

function boot(){
  mig();
  wireVoice();
  var o=window.render;
  if(typeof o==='function' && !o.__pro){
    window.render=function(){
      mig();
      try{ o.apply(this, arguments); }catch(e){}
      try{ injectHome(); injectSettings(); }catch(e){ console.error(e); }
    };
    window.render.__pro=1;
  }
  setTimeout(function(){ if(typeof render==='function') render(); }, 400);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
