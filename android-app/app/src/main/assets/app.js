'use strict';
/* ===================== Копейка — основная логика ===================== */

const EXP_CATEGORIES = ["Еда","Сигареты","Алкоголь","Транспорт","Жильё","Обязательные платежи","Долг","Связь","Здоровье","Развлечения","Другое"];
const INC_CATEGORIES = ["Зарплата","Подработка","Накопление","Прочее"];
const MONTHLY_INCOME = 98000;
const LIMITS = [
  {name:"Прочие траты", limit:25300, exclude:["Обязательные платежи","Долг","Сигареты","Алкоголь"]},
  {name:"Пиво и сигареты", limit:10000, match:["Сигареты","Алкоголь"]},
];
const OBLIGATIONS_DEFAULT = [
  {name:"Алименты", amount:25000},
  {name:"Коммуналка + продукты", amount:8000},
  {name:"Связь + VPN", amount:700},
  {name:"Подписка Claude", amount:2000},
];
const OBLIGATIONS_DAY = 25;
const DEBT = { total:70000, monthly:15000, category:"Долг" };
const GOALS = [
  {name:"Финансовая подушка", target:300000, monthly:5000, keyword:"подушк", priority:"Высокий"},
  {name:"Водительские права", target:100000, monthly:4000, keyword:"права", priority:"Высокий"},
  {name:"Автомобиль", target:250000, monthly:2000, keyword:"авто", priority:"Средний"},
  {name:"Переезд", target:60000, monthly:1000, keyword:"переезд", priority:"Средний"},
  {name:"Капитал", target:500000, monthly:0, keyword:"капитал", priority:"На паузе (пока не закрыт долг)"},
];
const MONTHS = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const PAYDAYS = [10, 25];
const SHIFT_RATE = 4800;
const SALARY_SHIFTS = { '2026-08': { firstHalf: 9, secondHalf: 12 } };

const STORE_KEY = "kopeyka:transactions";
const STORE_META_KEY = "kopeyka:meta";
const SUPABASE_URL = "https://cqslrfphsjllhltsvvuq.supabase.co";
const SUPABASE_KEY = "sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG";
const SB_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

// "Служебные" записи (настройки/планы) хранятся в той же таблице transactions,
// но с type='Meta' — так они не требуют отдельной таблицы в Supabase и не попадают
// ни в один из существующих финансовых расчётов (те фильтруют строго по 'Доход'/'Расход').
const META_TYPE = 'Meta';
const META_SETTINGS_CATEGORY = '__settings__';
const META_PLANS_CATEGORY = '__plans__';
const META_CUT_CATEGORY = '__cut__';

let txs = [];                       // обычные операции (без Meta-записей)
let obligationsState = OBLIGATIONS_DEFAULT.map(o=>({...o}));
let obligationsRowId = null;        // id Meta-строки с настройками, если уже сохранена
let plansState = [];                // [{id,kind,name,amount,dueDate,paid}]
let plansRowId = null;
let monthlyCut = null;              // {monthKey:'YYYY-MM', oblig, debt, goal} — сокращение резервов на текущий месяц
let cutRowId = null;
let currentType = "Расход";
let currentPlanKind = "Плановая трата";
let catChart, trendChart, shiftChart, debtChart;
let cloudOnline = null;
let editingId = null;
let lastInsertError = '';
let isSubmitting = false;

