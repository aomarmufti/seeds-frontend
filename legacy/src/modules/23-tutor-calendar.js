// Extracted from index.html by the SCRUM-32 migration (block 23).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ TUTOR CALENDAR ══════════════════════════════════════════════════════
let tpCalViewDate = new Date();

function tpCalNav(dir) {
  tpCalViewDate = new Date(tpCalViewDate.getFullYear(), tpCalViewDate.getMonth() + dir, 1);
  tpCalRender();
}

function tpCalRender() {
  const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F'};
  const now = new Date();
  const year = tpCalViewDate.getFullYear();
  const month = tpCalViewDate.getMonth();

  const lbl = document.getElementById('tp-cal-month-label');
  if (lbl) lbl.textContent = tpCalViewDate.toLocaleDateString('en-GB',{month:'long',year:'numeric'});

  const grid = document.getElementById('tp-cal-grid-body');
  if (!grid) return;

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Build booking lookup by day
  const byDate = {};
  tpLiveBookings.forEach(b => {
    const d = new Date(b.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(b);
    }
  });

  let cells = '';
  for (let i = 0; i < startOffset; i++) {
    cells += `<div class="cal-d cal-empty"><div class="cal-d-num" style="color:#E8E8E8">${daysInPrev - startOffset + 1 + i}</div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    const bookings = byDate[d] || [];
    const colour = bookings.length ? (COLOURS[bookings[0].lessonType] || '#C8A15A') : '';
    const label = bookings.length
      ? `<div class="cal-d-lbl" style="color:${colour}">${bookings[0].studentName?.split(' ')[0] || 'Lesson'}</div>`
      : '';
    const hasClass = bookings.length ? 'cal-has' : '';
    const click = bookings.length ? `onclick="tpCalShowDay(${d},${month},${year})" style="cursor:pointer"` : '';
    cells += `<div class="cal-d ${hasClass}${isToday?' cal-today':''}" ${click}><div class="cal-d-num">${d}</div>${label}</div>`;
  }
  const remaining = (startOffset + daysInMonth) % 7;
  for (let i = 1; i <= (remaining ? 7 - remaining : 0); i++) {
    cells += `<div class="cal-d cal-empty"><div class="cal-d-num" style="color:#E8E8E8">${i}</div></div>`;
  }
  grid.innerHTML = cells;

  // Week count
  const ws = new Date(now); ws.setHours(0,0,0,0); ws.setDate(now.getDate() - (now.getDay()+6)%7);
  const we = new Date(ws); we.setDate(ws.getDate()+7);
  const wc = tpLiveBookings.filter(b => { const d = new Date(b.startTime); return d >= ws && d < we; }).length;
  const wcEl = document.getElementById('tp-cal-week-count');
  if (wcEl) wcEl.textContent = wc ? `${wc} lesson${wc>1?'s':''} this week` : '';

  // Render upcoming list
  tpCalRenderList();
}

function tpCalShowDay(day, month, year) {
  const dayStart = new Date(year, month, day);
  const dayEnd = new Date(year, month, day + 1);
  const dayBookings = tpLiveBookings.filter(b => {
    const d = new Date(b.startTime);
    return d >= dayStart && d < dayEnd;
  });
  tpCalRenderListItems(dayBookings,
    dayStart.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}));
}

function tpCalRenderList() {
  const upcoming = [...tpLiveBookings]
    .filter(b => new Date(b.startTime) > Date.now() - 86400000)
    .sort((a,b) => new Date(a.startTime)-new Date(b.startTime))
    .slice(0, 8);
  tpCalRenderListItems(upcoming, 'Upcoming lessons');
}

function tpCalRenderListItems(bookings, headerText) {
  const el = document.getElementById('tp-cal-ev-list');
  const hdr = document.getElementById('tp-cal-list-hdr');
  if (!el) return;
  if (hdr) hdr.textContent = headerText;
  const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F'};
  const TYPE_LBL = {gcse:'GCSE 1:1',alevel:'A-Level 1:1',group:'Group',trial:'Free trial',consultation:'Initial Consultation'};
  if (!bookings.length) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:#A7A7A7;font-size:.82rem">No lessons.</div>';
    return;
  }
  el.innerHTML = bookings.map(b => {
    const diff = new Date(b.startTime) - Date.now();
    const isLive = diff > -5400000 && diff < 0;
    const isSoon = diff >= 0 && diff < 1440*60000;
    const colour = COLOURS[b.lessonType] || '#C8A15A';
    const joinBtn = b.meetLink
      ? `<button onclick="window.open('${b.meetLink}','_blank')" style="padding:6px 13px;background:${isLive?'#2D7A4F':'#0D1B2A'};color:#fff;border:none;border-radius:7px;font-size:.71rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">${isLive?'🔴 Join now':'Join'}</button>`
      : '';
    const prepBtn = `<button onclick="tpOpenPrepMode(Object.assign(document.createElement('button'),{dataset:{bid:'${b.id||''}',sid:'${b.studentId||''}',sname:'${(b.studentName||'').replace(/'/g,'')}',subj:'${(b.subject||'').replace(/'/g,'')}',meet:'${b.meetLink||''}',start:'${b.startTime||''}'}}))" style="padding:6px 10px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.71rem;font-weight:600;color:#718096;cursor:pointer;background:#fff;font-family:Inter,sans-serif">📋 Prep</button>`;
    // SCRUM-57: only offer to manage a lesson that hasn't happened yet —
    // the backend rejects cancelling/rescheduling a past lesson anyway.
    const manageBtn = diff > 0
      ? `<button onclick="tpOpenSelfManage('${b.id||''}','${(b.studentName||'').replace(/'/g,'')}','${(b.subject||'').replace(/'/g,'')}','${b.startTime||''}')" style="padding:6px 10px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.71rem;font-weight:600;color:#718096;cursor:pointer;background:#fff;font-family:Inter,sans-serif">⚙ Manage</button>`
      : '';
    return `<div class="cal-ev">
      <div class="cal-ev-stripe" style="background:${colour}"></div>
      <div class="cal-ev-info">
        <div class="cal-ev-subj">${b.studentName} — ${b.subject} (${TYPE_LBL[b.lessonType]||b.lessonType})</div>
        <div class="cal-ev-meta">${tpFmt(b.startTime)}${b.meetLink?' · <a href="'+b.meetLink+'" target="_blank" style="color:#4A90D9;text-decoration:none">Meeting link ↗</a>':''}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${joinBtn}${prepBtn}${manageBtn}${tpDeliveryControl(b)}</div>
    </div>`;
  }).join('');
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "tpCalViewDate", { get: () => tpCalViewDate, set: (v) => { tpCalViewDate = v; }, configurable: true });
  window.tpCalNav = tpCalNav;
  window.tpCalRender = tpCalRender;
  window.tpCalShowDay = tpCalShowDay;
  window.tpCalRenderList = tpCalRenderList;
  window.tpCalRenderListItems = tpCalRenderListItems;
}
