/* calendar-stats.js — summary under calendar */
(function(){
'use strict';
function calendarMonthStats(start, end){
  var day=0, night=0, off=0, cancelled=0;
  var workedIncome=0, plannedIncome=0, cancelledIncome=0;
  if(typeof getShift!=='function'||typeof addDays!=='function') return null;
  for(var d=start; d<=end; d=addDays(d,1)){
    var sh=getShift(d, STATE);
    if(sh.type==='off' || sh.status==='off'){ off++; continue; }
    if(sh.status==='cancelled' || sh.status==='absence'){
      cancelled++;
      cancelledIncome += (sh.amount||0);
      continue;
    }
    if(sh.type==='day') day++;
    else if(sh.type==='night') night++;
    else day++;
    var amt = typeof shiftIncomeAmount==='function' ? shiftIncomeAmount(sh) : (sh.amount||0);
    if(sh.status==='worked') workedIncome += amt;
    else plannedIncome += amt;
  }
  return {
    day:day, night:night, off:off, cancelled:cancelled,
    shifts: day+night,
    workedIncome:workedIncome, plannedIncome:plannedIncome, cancelledIncome:cancelledIncome,
    expectedIncome: workedIncome+plannedIncome
  };
}
window.calendarMonthStats = calendarMonthStats;

function enhanceCalendar(){
  if(typeof window.renderCalendar!=='function' || window.renderCalendar.__calStats) return;
  var orig = window.renderCalendar;
  window.renderCalendar = function(){
    orig.apply(this, arguments);
    try{
      var y=CAL_MONTH.y, m=CAL_MONTH.m;
      var range = monthRange(y,m);
      var stats = calendarMonthStats(range.start, range.end);
      if(!stats) return;
      var main = document.getElementById('main');
      if(!main) return;
      if(document.getElementById('cal-month-summary')) return;
      var box = document.createElement('div');
      box.id = 'cal-month-summary';
      var h = '';
      h += '<div class="section-title">Сводка за '+(MONTHS_NOM[m-1]||'')+' '+y+'</div>';
      h += '<div class="grid2">';
      h += (typeof statCard==='function' ? statCard('Смен', String(stats.shifts), 'дневных: '+stats.day+' · ночных: '+stats.night, [], '') : '');
      h += (typeof statCard==='function' ? statCard('Выходных', String(stats.off), (stats.cancelled?('отменено/пропуск: '+stats.cancelled):'без смены'), [], '') : '');
      h += '</div>';
      h += '<div class="card">';
      h += '<div class="row"><span>Ожидаемый доход со смен</span><b class="pos mid-number" style="font-size:18px">'+(typeof fmt==='function'?fmt(stats.expectedIncome):stats.expectedIncome)+'</b></div>';
      h += '<div class="row" style="margin-top:8px;font-size:13px"><span class="muted">Уже отработано</span><span class="mono pos">'+(typeof fmt==='function'?fmt(stats.workedIncome):stats.workedIncome)+'</span></div>';
      h += '<div class="row" style="font-size:13px"><span class="muted">Ещё запланировано</span><span class="mono">'+(typeof fmt==='function'?fmt(stats.plannedIncome):stats.plannedIncome)+'</span></div>';
      if(stats.cancelledIncome>0){
        h += '<div class="row" style="font-size:13px"><span class="muted">Не учтено (отмена/пропуск)</span><span class="mono neg">'+(typeof fmt==='function'?fmt(stats.cancelledIncome):stats.cancelledIncome)+'</span></div>';
      }
      h += '<div class="faint" style="margin-top:10px">Считается по календарю: тип дня, ставка и статус каждой смены. После правок сумма обновляется.</div>';
      h += '</div>';
      box.innerHTML = h;
      main.appendChild(box);
    }catch(e){ console.error('cal summary', e); }
  };
  window.renderCalendar.__calStats = true;
  if(typeof ROUTE!=='undefined' && ROUTE==='calendar' && typeof render==='function'){
    try{ render(); }catch(_){}
  }
}
setTimeout(enhanceCalendar, 0);
setTimeout(enhanceCalendar, 300);
})();
