'day','night','night','off','off'],shiftTypes:{},theme:'system'},
    shiftsOverride:{},income:[],expenses:[],recurring:[],reserves:[],reserveOps:[],categories:[],debts:[]
  };
  const src=incoming&&typeof incoming==='object'?incoming:{};
  const out=Object.assign({},base,src);
  out.settings=Object.assign({},base.settings||{},src.settings||{});
  if(base.settings&&base.settings.shiftTypes){
    out.settings.shiftTypes=Object.assign({},base.settings.shiftTypes,(src.settings&&src.settings.shiftTypes)||{});
  }
  if(!Array.isArray(out.settings.cyclePattern)||!out.settings.cyclePattern.length){
    out.settings.cyclePattern=(base.settings&&base.settings.cyclePattern)||['day','day','night','night','off','off'];
  }
  ['shiftsOverride'].forEach(k=>{ if(!out[k]||typeof out[k]!=='object')out[k]={}; });
  ['income','expenses','recurring','reserves','reserveOps','categories','debts','notes'].forE