function fmt(n){ return Math.round(Number(n)||0).toLocaleString('ru-RU') + ' ₽'; }
function daysWord(n){
  const mod10 = n % 10, mod100 = n % 100;
  if(mod10===1 && mod100!==11) return 'день';
  if([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'дня';
  return 'дней';
}
function dateOnly(v){ const [y,m,d]=String(v).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); }
function todayOnly(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); }
function isFutureDate(v){ return dateOnly(v) > todayOnly(); }
function currentYear(){ return new Date().getFullYear(); }
function safeCall(fn){ try{ fn(); }catch(e){ console.error('Ошибка отрисовки:', e); } }
function uid(){ return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

/* ===================== Синк со статусом ===================== */
function setSyncStatus(online){
  cloudOnline = online;
  const dot = document.getElementById('syncDot');
  const text = document.getElementById('syncText');
  if(!dot || !text) return;
  dot.className = 'sync-dot ' + (online ? 'online' : 'offline');
  text.textContent = online ? 'в облаке' : 'только локально';
}

/* ===================== Локальный кэш (надёжное хранение) =====================
   localStorage не имеет срока жизни и переживает недели без сети — это основной
   защитный слой на случай, если Supabase временно недоступен. */
function persistLocalCache(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(txs)); }catch(e){}
}
function persistMetaCache(){
  try{ localStorage.setItem(STORE_META_KEY, JSON.stringify({ obligationsState, plansState, monthlyCut })); }catch(e){}
}
function readLocalCache(){
  try{ const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
}
function readMetaCache(){
  try{
    const raw = localStorage.getItem(STORE_META_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

/* ===================== Сеть: Supabase REST ===================== */
async function fetchAllRows(){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*&order=date.desc`, { headers: SB_HEADERS, cache:'no-store' });
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}
async function insertRow(row){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method:'POST', headers:{...SB_HEADERS,'Prefer':'return=representation'}, body: JSON.stringify(row)
  });
  if(!res.ok){ const t=await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0,150)}`); }
  const rows = await res.json();
  return rows[0];
}
async function updateRow(id, row){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, {
    method:'PATCH', headers:{...SB_HEADERS,'Prefer':'return=representation'}, body: JSON.stringify(row)
  });
  if(!res.ok){ const t=await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0,150)}`); }
  const rows = await res.json();
  return rows[0];
}
async function deleteRow(id){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, { method:'DELETE', headers: SB_HEADERS });
  return res.ok;
}

/* ===================== Загрузка данных + слияние несинхронизированного =====================
   БАГ, который был раньше: если запись сохранялась только локально (id вида "local-…",
   когда не было связи или запрос не прошёл), при следующей успешной загрузке весь массив
   txs полностью перезаписывался ответом сервера — несинхронизированные записи молча
   терялись. Теперь при каждой загрузке такие записи сначала пытаются доехать до облака,
   и только после этого исчезают из локального плейсхолдера. */
async function loadTxs(){
  const localRaw = readLocalCache();
  const pendingLocal = localRaw.filter(t => String(t.id).startsWith('local-'));

  let remoteRows = null;
  try{
    remoteRows = await fetchAllRows();
    setSyncStatus(true);
  }catch(e){
    console.error('Supabase недоступен, читаю локальный кэш:', e);
    setSyncStatus(false);
  }

  if(remoteRows === null){
    // офлайн — работаем полностью с локальным кэшем, ничего не теряем
    splitRowsIntoState(localRaw);
    return;
  }

  // онлайн — пробуем дослать всё, что осталось несинхронизированным
  for(const pending of pendingLocal){
    try{
      const { id, ...payload } = pending;
      const saved = await insertRow(payload);
      if(saved) remoteRows.push(saved);
    }catch(e){
      console.error('Не удалось дослать отложенную запись, оставляю в очереди:', e);
      remoteRows.push(pending); // не теряем, попробуем в следующий раз
    }
  }

  splitRowsIntoState(remoteRows);
  persistLocalCache();
  persistMetaCache();
}

function splitRowsIntoState(rows){
  const real = [];
  const metaSettingsRows = [];
  const metaPlansRows = [];
  const metaCutRows = [];
  rows.forEach(r=>{
    if(r.type === META_TYPE){
      if(r.category === META_SETTINGS_CATEGORY) metaSettingsRows.push(r);
      else if(r.category === META_PLANS_CATEGORY) metaPlansRows.push(r);
      else if(r.category === META_CUT_CATEGORY) metaCutRows.push(r);
    } else {
      real.push(r);
    }
  });
  txs = real;

  if(metaSettingsRows.length){
    const latest = metaSettingsRows.sort((a,b)=> String(b.id).localeCompare(String(a.id)))[0];
    obligationsRowId = latest.id;
    try{
      const parsed = JSON.parse(latest.comment || '{}');
      if(Array.isArray(parsed.obligations) && parsed.obligations.length) obligationsState = parsed.obligations;
    }catch(e){ console.error('Не удалось разобрать настройки платежей', e); }
  } else {
    const cached = readMetaCache();
    if(cached && Array.isArray(cached.obligationsState) && cached.obligationsState.length){
      obligationsState = cached.obligationsState;
    }
  }

  if(metaPlansRows.length){
    const latest = metaPlansRows.sort((a,b)=> String(b.id).localeCompare(String(a.id)))[0];
    plansRowId = latest.id;
    try{
      const parsed = JSON.parse(latest.comment || '{}');
      if(Array.isArray(parsed.plans)) plansState = parsed.plans;
    }catch(e){ console.error('Не удалось разобрать список планов', e); }
  } else {
    const cached = readMetaCache();
    if(cached && Array.isArray(cached.plansState)) plansState = cached.plansState;
  }

  if(metaCutRows.length){
    const latest = metaCutRows.sort((a,b)=> String(b.id).localeCompare(String(a.id)))[0];
    cutRowId = latest.id;
    try{
      const parsed = JSON.parse(latest.comment || '{}');
      monthlyCut = parsed && parsed.monthKey ? parsed : null;
    }catch(e){ console.error('Не удалось разобрать сокращение месяца', e); }
  } else {
    const cached = readMetaCache();
    if(cached && cached.monthlyCut) monthlyCut = cached.monthlyCut;
  }
}

function getObligations(){ return obligationsState; }
function getObligationsTotal(){ return obligationsState.reduce((s,o)=>s+(Number(o.amount)||0),0); }

async function saveObligationsSettings(list){
  obligationsState = list;
  persistMetaCache();
  const payload = { date: new Date().toISOString().slice(0,10), type: META_TYPE, category: META_SETTINGS_CATEGORY, amount:0, shift:'', comment: JSON.stringify({ obligations: list, updatedAt: Date.now() }) };
  try{
    if(obligationsRowId){
      const updated = await updateRow(obligationsRowId, payload);
      if(updated) obligationsRowId = updated.id;
    } else {
      const created = await insertRow(payload);
      if(created) obligationsRowId = created.id;
    }
    return true;
  }catch(e){
    console.error('Не удалось сохранить настройки платежей в облако (сохранено локально):', e);
    return false;
  }
}

async function savePlansState(){
  persistMetaCache();
  const payload = { date: new Date().toISOString().slice(0,10), type: META_TYPE, category: META_PLANS_CATEGORY, amount:0, shift:'', comment: JSON.stringify({ plans: plansState, updatedAt: Date.now() }) };
  try{
    if(plansRowId){
      const updated = await updateRow(plansRowId, payload);
      if(updated) plansRowId = updated.id;
    } else {
      const created = await insertRow(payload);
      if(created) plansRowId = created.id;
    }
    return true;
  }catch(e){
    console.error('Не удалось сохранить планы в облако (сохранено локально):', e);
    return false;
  }
}

function currentMonthKey(){ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; }

async function saveMonthlyCut(oblig, debt, goal){
  monthlyCut = { monthKey: currentMonthKey(), oblig, debt, goal, updatedAt: Date.now() };
  persistMetaCache();
  const payload = { date: new Date().toISOString().slice(0,10), type: META_TYPE, category: META_CUT_CATEGORY, amount:0, shift:'', comment: JSON.stringify(monthlyCut) };
  try{
    if(cutRowId){
      const updated = await updateRow(cutRowId, payload);
      if(updated) cutRowId = updated.id;
    } else {
      const created = await insertRow(payload);
      if(created) cutRowId = created.id;
    }
    return true;
  }catch(e){
    console.error('Не удалось сохранить сокращение месяца в облако (сохранено локально):', e);
    return false;
  }
}

async function resetMonthlyCut(){
  monthlyCut = null;
  persistMetaCache();
  if(cutRowId){
    try{ await deleteRow(cutRowId); }catch(e){ console.error('Не удалось удалить сокращение месяца в облаке:', e); }
    cutRowId = null;
  }
}

/* ===================== Категории / форма ===================== */
function populateCategorySelect(){
  const sel = document.getElementById('txCategory');
  sel.innerHTML = '';
  const list = currentType === 'Расход' ? EXP_CATEGORIES : INC_CATEGORIES;
  list.forEach(c=>{
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
}

function setupMonthSelect(){
  const sel = document.getElementById('monthSelect');
  const now = new Date();
  MONTHS.forEach((m,i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = m;
    if(i === now.getMonth()) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', render);
}

function setupReportMonthSelect(){
  const sel = document.getElementById('reportMonthSelect');
  if(!sel) return;
  const now = new Date();
  MONTHS.forEach((m,i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = m;
    if(i === now.getMonth()) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', renderReportPreview);
}

function txsForMonth(monthIdx){
  const y = currentYear();
  return txs.filter(t=>{
    const d = new Date(t.date);
    return d.getMonth() === monthIdx && d.getFullYear() === y;
  });
}

/* ===================== Единый обработчик добавления/редактирования =====================
   Раньше было ДВА независимых обработчика submit на одной и той же форме (основной в
   index.html и второй — в отдельно подгружаемом fixes.js, внедрённом через service worker
   хаком поверх HTML). Оба реагировали на один и тот же submit, оба читали одни и те же
   поля формы и оба отправляли запрос в Supabase. Из-за особенностей DOM-событий (на самом
   целевом элементе слушатели выполняются в порядке добавления независимо от capture/bubble)
   при выборе будущей даты происходила гонка: первый обработчик успевал сбросить поле даты
   на "сегодня" ДО того, как второй его прочитал, а иногда запись улетала в базу дважды.
   Итог — то самое "результаты сбрасываются, программа не засчитывает результат".
   Теперь обработчик один. */
async function handleTxSubmit(e){
  e.preventDefault();
  if(isSubmitting) return;
  const date = document.getElementById('txDate').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const shift = document.getElementById('txShift').value;
  const comment = document.getElementById('txComment').value.trim();
  if(!date || !Number.isFinite(amount) || amount <= 0) return;

  const txData = { date, type: currentType, category, amount, comment, shift };
  const wasFuture = isFutureDate(date);
  lastInsertError = '';
  isSubmitting = true;
  const submitBtn = e.target.querySelector('.submit-btn');
  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Сохраняю…';

  try{
    if(editingId !== null){
      const isLocal = String(editingId).startsWith('local-');
      if(isLocal){
        const idx = txs.findIndex(t => String(t.id) === String(editingId));
        if(idx !== -1) txs[idx] = { ...txs[idx], ...txData };
      } else {
        let updated = null;
        try{ updated = await updateRow(editingId, txData); }
        catch(err){ lastInsertError = err.message || String(err); }
        const idx = txs.findIndex(t => String(t.id) === String(editingId));
        if(idx !== -1) txs[idx] = updated || { ...txs[idx], ...txData };
      }
      editingId = null;
    } else {
      let inserted = null;
      try{ inserted = await insertRow(txData); }
      catch(err){ lastInsertError = err.message || String(err); }
      txs.push(inserted || { ...txData, id: 'local-' + Date.now() });
    }

    persistLocalCache();
    document.getElementById('txAmount').value = '';
    document.getElementById('txComment').value = '';
    document.getElementById('txShift').value = '';
    document.getElementById('txDate').valueAsDate = new Date();
    submitBtn.textContent = 'Добавить';

    if(wasFuture){
      showPlannedConfirmation(date, txData);
    }
    render();

    if(lastInsertError){
      submitBtn.textContent = 'Сохранено локально. Ошибка облака: ' + lastInsertError;
      setTimeout(()=>{ submitBtn.textContent = 'Добавить'; }, 5000);
    }
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
  }
}

function showPlannedConfirmation(date, txData){
  const note = document.getElementById('plannedNote');
  if(!note) return;
  const d = dateOnly(date);
  const label = d.toLocaleDateString('ru-RU', { day:'2-digit', month:'long' });
  note.style.display = 'block';
  note.textContent = `Записано заранее на ${label}: ${txData.type==='Расход'?'−':'+'}${fmt(txData.amount)} (${txData.category}). Появится в статистике своего месяца.`;
  setTimeout(()=>{ note.style.display = 'none'; }, 6000);
}

/* ===================== Удаление / редактирование операции ===================== */
async function deleteTx(raw){
  const isLocal = raw.startsWith('local-');
  const id = isLocal ? raw : parseInt(raw, 10);
  const ok = isLocal ? true : await deleteRow(id);
  if(ok){
    txs = txs.filter(t => String(t.id) !== String(raw));
    persistLocalCache();
    render();
  }
}

function startEditTx(raw){
  const tx = txs.find(t => String(t.id) === String(raw));
  if(!tx) return;
  editingId = tx.id;
  currentType = tx.type;
  document.querySelectorAll('.type-toggle button[data-type]').forEach(b=>{
    b.classList.toggle('active', b.dataset.type === tx.type);
  });
  populateCategorySelect();
  document.getElementById('txDate').value = tx.date;
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txCategory').value = tx.category;
  document.getElementById('txShift').value = tx.shift || '';
  document.getElementById('txComment').value = tx.comment || '';
  document.querySelector('#txForm .submit-btn').textContent = 'Сохранить изменения';
  showPage('home', true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===================== Расчёт "следующей зарплаты" ===================== */
function salaryForPeriod(year, month, half){
  const key = `${year}-${String(month+1).padStart(2,'0')}`;
  const cfg = SALARY_SHIFTS[key];
  return cfg ? (half===1 ? cfg.firstHalf : cfg.secondHalf) * SHIFT_RATE : MONTHLY_INCOME/2;
}
function nextPaydayInfo(){
  const today = todayOnly();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  let nextDay = PAYDAYS.find(p => p > d);
  let payDate, half, py, pm;
  if(nextDay){ payDate = new Date(y,m,nextDay); half = nextDay===25?1:2; py=y; pm = nextDay===25?m:m-1; }
  else { payDate = new Date(y,m+1,PAYDAYS[0]); half = 2; py=y; pm=m; }
  const amount = salaryForPeriod(py, pm, half);
  const days = Math.max(1, Math.ceil((payDate - today) / 86400000));
  return { date: payDate, amount, days };
}

/* ===================== Главный расчёт: ДВА значения "можно потратить" =====================
   1) heroDailySafe  — с учётом всех резервов (обязательные платежи, долг, цели, а также
      "должен"/"плановая трата" с датой в текущем цикле) — считается и показывается ВСЕГДА,
      даже если долг и платежи ещё не погашены (просто вычитаются из общего остатка).
   2) heroDailyFree  — сколько денег есть "на руках" в принципе, без вычета обязательных
      платежей, накоплений на цели и долга — просто общий остаток / дней до зарплаты. */
function computeSpendable(){
  const today = todayOnly();
  const { date: payDate, amount: nextAmount } = nextPaydayInfo();

  // Раньше делили на количество дней "от сегодня до ближайшей зарплаты" — из-за этого
  // сумма на день скакала (зарплата то через 2 дня, то через 15) и не совпадала с тем,
  // как обычно планируют бюджет помесячно. Теперь считаем дни до конца ТЕКУЩЕГО месяца.
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const days = Math.max(1, lastDayOfMonth - today.getDate() + 1);

  const isIncome = t => t.type==='Доход' && t.category!=='Накопление';
  const isSaving = t => t.type==='Доход' && t.category==='Накопление';
  const isExpense = t => t.type==='Расход';
  const notFuture = t => !isFutureDate(t.date);

  const totalIncome = txs.filter(t=>isIncome(t)&&notFuture(t)).reduce((s,t)=>s+(Number(t.amount)||0),0);
  const totalExpense = txs.filter(t=>isExpense(t)&&notFuture(t)).reduce((s,t)=>s+(Number(t.amount)||0),0);
  const totalSaved = txs.filter(t=>isSaving(t)&&notFuture(t)).reduce((s,t)=>s+(Number(t.amount)||0),0);
  const balance = totalIncome - totalExpense - totalSaved;

  const now = new Date();
  const monthTxs = txs.filter(t=>{ const d=dateOnly(t.date); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); });

  const obligationsTotal = getObligationsTotal();
  const paidOblig = monthTxs.filter(t=>isExpense(t) && t.category==='Обязательные платежи').reduce((s,t)=>s+(Number(t.amount)||0),0);
  const obligLeft = (today.getDate() < OBLIGATIONS_DAY) ? Math.max(0, obligationsTotal - paidOblig) : 0;

  const paidDebtThisMonth = monthTxs.filter(t=>isExpense(t) && t.category===DEBT.category).reduce((s,t)=>s+(Number(t.amount)||0),0);
  const debtRemainingTotal = DEBT.total - txs.filter(t=>isExpense(t) && t.category===DEBT.category).reduce((s,t)=>s+(Number(t.amount)||0),0);
  const debtLeft = debtRemainingTotal > 0 ? Math.max(0, Math.min(DEBT.monthly, debtRemainingTotal) - paidDebtThisMonth) : 0;

  const totalGoalMonthly = GOALS.reduce((s,g)=>s+g.monthly,0);
  const savedThisMonth = monthTxs.filter(t=>isSaving(t)).reduce((s,t)=>s+(Number(t.amount)||0),0);
  const goalLeft = Math.max(0, totalGoalMonthly - savedThisMonth);

  // "Сокращение месяца": если человек явно решил в этом месяце отложить меньше на
  // обязательные платежи/долг/цели (через ползунки), применяем это как потолок —
  // но никогда не выше того, что реально ещё не закрыто.
  const rawObligLeft = obligLeft, rawDebtLeft = debtLeft, rawGoalLeft = goalLeft;
  let obligLeftFinal = obligLeft, debtLeftFinal = debtLeft, goalLeftFinal = goalLeft;
  const cutActive = !!(monthlyCut && monthlyCut.monthKey === currentMonthKey());
  if(cutActive){
    obligLeftFinal = Math.min(rawObligLeft, Math.max(0, Number(monthlyCut.oblig)||0));
    debtLeftFinal = Math.min(rawDebtLeft, Math.max(0, Number(monthlyCut.debt)||0));
    goalLeftFinal = Math.min(rawGoalLeft, Math.max(0, Number(monthlyCut.goal)||0));
  }

  const unpaidDolzhen = plansState.filter(p => !p.paid && p.kind === 'Должен');
  const unpaidPlanned = plansState.filter(p => !p.paid && p.kind === 'Плановая трата');
  const dolzhenLeft = unpaidDolzhen.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const plannedLeft = unpaidPlanned.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const plansLeft = dolzhenLeft + plannedLeft;

  const reservedTotal = obligLeftFinal + debtLeftFinal + goalLeftFinal + plansLeft;
  const deficitAmount = Math.max(0, reservedTotal - balance);
  const safeDaily = Math.max(0, balance - reservedTotal) / days;
  const freeDaily = Math.max(0, balance) / days;

  return {
    safeDaily, freeDaily, days, payDate, nextAmount, balance, deficitAmount, cutActive,
    obligLeft: obligLeftFinal, debtLeft: debtLeftFinal, goalLeft: goalLeftFinal,
    rawObligLeft, rawDebtLeft, rawGoalLeft,
    plansLeft, dolzhenLeft, plannedLeft,
    unpaidDolzhen, unpaidPlanned, reservedTotal,
    paidOblig, obligationsTotal, paidDebtThisMonth, debtTotal: DEBT.monthly,
  };
}

let cutPanelOpen = false; // управляется только явными кликами открыть/закрыть — render() не должен клацать панель сам

function renderHero(){
  const r = computeSpendable();
  const safeEl = document.getElementById('heroDailySafe');
  const freeEl = document.getElementById('heroDailyFree');
  const sub = document.getElementById('heroSub');
  const warn = document.getElementById('heroWarn');
  const box = document.getElementById('heroReserves');
  const cutPanel = document.getElementById('cutPanel');
  const cutOpenBtn = document.getElementById('cutOpenBtn');
  const cutActiveNote = document.getElementById('cutActiveNote');
  const cutDeficitEl = document.getElementById('cutDeficit');
  const cutActiveAmtEl = document.getElementById('cutActiveAmt');

  if(safeEl){ safeEl.textContent = fmt(r.safeDaily); safeEl.className = 'hero-value safe' + (r.safeDaily<=0?' zero':''); }
  if(freeEl){ freeEl.textContent = fmt(r.freeDaily); freeEl.className = 'hero-value free' + (r.freeDaily<=0?' zero':''); }
  if(sub) sub.textContent = `До конца месяца ${r.days} ${daysWord(r.days)} · ближайшая зарплата ${r.payDate.toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})} (+${fmt(r.nextAmount)})`;

  if(r.deficitAmount > 0){
    if(warn){ warn.style.display='block'; warn.textContent = `Не хватает ${fmt(r.deficitAmount)} с учётом резервов на этот месяц.`; }
    if(cutOpenBtn){ cutOpenBtn.style.display='block'; cutOpenBtn.textContent = r.cutActive ? 'Пересмотреть сокращение' : 'Сократить в этом месяце'; }
    if(cutDeficitEl) cutDeficitEl.textContent = fmt(r.deficitAmount);
    if(cutActiveNote) cutActiveNote.style.display='none';
    // Панель со слайдерами закрывается/открывается только по клику пользователя —
    // если её оставить под управлением render(), она будет схлопываться на середине
    // перетаскивания ползунка при любом фоновом обновлении (тот же класс бага, что
    // раньше стирал несохранённый ввод в Настройках).
    if(cutPanel && !cutPanelOpen) cutPanel.style.display='none';
  } else {
    if(warn) warn.style.display='none';
    if(cutOpenBtn) cutOpenBtn.style.display='none';
    if(cutPanel) cutPanel.style.display='none';
    cutPanelOpen = false;
    if(r.cutActive){
      const freed = (r.rawObligLeft-r.obligLeft) + (r.rawDebtLeft-r.debtLeft) + (r.rawGoalLeft-r.goalLeft);
      if(cutActiveNote) cutActiveNote.style.display='block';
      if(cutActiveAmtEl) cutActiveAmtEl.textContent = fmt(freed);
    } else if(cutActiveNote) cutActiveNote.style.display='none';
  }

  if(box){
    const items = [
      { name:'Обязательные платежи', left: r.obligLeft },
      { name:'Долг (в этом месяце)', left: r.debtLeft },
      { name:'Цели', left: r.goalLeft },
    ];
    const rowsHtml = items.map(it => reserveRowHtml(it.name, it.left)).join('');

    // "Должен" и "Плановая трата" — это две разные категории, не одна общая сумма:
    // у каждой свой заголовок-подытог, а под ним — конкретные записи этой категории.
    const groupHtml = (title, list, total) => {
      if(!list.length) return '';
      return `
        <div class="reserve-group-title">${title} — ${fmt(total)}</div>
        ${list.map(p => reserveRowHtml(p.name, Number(p.amount)||0)).join('')}
      `;
    };

    box.innerHTML = rowsHtml
      + groupHtml('Должен', r.unpaidDolzhen, r.dolzhenLeft)
      + groupHtml('Плановая трата', r.unpaidPlanned, r.plannedLeft);
  }

  renderUpcoming();
}

function reserveRowHtml(name, left){
  return `
    <div class="reserve-row">
      <div class="reserve-status">
        <span class="reserve-dot ${left === 0 ? 'done' : 'pending'}"></span>
        <span>${name}</span>
      </div>
      <span class="reserve-amt ${left === 0 ? 'done' : ''}">${left === 0 ? 'закрыто ✓' : 'осталось ' + fmt(left)}</span>
    </div>
  `;
}

/* ===================== Панель "Сократить в этом месяце" =====================
   Если резервов не хватает (баланс минус обязательные платежи/долг/цели/планы уходит
   в минус), вместо жёсткого зануления показываем ползунки: сколько реально отложить
   по каждой категории в этом конкретном месяце. Это не меняет сами цели навсегда —
   только эффективный резерв на текущий месяц. */
function buildCutSliders(){
  const r = computeSpendable();
  const box = document.getElementById('cutSliders');
  if(!box) return;
  const current = {
    oblig: r.cutActive ? Math.min(r.rawObligLeft, Number(monthlyCut.oblig)||0) : r.rawObligLeft,
    debt: r.cutActive ? Math.min(r.rawDebtLeft, Number(monthlyCut.debt)||0) : r.rawDebtLeft,
    goal: r.cutActive ? Math.min(r.rawGoalLeft, Number(monthlyCut.goal)||0) : r.rawGoalLeft,
  };
  const rows = [
    { key:'oblig', label:'Обязательные платежи', max:r.rawObligLeft, val:current.oblig },
    { key:'debt', label:'Долг', max:r.rawDebtLeft, val:current.debt },
    { key:'goal', label:'Цели', max:r.rawGoalLeft, val:current.goal },
  ].filter(row => row.max > 0);

  if(!rows.length){
    box.innerHTML = '<div class="empty">Резервировать нечего — весь дефицит из-за долга по "должен"/плановым тратам ниже, отредактируй их в Настройках.</div>';
    updateCutFreedPreview();
    return;
  }

  box.innerHTML = rows.map(row => `
    <div class="cut-row">
      <div class="cut-row-top"><span>${row.label}</span><span class="amt" data-out="${row.key}">${fmt(row.val)}</span></div>
      <input type="range" min="0" max="${Math.round(row.max)}" value="${Math.round(row.val)}" data-key="${row.key}">
    </div>
  `).join('');
  box.querySelectorAll('input[type="range"]').forEach(inp=>{
    inp.addEventListener('input', updateCutFreedPreview);
  });
  updateCutFreedPreview();
}

function updateCutFreedPreview(){
  const r = computeSpendable();
  const box = document.getElementById('cutSliders');
  const freedEl = document.getElementById('cutFreed');
  if(!box || !freedEl) return;
  const rawMap = { oblig: r.rawObligLeft, debt: r.rawDebtLeft, goal: r.rawGoalLeft };
  let freed = 0;
  box.querySelectorAll('input[type="range"]').forEach(inp=>{
    const key = inp.dataset.key;
    const val = Number(inp.value);
    freed += Math.max(0, (rawMap[key]||0) - val);
    const out = box.querySelector(`[data-out="${key}"]`);
    if(out) out.textContent = fmt(val);
  });
  freedEl.textContent = fmt(freed);
}

/* Отдельный, всегда видимый список будущих (плановых) операций на главном экране —
   чтобы было прямое подтверждение, что запись с будущей датой сохранилась и будет
   учтена, когда наступит её месяц. */
function renderUpcoming(){
  const box = document.getElementById('upcomingList');
  if(!box) return;
  const upcoming = txs.filter(t => isFutureDate(t.date)).sort((a,b)=> new Date(a.date) - new Date(b.date));
  const wrap = document.getElementById('upcomingSection');
  if(!upcoming.length){
    if(wrap) wrap.style.display = 'none';
    return;
  }
  if(wrap) wrap.style.display = 'block';
  box.innerHTML = upcoming.map(t=>{
    const d = dateOnly(t.date);
    const dateStr = d.toLocaleDateString('ru-RU', {day:'2-digit', month:'long'});
    return `
      <div class="reserve-row">
        <div class="reserve-status"><span>${dateStr} · ${t.category}${t.comment ? ' · ' + t.comment : ''}</span></div>
        <span class="reserve-amt">${t.type==='Расход'?'−':'+'}${fmt(t.amount)}</span>
      </div>
    `;
  }).join('');
}

/* ===================== Основной рендер ===================== */
function isPageVisible(pageId){
  const el = document.getElementById('page-'+pageId);
  return !!el && el.classList.contains('active');
}

function render(){
  const monthIdx = parseInt(document.getElementById('monthSelect').value);
  const monthTxs = txsForMonth(monthIdx);

  const income = monthTxs.filter(t=>t.type==='Доход' && t.category!=='Накопление').reduce((s,t)=>s+t.amount,0);
  const savingsIncome = monthTxs.filter(t=>t.type==='Доход' && t.category==='Накопление').reduce((s,t)=>s+t.amount,0);
  const expense = monthTxs.filter(t=>t.type==='Расход').reduce((s,t)=>s+t.amount,0);
  const remain = income - expense - savingsIncome;
  const rate = income > 0 ? (savingsIncome/income*100) : 0;

  document.getElementById('statIncome').textContent = fmt(income);
  document.getElementById('statExpense').textContent = fmt(expense);
  const remainEl = document.getElementById('statRemain');
  remainEl.textContent = fmt(remain);
  remainEl.className = 'val ' + (remain >= 0 ? 'pos' : 'neg');
  document.getElementById('statRate').textContent = Math.round(rate) + '%';

  safeCall(renderHero);
  safeCall(()=>renderBudgetSection(monthTxs));
  safeCall(()=>renderDebt(monthTxs));
  safeCall(()=>renderGoals());
  safeCall(()=>renderTxList());
  safeCall(()=>renderCigInsight(monthTxs));
  safeCall(renderReportPreview);

  // renderObligSettings() и renderPlansList() НЕ вызываются здесь специально:
  // render() запускается после КАЖДОГО действия в приложении (добавил трату — вызвался
  // render()), а эти две функции полностью пересобирают поля ввода в Настройках. Если
  // делать это на каждый чих, то любой незасохранённый ввод в форме настроек стирается
  // раньше, чем человек успевает нажать «Сохранить». Поэтому они рисуются один раз при
  // старте и вручную — сразу после своих собственных изменений (добавление/удаление
  // платежа, сохранение, добавление/оплата/удаление плана).

  // Тяжёлые графики — только когда соответствующая страница реально открыта,
  // чтобы не тратить время на перерисовку невидимых canvas при каждом вводе.
  if(isPageVisible('analytics')){
    safeCall(()=>renderCatChart(monthTxs));
    safeCall(()=>renderTrendChart());
    safeCall(()=>renderShiftChart(monthTxs));
  }
  if(isPageVisible('debtgoals')){
    safeCall(()=>renderDebtHistory());
  }
}

function refreshChartsForVisiblePage(){
  const monthIdx = parseInt(document.getElementById('monthSelect').value || 0);
  const monthTxs = txsForMonth(monthIdx);
  if(isPageVisible('analytics')){
    safeCall(()=>renderCatChart(monthTxs));
    safeCall(()=>renderTrendChart());
    safeCall(()=>renderShiftChart(monthTxs));
  }
  if(isPageVisible('debtgoals')){
    safeCall(()=>renderDebtHistory());
  }
}

/* ===================== Настройки: редактируемые обязательные платежи ===================== */
function renderObligSettings(){
  const box = document.getElementById('obligList');
  if(!box) return;
  box.innerHTML = '';
  obligationsState.forEach((o, idx)=>{
    const row = document.createElement('div');
    row.className = 'row2';
    row.innerHTML = `
      <input type="text" data-role="name" data-idx="${idx}" value="${o.name.replace(/"/g,'&quot;')}">
      <input type="number" data-role="amount" data-idx="${idx}" value="${o.amount}" min="0">
    `;
    box.appendChild(row);
    const del = document.createElement('button');
    del.type='button'; del.textContent='Удалить платёж'; del.className='tx-del';
    del.style.cssText='padding:2px 0 8px;color:var(--rust);font-size:12px;';
    del.addEventListener('click', ()=>{ obligationsState.splice(idx,1); renderObligSettings(); });
    box.appendChild(del);
  });
}

function readObligFormIntoState(){
  const names = document.querySelectorAll('#obligList input[data-role="name"]');
  const amounts = document.querySelectorAll('#obligList input[data-role="amount"]');
  const list = [];
  names.forEach((el,i)=>{
    const amt = Number(amounts[i]?.value)||0;
    const name = el.value.trim();
    if(name) list.push({ name, amount: amt });
  });
  return list;
}

/* ===================== Настройки: «Должен» / «Плановая трата» ===================== */
function renderPlansList(){
  const box = document.getElementById('planList2');
  if(!box) return;
  box.innerHTML = '';
  if(!plansState.length){
    box.innerHTML = '<div class="empty">Пока нет плановых платежей.</div>';
    return;
  }
  const sorted = [...plansState].sort((a,b)=> new Date(a.dueDate) - new Date(b.dueDate));
  sorted.forEach(p=>{
    const d = dateOnly(p.dueDate);
    const dateStr = d.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'});
    const row = document.createElement('div');
    row.className = 'tx';
    row.style.opacity = p.paid ? '.5' : '1';
    row.innerHTML = `
      <div class="tx-left">
        <div class="cat">${p.kind}${p.paid ? ' · оплачено' : ''}</div>
        <div class="meta">${p.name} · до ${dateStr}</div>
      </div>
      <div style="display:flex;align-items:center;">
        <span class="tx-amt exp">${fmt(p.amount)}</span>
        <button class="tx-edit" data-id="${p.id}" data-act="toggle" aria-label="Оплачено">${p.paid?'↺':'✓'}</button>
        <button class="tx-del" data-id="${p.id}" data-act="del" aria-label="Удалить">✕</button>
      </div>
    `;
    box.appendChild(row);
  });
  box.querySelectorAll('[data-act="toggle"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const item = plansState.find(p=>p.id===btn.dataset.id);
      if(!item) return;
      item.paid = !item.paid;
      await savePlansState();
      renderPlansList();
      render();
    });
  });
  box.querySelectorAll('[data-act="del"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      plansState = plansState.filter(p=>p.id!==btn.dataset.id);
      await savePlansState();
      renderPlansList();
      render();
    });
  });
}

/* ===================== Остальные разделы (как раньше, с мелкими доработками) ===================== */
function renderGoals(){
  const box = document.getElementById('goalsBox');
  if(!box) return;
  box.innerHTML = '';
  GOALS.forEach(g=>{
    const saved = txs.filter(t=>t.type==='Доход' && t.category==='Накопление' && t.comment && t.comment.toLowerCase().includes(g.keyword))
                      .reduce((s,t)=>s+t.amount,0);
    const pct = Math.min(100, Math.round(saved/g.target*100));
    const el = document.createElement('div');
    el.className = 'goal';
    el.innerHTML = `
      <div class="goal-top">
        <span class="name">${g.name}</span>
        <span class="amt">${fmt(saved)} / ${fmt(g.target)}</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
    `;
    box.appendChild(el);
  });
}

function renderTxList(){
  const box = document.getElementById('txList');
  if(!box) return;
  box.innerHTML = '';
  const sorted = [...txs].sort((a,b)=> new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id))).slice(0,20);
  if(sorted.length === 0){
    box.innerHTML = '<div class="empty">Пока пусто. Добавь первую запись выше.</div>';
    return;
  }
  sorted.forEach(t=>{
    const d = new Date(t.date);
    const dateStr = d.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'});
    const future = isFutureDate(t.date);
    const row = document.createElement('div');
    row.className = 'tx';
    row.innerHTML = `
      <div class="tx-left">
        <div class="cat">${t.category}${future ? ' <span style="color:var(--gold);font-size:10.5px;">план</span>' : ''}</div>
        <div class="meta">${dateStr}${t.comment ? ' · ' + t.comment : ''}</div>
      </div>
      <div style="display:flex;align-items:center;">
        <span class="tx-amt ${t.type==='Расход'?'exp':'inc'}">${t.type==='Расход'?'−':'+'}${fmt(t.amount)}</span>
        <button class="tx-edit" data-id="${t.id}" aria-label="Изменить">✎</button>
        <button class="tx-del" data-id="${t.id}" aria-label="Удалить">✕</button>
      </div>
    `;
    box.appendChild(row);
  });
  box.querySelectorAll('.tx-del').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteTx(btn.dataset.id));
  });
  box.querySelectorAll('.tx-edit').forEach(btn=>{
    btn.addEventListener('click', ()=> startEditTx(btn.dataset.id));
  });
}

function renderBudgetPlan(){
  const items = [
    { name:'Обязательные платежи', amount: getObligationsTotal(), color:'#d9614f' },
    { name:'Долг', amount: DEBT.monthly, color:'#c98b5f' },
    { name:'Цели (накопления)', amount: GOALS.reduce((s,g)=>s+g.monthly,0), color:'#d4af37' },
    { name:'Пиво и сигареты', amount: 10000, color:'#7a8fbf' },
    { name:'Прочие траты', amount: LIMITS.find(l=>l.name==='Прочие траты').limit, color:'#5fbca5' },
  ];
  const bar = document.getElementById('planBar');
  const list = document.getElementById('planList');
  if(!bar || !list) return;
  bar.innerHTML = '';
  list.innerHTML = '';
  items.forEach(it=>{
    const pct = (it.amount / MONTHLY_INCOME * 100);
    const seg = document.createElement('div');
    seg.className = 'stackbar-seg';
    seg.style.width = pct + '%';
    seg.style.background = it.color;
    bar.appendChild(seg);

    const row = document.createElement('div');
    row.className = 'plan-item';
    row.innerHTML = `
      <div class="plan-dot" style="background:${it.color}"></div>
      <div class="plan-name">${it.name}</div>
      <div class="plan-amt">${fmt(it.amount)}</div>
      <div class="plan-pct">${Math.round(pct)}%</div>
    `;
    list.appendChild(row);
  });
}

function renderShiftChart(monthTxs){
  const canvas = document.getElementById('shiftChart');
  if(!canvas) return;
  const groups = {'Ночь':0, 'День':0, 'Выходной':0, 'Не указано':0};
  monthTxs.filter(t=>t.type==='Расход').forEach(t=>{
    const key = t.shift && groups.hasOwnProperty(t.shift) ? t.shift : 'Не указано';
    groups[key] += t.amount;
  });
  const labels = Object.keys(groups).filter(k => groups[k] > 0 || k !== 'Не указано');
  const data = labels.map(k=>groups[k]);
  if(shiftChart) shiftChart.destroy();
  shiftChart = new Chart(canvas, {
    type:'bar',
    data:{ labels, datasets:[{ data, backgroundColor:['#7a8fbf','#d4af37','#5fbca5','#6b6355'], borderRadius:6, barThickness:34 }] },
    options:{
      indexAxis:'y',
      maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{color:'#9c9384',font:{family:'IBM Plex Mono',size:9}}, grid:{color:'#3a3126'} },
        y:{ ticks:{color:'#f2ede1',font:{family:'Inter',size:12}}, grid:{display:false} }
      }
    }
  });
}

function renderCigInsight(monthTxs){
  const note = document.getElementById('cigNote');
  if(!note) return;
  const cig = monthTxs.filter(t=>t.type==='Расход' && t.category==='Сигареты').reduce((s,t)=>s+t.amount,0);
  if(cig === 0){ note.textContent = ''; return; }
  const rights = GOALS.find(g=>g.keyword==='права');
  const pctOfGoal = rights ? Math.min(100, Math.round(cig/rights.target*100)) : 0;
  note.textContent = `Из них на сигареты: ${fmt(cig)} — это ${pctOfGoal}% от цели «Права», если бы перекинуть туда.`;
}

/* ===================== Отчёты за произвольный месяц ===================== */
function buildReportForMonth(monthIdx){
  const monthTxs = txsForMonth(monthIdx);
  const income = monthTxs.filter(t=>t.type==='Доход').reduce((s,t)=>s+t.amount,0);
  const expense = monthTxs.filter(t=>t.type==='Расход').reduce((s,t)=>s+t.amount,0);
  const byCat = {};
  monthTxs.filter(t=>t.type==='Расход').forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.amount; });
  const catLines = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`  ${c}: ${fmt(v)}`).join('\n');
  const monthName = MONTHS[monthIdx];
  const count = monthTxs.length;
  if(count === 0){
    return `КОПЕЙКА — отчёт за ${monthName}\n\nЗа этот месяц пока нет записей.`;
  }
  return `КОПЕЙКА — отчёт за ${monthName}\n\nЗаписей: ${count}\nДоход: ${fmt(income)}\nРасходы: ${fmt(expense)}\nОстаток: ${fmt(income-expense)}\n\nПо категориям:\n${catLines || '  нет данных'}`;
}

function renderReportPreview(){
  const sel = document.getElementById('reportMonthSelect');
  const pre = document.getElementById('reportPreview');
  if(!sel || !pre) return;
  const monthIdx = parseInt(sel.value || new Date().getMonth());
  pre.textContent = buildReportForMonth(monthIdx);
}

function renderCatChart(monthTxs){
  const canvas = document.getElementById('catChart');
  if(!canvas) return;
  const byCat = {};
  EXP_CATEGORIES.forEach(c=>byCat[c]=0);
  monthTxs.filter(t=>t.type==='Расход').forEach(t=>{ byCat[t.category] = (byCat[t.category]||0) + t.amount; });
  const labels = Object.keys(byCat).filter(c=>byCat[c]>0);
  const data = labels.map(c=>byCat[c]);
  const palette = ['#d4af37','#d9614f','#5fbca5','#8a7226','#c98b5f','#7a8fbf','#b479a8','#9c9384','#6ba888','#c9a37c'];
  if(catChart) catChart.destroy();
  if(labels.length === 0){
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    return;
  }
  catChart = new Chart(canvas, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor: palette, borderColor:'#211b16', borderWidth:2 }] },
    options:{
      maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color:'#9c9384', font:{family:'Inter',size:11}, padding:10 } } }
    }
  });
}

function renderTrendChart(){
  const canvas = document.getElementById('trendChart');
  if(!canvas) return;
  const incomeArr = [], expenseArr = [], savingsArr = [];
  MONTHS.forEach((m,i)=>{
    const mt = txsForMonth(i);
    const inc = mt.filter(t=>t.type==='Доход' && t.category!=='Накопление').reduce((s,t)=>s+t.amount,0);
    const sav = mt.filter(t=>t.type==='Доход' && t.category==='Накопление').reduce((s,t)=>s+t.amount,0);
    const exp = mt.filter(t=>t.type==='Расход').reduce((s,t)=>s+t.amount,0);
    incomeArr.push(inc); expenseArr.push(exp); savingsArr.push(sav);
  });
  if(trendChart) trendChart.destroy();
  trendChart = new Chart(canvas, {
    type:'bar',
    data:{
      labels: MONTHS,
      datasets:[
        {label:'Доход', data:incomeArr, backgroundColor:'#5fbca5', borderRadius:3},
        {label:'Расходы', data:expenseArr, backgroundColor:'#d9614f', borderRadius:3},
        {label:'Накопления', data:savingsArr, type:'line', borderColor:'#d4af37', backgroundColor:'#d4af37', tension:.3, yAxisID:'y'}
      ]
    },
    options:{
      maintainAspectRatio:false,
      scales:{
        x:{ ticks:{color:'#9c9384',font:{family:'IBM Plex Mono',size:10}}, grid:{color:'#3a3126'} },
        y:{ ticks:{color:'#9c9384',font:{family:'IBM Plex Mono',size:9}}, grid:{color:'#3a3126'} }
      },
      plugins:{ legend:{ position:'bottom', labels:{ color:'#9c9384', font:{family:'Inter',size:11} } } }
    }
  });
}

function budgetItems(){
  return [
    { name:'Обязательные платежи', planned: getObligationsTotal(),
      factFn: mt => mt.filter(t=>t.type==='Расход' && t.category==='Обязательные платежи').reduce((s,t)=>s+t.amount,0) },
    { name:'Долг', planned: DEBT.monthly,
      factFn: mt => mt.filter(t=>t.type==='Расход' && t.category===DEBT.category).reduce((s,t)=>s+t.amount,0) },
    { name:'Цели (накопления)', planned: GOALS.reduce((s,g)=>s+g.monthly,0),
      factFn: mt => mt.filter(t=>t.type==='Доход' && t.category==='Накопление').reduce((s,t)=>s+t.amount,0) },
    { name:'Пиво и сигареты', planned: 10000,
      factFn: mt => mt.filter(t=>t.type==='Расход' && ['Сигареты','Алкоголь'].includes(t.category)).reduce((s,t)=>s+t.amount,0) },
    { name:'Прочие траты', planned: LIMITS.find(l=>l.name==='Прочие траты').limit,
      factFn: mt => mt.filter(t=>t.type==='Расход' && !['Обязательные платежи','Долг','Сигареты','Алкоголь'].includes(t.category)).reduce((s,t)=>s+t.amount,0) },
  ];
}

function renderBudgetSection(monthTxs){
  const box = document.getElementById('budgetList');
  if(!box) return;
  box.innerHTML = budgetItems().map(item=>{
    const fact = item.factFn(monthTxs);
    const pct = item.planned ? Math.min(100, Math.round(fact/item.planned*100)) : 0;
    const over = fact > item.planned;
    const color = over ? 'var(--rust)' : (pct > 85 ? '#c98b5f' : 'var(--gold)');
    return `
      <div class="budget-row">
        <div class="budget-row-top">
          <span class="budget-name">${item.name}</span>
          <span class="budget-figures">${fmt(fact)} / ${fmt(item.planned)}</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div>
      </div>
    `;
  }).join('');
}

function renderDebt(monthTxs){
  const debtHint = document.getElementById('debtHint');
  if(!debtHint) return;
  const paidTotal = txs.filter(t=>t.type==='Расход' && t.category===DEBT.category).reduce((s,t)=>s+t.amount,0);
  const paidThisMonth = monthTxs.filter(t=>t.type==='Расход' && t.category===DEBT.category).reduce((s,t)=>s+t.amount,0);
  const remaining = Math.max(0, DEBT.total - paidTotal);
  const pct = Math.min(100, Math.round(paidTotal/DEBT.total*100));
  const monthsLeft = remaining > 0 ? Math.ceil(remaining / DEBT.monthly) : 0;

  debtHint.textContent =
    remaining === 0
      ? 'Долг полностью закрыт 🎉'
      : `Осталось ${fmt(remaining)} из ${fmt(DEBT.total)}. Ориентир — ${fmt(DEBT.monthly)}/мес, ещё примерно ${monthsLeft} мес. до закрытия. В этом месяце внесено: ${fmt(paidThisMonth)}.`;
  document.getElementById('debtBar').style.width = pct + '%';
}

function renderDebtHistory(){
  const canvas = document.getElementById('debtChart');
  if(!canvas) return;
  const paidByMonth = MONTHS.map((m,i)=>{
    const mt = txsForMonth(i);
    return mt.filter(t=>t.type==='Расход' && t.category===DEBT.category).reduce((s,t)=>s+t.amount,0);
  });
  if(debtChart) debtChart.destroy();
  debtChart = new Chart(canvas, {
    type:'bar',
    data:{
      labels: MONTHS,
      datasets:[{ data: paidByMonth, backgroundColor: paidByMonth.map(v => v >= DEBT.monthly ? '#5fbca5' : (v>0 ? '#d4af37' : '#3a3126')), borderRadius:3 }]
    },
    options:{
      maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{color:'#9c9384',font:{family:'IBM Plex Mono',size:9}}, grid:{display:false} },
        y:{ ticks:{color:'#9c9384',font:{family:'IBM Plex Mono',size:9}}, grid:{color:'#3a3126'} }
      }
    }
  });
}

/* ===================== Роутер страниц ===================== */
const PAGE_IDS = ['home','budget','debtgoals','transactions','analytics','report','settings'];

function showPage(pageId, push){
  if(!PAGE_IDS.includes(pageId)) pageId = 'home';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if(target) target.classList.add('active');
  window.scrollTo(0, 0);
  if(push) history.pushState({ page: pageId }, '', '#' + pageId);
  if(pageId === 'settings'){ safeCall(renderObligSettings); safeCall(renderPlansList); }
  requestAnimationFrame(refreshChartsForVisiblePage);
}

/* ===================== Инициализация обработчиков ===================== */
function wireEvents(){
  document.getElementById('cutOpenBtn').addEventListener('click', ()=>{
    cutPanelOpen = true;
    buildCutSliders();
    document.getElementById('cutPanel').style.display = 'block';
    document.getElementById('cutOpenBtn').style.display = 'none';
  });
  document.getElementById('cutApplyBtn').addEventListener('click', async ()=>{
    const r = computeSpendable();
    const vals = { oblig: r.rawObligLeft, debt: r.rawDebtLeft, goal: r.rawGoalLeft };
    document.querySelectorAll('#cutSliders input[type="range"]').forEach(inp=>{ vals[inp.dataset.key] = Number(inp.value); });
    const btn = document.getElementById('cutApplyBtn');
    btn.disabled = true; btn.textContent = 'Сохраняю…';
    await saveMonthlyCut(vals.oblig, vals.debt, vals.goal);
    cutPanelOpen = false;
    btn.disabled = false; btn.textContent = 'Применить на этот месяц';
    render();
  });
  document.getElementById('cutResetBtn').addEventListener('click', async ()=>{
    await resetMonthlyCut();
    render();
  });

  document.querySelectorAll('.type-toggle button[data-type]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const group = btn.closest('.type-toggle');
      group.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      populateCategorySelect();
    });
  });

  document.getElementById('txForm').addEventListener('submit', handleTxSubmit);

  document.getElementById('copyReportBtn').addEventListener('click', async ()=>{
    const sel = document.getElementById('reportMonthSelect');
    const monthIdx = parseInt(sel.value || new Date().getMonth());
    const report = buildReportForMonth(monthIdx);
    const btn = document.getElementById('copyReportBtn');
    try{
      await navigator.clipboard.writeText(report);
      btn.textContent = 'Скопировано ✓';
    }catch(e){
      btn.textContent = 'Не вышло — выдели текст вручную';
    }
    setTimeout(()=>{ btn.textContent = 'Скопировать отчёт'; }, 2200);
  });

  document.querySelectorAll('[data-goto]').forEach(btn=>{
    btn.addEventListener('click', ()=> showPage(btn.dataset.goto, true));
  });
  document.querySelectorAll('[data-back]').forEach(btn=>{
    btn.addEventListener('click', ()=> history.back());
  });
  window.addEventListener('popstate', (e)=>{
    const pageId = (e.state && e.state.page) || 'home';
    showPage(pageId, false);
  });

  // Настройки: обязательные платежи
  document.getElementById('obligAddBtn').addEventListener('click', ()=>{
    obligationsState.push({ name:'Новый платёж', amount:0 });
    renderObligSettings();
  });
  document.getElementById('obligSaveBtn').addEventListener('click', async ()=>{
    const list = readObligFormIntoState();
    const status = document.getElementById('obligSaveStatus');
    status.textContent = 'Сохраняю…';
    const ok = await saveObligationsSettings(list);
    status.textContent = ok ? 'Сохранено ✓' : 'Сохранено локально (нет связи с облаком)';
    renderObligSettings();
    render();
    setTimeout(()=>{ status.textContent=''; }, 3000);
  });

  // Настройки: «Должен» / «Плановая трата»
  document.querySelectorAll('#planForm .type-toggle button[data-kind]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#planForm .type-toggle button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentPlanKind = btn.dataset.kind;
    });
  });
  document.getElementById('planForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('planName').value.trim();
    const amount = Number(document.getElementById('planAmount').value);
    const dueDate = document.getElementById('planDate').value;
    if(!name || !Number.isFinite(amount) || amount<=0 || !dueDate) return;
    plansState.push({ id: uid(), kind: currentPlanKind, name, amount, dueDate, paid:false });
    document.getElementById('planName').value='';
    document.getElementById('planAmount').value='';
    document.getElementById('planDate').value='';
    await savePlansState();
    renderPlansList();
    render();
  });
}

/* ===================== Запуск ===================== */
(async function init(){
  document.getElementById('txDate').valueAsDate = new Date();
  populateCategorySelect();
  setupMonthSelect();
  setupReportMonthSelect();
  wireEvents();
  safeCall(renderBudgetPlan);

  await loadTxs();
  render();
  safeCall(renderObligSettings);
  safeCall(renderPlansList);

  const initialPage = (location.hash ? location.hash.slice(1) : 'home');
  history.replaceState({ page: PAGE_IDS.includes(initialPage) ? initialPage : 'home' }, '');
  showPage(PAGE_IDS.includes(initialPage) ? initialPage : 'home', false);

  if('serviceWorker' in navigator){
    try{
      const reg = await navigator.serviceWorker.register('sw.js');
      reg.update().catch(()=>{});
      // Если появилась новая версия sw.js — не ждать закрытия всех вкладок, а сразу
      // применить её и один раз перезагрузить страницу, чтобы человек не застревал
      // на старой закэшированной версии приложения (это уже случалось с этим проектом).
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{
        if(reloaded) return;
        reloaded = true;
        location.reload();
      });
      reg.addEventListener('updatefound', ()=>{
        const nw = reg.installing;
        if(!nw) return;
        nw.addEventListener('statechange', ()=>{
          if(nw.state === 'installed' && navigator.serviceWorker.controller){
            nw.postMessage && nw.postMessage('skipWaiting');
          }
        });
      });
    }
    catch(e){ console.error('SW registration failed:', e); }
  }

  // Периодически пытаемся дослать всё, что осталось несинхронизированным (например,
  // если сеть появилась уже после открытия приложения), не перезагружая всю страницу.
  setInterval(async ()=>{
    const localRaw = readLocalCache();
    if(localRaw.some(t=>String(t.id).startsWith('local-'))){
      await loadTxs();
      render();
    }
  }, 45000);
  window.addEventListener('online', async ()=>{ await loadTxs(); render(); });
})();
