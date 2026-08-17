/* Копейка — единая финансовая логика v2 + Supabase cloud */
(function () {
  'use strict';

  const SB_URL = 'https://cqslrfphsjllhltsvvuq.supabase.co';
  const SB_KEY = 'sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
  const SB_HEADERS = {
    apikey: SB_KEY,
    Authorization: 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json'
  };
  const META_TYPE = 'Meta';
  const META_CATEGORY = '__state_v2__';
  let cloudRowId = null;
  let cloudReady = false;
  let lastCloudJson = '';
  let syncing = false;

  const num = v => Number(v) || 0;
  const today = () => new Date().toISOString().slice(0, 10);
  const safeFmt = n => Math.round(num(n)).toLocaleString('ru-RU') + ' ₽';

  /* ============================================================
     1. ДОХОД: единственный источник = STATE.income.
     Смены НИКОГДА не являются заработанными деньгами.
     ============================================================ */
  function manualIncome(start, end) {
    const list = Array.isArray(STATE && STATE.income) ? STATE.income : [];
    let actual = 0, planned = 0;
    list.forEach(i => {
      if (!i || i.date < start || i.date > end) return;
      const amount = num(i.amount);
      if (i.status === 'expected' || i.status === 'planned' || i.status === 'forecast') planned += amount;
      else actual += amount;
    });
    return { actual, planned, total: actual + planned };
  }

  function buildSummary(start, end) {
    const t = today();
    const inc = manualIncome(start, end);
    let actualRegular = 0, plannedRegular = 0, actualObligatory = 0, plannedObligatory = 0;

    (STATE.expenses || []).forEach(e => {
      if (!e || e.date < start || e.date > end) return;
      const a = num(e.amount);
      const future = e.date > t;
      if (e.mandatory) future ? plannedObligatory += a : actualObligatory += a;
      else future ? plannedRegular += a : actualRegular += a;
    });

    (STATE.recurring || []).filter(r => r.active).forEach(r => {
      try {
        occurrencesInRange(r, start, end).forEach(dt => {
          const a = num(r.amount);
          if (dt > t) plannedObligatory += a; else actualObligatory += a;
        });
      } catch (_) {}
    });

    const totalRegular = actualRegular + plannedRegular;
    const totalObligatory = actualObligatory + plannedObligatory;
    const balance = num(STATE.settings && STATE.settings.currentBalance);
    const reserves = (STATE.reserves || []).filter(r => r.active).reduce((s, r) => {
      try { return s + num(reserveRawNeed(r, start, end, inc.total)); } catch (_) { return s; }
    }, 0);

    /* Actual money is current balance + ONLY money actually received.
       Expected income never becomes spendable money. */
    const spendable = Math.max(0, balance + inc.actual - actualRegular - actualObligatory);
    const forecast = Math.max(0, balance + inc.actual + inc.planned - actualRegular - actualObligatory - plannedRegular - plannedObligatory);
    const strictPool = Math.max(0, balance + inc.actual - actualRegular - actualObligatory - plannedRegular - plannedObligatory - reserves);
    const days = Math.max(1, diffDays(t > start ? t : start, end) + 1);

    return {
      periodStart: start, periodEnd: end,
      shiftsList: [],
      actualShiftIncome: 0,
      expectedShiftIncome: 0,
      actualManualIncome: inc.actual,
      expectedManualIncome: inc.planned,
      actualIncome: inc.actual,
      expectedIncome: inc.planned,
      totalIncome: inc.total,
      actualRegular, plannedRegular, totalRegular,
      actualObligatory, plannedObligatory, totalObligatory,
      reservesNeeded: reserves,
      currentBalance: balance,
      availableNow: Math.max(0, balance + inc.actual - actualRegular - actualObligatory),
      forecastBeforeReserves: forecast,
      forecastAfterReserves: Math.max(0, forecast - reserves),
      strictAvailable: strictPool,
      remainingDays: days,
      noReserveLimit: Math.round(Math.max(0, forecast) / days),
      safeLimit: Math.round(Math.max(0, forecast - reserves) / days),
      strictLimit: Math.round(strictPool / days),
      reserveBreakdown: [], allocation: []
    };
  }

  window.computePeriodSummary = buildSummary;

  /* Kill the old automatic salary source wherever the new page exposes it. */
  try {
    if (typeof window.SHIFT_RATE !== 'undefined') window.SHIFT_RATE = 0;
    if (typeof window.MONTHLY_INCOME !== 'undefined') window.MONTHLY_INCOME = 0;
  } catch (_) {}

  /* ============================================================
     2. ДОХОДЫ: экран показывает только ручные записи.
     ============================================================ */
  window.renderIncome = function () {
    const { start, end } = currentPeriod();
    const s = buildSummary(start, end);
    const manual = (STATE.income || []).filter(i => i.date >= start && i.date <= end)
      .sort((a,b) => String(b.date).localeCompare(String(a.date)));
    let h = '';
    h += '<div class="grid2">';
    h += statCard('Получено', safeFmt(s.actualIncome), 'фактически внесено вручную', [], '');
    h += statCard('Ожидается', safeFmt(s.expectedIncome), 'вручную указанный прогноз', [], '');
    h += '</div>';
    h += '<div class="card" style="text-align:center">';
    h += '<div class="label">Доход за период</div>';
    h += '<div class="mid-number">' + safeFmt(s.totalIncome) + '</div>';
    h += '<div class="faint" style="margin-top:5px">Смены сами по себе денег не добавляют.</div></div>';
    h += '<div class="section-title">Введённый доход</div><div class="card">';
    if (!manual.length) h += emptyState('Доходов пока нет. Добавьте полученную сумму вручную.', '&#128176;');
    else manual.forEach(i => {
      h += itemRow('&#128181;', i.title || 'Доход', fmtDateHuman(i.date) + ' · ' + (i.status === 'expected' ? 'ожидается' : 'получено'), safeFmt(i.amount), 'income:' + i.id);
    });
    h += '</div>';
    document.getElementById('main').innerHTML = h;
    bindListClicks();
  };

  /* ============================================================
     3. СТРОГИЙ РЕЖИМ.
     Нельзя тратить будущий доход. Нельзя получать отрицательный лимит.
     Текущий баланс + реально полученный доход — единственный денежный пул.
     ============================================================ */
  window.getStrictAvailable = function (summary) {
    return Math.max(0, num(summary && summary.currentBalance) + num(summary && summary.actualIncome)
      - num(summary && summary.actualRegular) - num(summary && summary.actualObligatory)
      - num(summary && summary.plannedRegular) - num(summary && summary.plannedObligatory)
      - num(summary && summary.reservesNeeded));
  };

  /* ============================================================
     4. ЗАЩИТА UI ОТ СТАРОГО «96 000 ₽ ЗАРАБОТАНО».
     Если в карточке дохода источник — расчёт смен, показываем ручной факт.
     ============================================================ */
  function repairIncomeCards() {
    try {
      const { start, end } = currentPeriod();
      const s = buildSummary(start, end);
      document.querySelectorAll('.card,.stat-card,.stat').forEach(card => {
        const text = card.textContent || '';
        if (!/заработано|заработал|доход за смен|доход от смен/i.test(text)) return;
        const amountNodes = card.querySelectorAll('.big-number,.mid-number,.amount,.value,.mono,strong');
        amountNodes.forEach(n => {
          const raw = n.textContent || '';
          if (/\d[\d\s]*\s*₽/.test(raw)) n.textContent = safeFmt(s.actualIncome);
        });
      });
    } catch (_) {}
  }
  const mo = new MutationObserver(() => repairIncomeCards());
  mo.observe(document.documentElement, { childList:true, subtree:true });
  setTimeout(repairIncomeCards, 100);
  setTimeout(repairIncomeCards, 1000);

  /* ============================================================
     5. SUPABASE CLOUD — восстановлено из прежней версии проекта.
     Полный STATE хранится как Meta-запись; локальный кэш остаётся резервом.
     ============================================================ */
  function setCloudStatus(ok) {
    window.cloudOnline = !!ok;
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    if (dot) dot.className = 'sync-dot ' + (ok ? 'online' : 'offline');
    if (text) text.textContent = ok ? 'в облаке' : 'только локально';
  }

  async function cloudGet() {
    const url = SB_URL + '/rest/v1/transactions?select=id,date,type,category,amount,shift,comment&category=eq.' + encodeURIComponent(META_CATEGORY) + '&order=id.desc&limit=1';
    const r = await fetch(url, { headers: SB_HEADERS, cache:'no-store' });
    if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
    const rows = await r.json();
    return rows[0] || null;
  }

  async function cloudPut() {
    if (!STATE || syncing) return;
    const payloadState = JSON.parse(JSON.stringify(STATE));
    const json = JSON.stringify(payloadState);
    if (json === lastCloudJson) return;
    syncing = true;
    try {
      const payload = {
        date: today(), type: META_TYPE, category: META_CATEGORY,
        amount: 0, shift: '', comment: JSON.stringify({ version:2, state:payloadState, updatedAt:Date.now() })
      };
      let r;
      if (cloudRowId) {
        r = await fetch(SB_URL + '/rest/v1/transactions?id=eq.' + encodeURIComponent(cloudRowId), {
          method:'PATCH', headers:{...SB_HEADERS, Prefer:'return=representation'}, body:JSON.stringify(payload)
        });
      } else {
        r = await fetch(SB_URL + '/rest/v1/transactions', {
          method:'POST', headers:{...SB_HEADERS, Prefer:'return=representation'}, body:JSON.stringify(payload)
        });
      }
      if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
      const rows = await r.json();
      if (rows[0]) cloudRowId = rows[0].id;
      lastCloudJson = json;
      setCloudStatus(true);
    } catch (e) {
      console.warn('Облако недоступно, продолжаем локально:', e);
      setCloudStatus(false);
    } finally { syncing = false; }
  }

  async function cloudLoad() {
    try {
      const row = await cloudGet();
      setCloudStatus(true);
      if (!row || !row.comment) { cloudReady = true; return; }
      cloudRowId = row.id;
      const parsed = JSON.parse(row.comment || '{}');
      const remote = parsed.state;
      if (!remote || typeof remote !== 'object') { cloudReady = true; return; }

      /* Cloud is used to restore a real saved state, but never overwrites a
         non-empty local state blindly. Arrays are merged by id. */
      const local = STATE;
      const meaningfulLocal = (local.income?.length || local.expenses?.length || local.reserves?.length);
      if (!meaningfulLocal) {
        Object.keys(remote).forEach(k => { STATE[k] = remote[k]; });
      } else {
        ['income','expenses','reserves','recurring'].forEach(k => {
          if (!Array.isArray(remote[k])) return;
          const localArr = Array.isArray(local[k]) ? local[k] : [];
          const ids = new Set(localArr.map(x => String(x.id)));
          remote[k].forEach(x => { if (!ids.has(String(x.id))) localArr.push(x); });
          local[k] = localArr;
        });
        if (remote.settings && local.settings) {
          local.settings = {...remote.settings, ...local.settings};
        }
      }
      lastCloudJson = JSON.stringify(STATE);
      try { localStorage.setItem('kopeyka:state', JSON.stringify(STATE)); } catch (_) {}
      cloudReady = true;
      if (typeof render === 'function') render();
      setTimeout(repairIncomeCards, 50);
    } catch (e) {
      console.warn('Supabase недоступен:', e);
      setCloudStatus(false);
      cloudReady = true;
    }
  }

  /* Sync any local changes back to cloud. The local app remains fully usable
     without network; the next successful cycle uploads the current state. */
  let lastObserved = '';
  setInterval(() => {
    try {
      if (!window.STATE || !cloudReady) return;
      const j = JSON.stringify(STATE);
      if (j !== lastObserved) {
        lastObserved = j;
        try { localStorage.setItem('kopeyka:state', j); } catch (_) {}
        cloudPut();
      }
      repairIncomeCards();
    } catch (_) {}
  }, 2500);

  window.addEventListener('online', () => { setCloudStatus(true); cloudPut(); });
  window.addEventListener('beforeunload', () => { try { cloudPut(); } catch (_) {} });

  /* ============================================================
     6. MOBILE NAV — сохраняем предыдущую правку.
     ============================================================ */
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width:899px){
      #main{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}
      .bottomnav{left:0;right:0;bottom:0;width:100%;min-height:64px;height:auto;padding:5px 3px calc(5px + env(safe-area-inset-bottom,0px));box-sizing:border-box;overflow:hidden}
      .navbtn{min-width:0;flex:1 1 0;width:0;padding:5px 2px;gap:2px;font-size:clamp(9px,2.7vw,10.5px);line-height:1.1;white-space:nowrap}
      .navbtn span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
      .navbtn svg{width:21px;height:21px;flex:0 0 auto}
      .fab{bottom:calc(76px + env(safe-area-inset-bottom,0px))}
      .toast{bottom:calc(82px + env(safe-area-inset-bottom,0px))}
    }
    @media(max-width:360px){.navbtn{font-size:8.5px;padding-left:1px;padding-right:1px}.navbtn svg{width:19px;height:19px}}
  `;
  document.head.appendChild(style);

  /* Start cloud restore after the main script has created STATE. */
  function bootCloud() {
    if (window.STATE) cloudLoad();
    else setTimeout(bootCloud, 100);
  }
  bootCloud();
})();
