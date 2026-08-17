/* Копейка — точечные исправления после новой реализации */
(function () {
  'use strict';

  function fixedComputePeriodSummary(state, periodStart, periodEnd) {
    const today = todayStr();
    const shiftsList = [];
    for (let d = periodStart; d <= periodEnd; d = addDays(d, 1)) {
      shiftsList.push(getShift(d, state));
    }

    let actualManualIncome = 0;
    let expectedManualIncome = 0;
    state.income
      .filter(i => i.date >= periodStart && i.date <= periodEnd)
      .forEach(i => {
        if (i.status === 'actual') actualManualIncome += i.amount || 0;
        else expectedManualIncome += i.amount || 0;
      });

    const actualShiftIncome = 0;
    const expectedShiftIncome = 0;
    const actualIncome = actualManualIncome;
    const expectedIncome = expectedManualIncome;
    const totalIncome = actualIncome + expectedIncome;

    let actualRegular = 0;
    let plannedRegular = 0;
    let actualObligatory = 0;
    let plannedObligatory = 0;

    state.expenses
      .filter(e => e.date >= periodStart && e.date <= periodEnd)
      .forEach(e => {
        const amount = e.amount || 0;
        const bucket = e.date <= today ? 'actual' : 'planned';
        if (e.mandatory) {
          if (bucket === 'actual') actualObligatory += amount;
          else plannedObligatory += amount;
        } else {
          if (bucket === 'actual') actualRegular += amount;
          else plannedRegular += amount;
        }
      });

    state.recurring.filter(r => r.active).forEach(r => {
      occurrencesInRange(r, periodStart, periodEnd).forEach(dt => {
        const bucket = dt <= today ? 'actual' : 'planned';
        if (bucket === 'actual') actualObligatory += r.amount || 0;
        else plannedObligatory += r.amount || 0;
      });
    });

    const totalRegular = actualRegular + plannedRegular;
    const totalObligatory = actualObligatory + plannedObligatory;

    let reservesNeeded = 0;
    const reserveBreakdown = [];
    state.reserves.filter(r => r.active).forEach(r => {
      const need = reserveRawNeed(r, periodStart, periodEnd, totalIncome);
      reservesNeeded += need;
      reserveBreakdown.push({ reserve: r, need });
    });

    const currentBalance = state.settings.currentBalance || 0;
    const availableNow = currentBalance;
    const forecastBeforeReserves = currentBalance + expectedIncome - plannedRegular - plannedObligatory;
    const forecastAfterReserves = forecastBeforeReserves - reservesNeeded;

    // Строгий режим не учитывает будущий доход. Если обязательства уже
    // превышают доступные деньги, лимит трат — 0 ₽, а не отрицательная сумма.
    const strictAvailableRaw = currentBalance - plannedRegular - plannedObligatory - reservesNeeded;
    const strictAvailable = Math.max(0, strictAvailableRaw);

    const remainingDays = periodEnd < today
      ? 0
      : diffDays(today > periodStart ? today : periodStart, periodEnd) + 1;

    const noReserveLimit = remainingDays > 0 ? Math.max(0, Math.round(forecastBeforeReserves / remainingDays)) : null;
    const safeLimit = remainingDays > 0 ? Math.max(0, Math.round(forecastAfterReserves / remainingDays)) : null;
    const strictLimit = remainingDays > 0 ? Math.max(0, Math.round(strictAvailable / remainingDays)) : null;

    const pool0 = Math.max(0, forecastBeforeReserves);
    let poolLeft = pool0;
    const sortedReserves = reserveBreakdown.slice().sort(
      (a, b) => (a.reserve.priority || 99) - (b.reserve.priority || 99)
    );
    const allocation = sortedReserves.map(rb => {
      const alloc = Math.min(rb.need, Math.max(0, poolLeft));
      poolLeft -= alloc;
      return {
        reserve: rb.reserve,
        need: rb.need,
        allocated: alloc,
        deficit: rb.need - alloc
      };
    });

    return {
      periodStart, periodEnd, remainingDays,
      shiftsList,
      actualShiftIncome, expectedShiftIncome,
      actualManualIncome, expectedManualIncome,
      actualIncome, expectedIncome, totalIncome,
      actualRegular, plannedRegular, totalRegular,
      actualObligatory, plannedObligatory, totalObligatory,
      reservesNeeded, reserveBreakdown, allocation,
      currentBalance, availableNow,
      forecastBeforeReserves, forecastAfterReserves, strictAvailable,
      noReserveLimit, safeLimit, strictLimit
    };
  }

  // Доход теперь формируется только из вручную добавленных записей STATE.income.
  window.computePeriodSummary = fixedComputePeriodSummary;

  // Экран доходов: автоматический доход от смен полностью убран.
  window.renderIncome = function () {
    const { start, end } = currentPeriod();
    const summary = computePeriodSummary(STATE, start, end);
    const manual = STATE.income
      .filter(i => i.date >= start && i.date <= end)
      .sort((a, b) => b.date.localeCompare(a.date));

    let h = '';
    h += '<div class="grid2">';
    h += statCard('Получено', fmt(summary.actualIncome), 'вручную внесённый факт', [], '');
    h += statCard('Ожидается', fmt(summary.expectedIncome), 'вручную внесённый прогноз', [], '');
    h += '</div>';
    h += '<div class="card" style="text-align:center;">';
    h += '<div class="label">Доход за период</div>';
    h += '<div class="mid-number">' + fmt(summary.totalIncome) + '</div>';
    h += '<div class="faint" style="margin-top:5px;">Автоматического дохода от смен нет — всё вводится вручную.</div>';
    h += '</div>';

    h += '<div class="section-title">Введённый доход</div>';
    h += '<div class="card">';
    if (!manual.length) {
      h += emptyState('Доходов пока нет. Добавьте их вручную.', '&#128176;');
    } else {
      manual.forEach(i => {
        h += itemRow(
          '&#128181;',
          i.title,
          fmtDateHuman(i.date) + ' · ' + (i.status === 'actual' ? 'получено' : 'ожидается'),
          fmt(i.amount),
          'income:' + i.id
        );
      });
    }
    h += '</div>';

    document.getElementById('main').innerHTML = h;
    bindListClicks();
  };

  // Мобильная нижняя панель: safe-area, фиксированная высота и защита
  // от вылезания подписей/кнопок за экран на узких смартфонах.
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 899px) {
      #main { padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important; }
      .bottomnav {
        left: 0; right: 0; bottom: 0; width: 100%;
        min-height: 64px; height: auto;
        padding: 5px 3px calc(5px + env(safe-area-inset-bottom, 0px));
        box-sizing: border-box; overflow: hidden;
      }
      .navbtn {
        min-width: 0; flex: 1 1 0; width: 0;
        padding: 5px 2px; gap: 2px;
        font-size: clamp(9px, 2.7vw, 10.5px);
        line-height: 1.1; white-space: nowrap;
      }
      .navbtn span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
      .navbtn svg { width: 21px; height: 21px; flex: 0 0 auto; }
      .fab { bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
      .toast { bottom: calc(82px + env(safe-area-inset-bottom, 0px)); }
    }
    @media (max-width: 360px) {
      .navbtn { font-size: 8.5px; padding-left: 1px; padding-right: 1px; }
      .navbtn svg { width: 19px; height: 19px; }
    }
  `;
  document.head.appendChild(style);
})();
