// Extracted from index.html by the SCRUM-32 migration (block 11).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

let tpLiveBookings = [];

async function tpLoadSchedule() {
  if (!earnCurrentTutor) return;
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/analytics?resource=my-tutor-bookings`, { headers: await seedsAuthHeaders() });
    const data = await r.json();
    tpLiveBookings = (data.recentBookings||[]).filter(b => b.status !== 'cancelled');
    // This week's lessons count
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    const weekCount = tpLiveBookings.filter(b => { const d = new Date(b.startTime); return d >= weekStart && d < weekEnd; }).length;
    const weekEl = document.getElementById('tp-kpi-week');
    if (weekEl) weekEl.textContent = weekCount;
    tpUpdateHomeKPIs(earnCurrentTutor);
    tpRenderHomeToday();
    // Note: tpRenderSchedulePanel() used to run here too, but it targeted
    // the SAME card element as the real calendar grid (tpCalRender below)
    // and unconditionally overwrote it with a plain "No bookings yet."
    // message — destroying #tp-cal-grid-body/#tp-cal-month-label whenever
    // called, which made tpCalRender() bail out early (its `if (!grid)
    // return`) and left the "Upcoming lessons" list stuck on its static
    // "Loading…" placeholder forever. Removed; the calendar grid below
    // already renders its own empty state correctly.
    if (typeof tpCalRender === 'function') tpCalRender();
    tpRenderAssignedLeads();
    tpRenderRecentHomework();
  } catch(e) { console.error('tpLoadSchedule:', e.message); seedsToast('Could not load your schedule — check your connection and refresh.'); }
}

async function tpRenderRecentHomework() {
  const el = document.getElementById('tp-home-hw-mark');
  if (!el) return;
  try {
    // Get this tutor's students, then their recently-completed homework
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/analytics?resource=students`, { headers: await seedsAuthHeaders() });
    const students = await r.json();
    const mine = students.filter(tpIsMyStudent);
    let items = [];
    const _tpHwAuthH = await seedsAuthHeaders();
    for (const s of mine.slice(0, 8)) {
      try {
        const hr = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=homework&studentId=${s.id}`, { headers: _tpHwAuthH });
        const hw = await hr.json();
        hw.filter(h => h.completed).forEach(h => items.push({ student: s.student_name, ...h }));
      } catch(e) {}
    }
    items.sort((a,b) => new Date(b.completed_at||b.created_at) - new Date(a.completed_at||a.created_at));
    items = items.slice(0, 4);
    if (!items.length) {
      el.innerHTML = '<div style="padding:14px;text-align:center;color:#A7A7A7;font-size:.8rem">No completed homework yet.</div>';
      return;
    }
    el.innerHTML = items.map((h,i) => {
      const when = h.completed_at ? new Date(h.completed_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
      return `<div class="tp-lesson-row"${i===items.length-1?' style="border-bottom:none"':''}>
        <div class="tp-l-stripe" style="background:#2D7A4F"></div>
        <div class="tp-l-info"><div class="tp-l-subj">${h.student} — ${h.title}</div><div class="tp-l-meta">Completed ${when}</div></div>
        <span style="font-size:.7rem;color:#2D7A4F;font-weight:700">✓ Done</span>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="padding:14px;text-align:center;color:#A7A7A7;font-size:.8rem">Unable to load.</div>';
  }
}

const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F'};
const TYPE_LBL = {gcse:'GCSE 1:1',alevel:'A-Level 1:1',group:'Group',trial:'Free trial',consultation:'Initial Consultation'};

function tpTimeBtn(iso) {
  const diff = new Date(iso) - Date.now();
  const mins = Math.round(diff/60000);
  if (mins < -90) return {label:'Completed', cls:'tp-l-btn-soon'};
  if (mins < 15)  return {label:'🔴 Join now', cls:'tp-l-btn-live'};
  const hrs = Math.round(mins/60);
  if (hrs < 24) return {label:`in ${hrs}h`, cls:'tp-l-btn-soon'};
  return {label:`in ${Math.round(hrs/24)}d`, cls:'tp-l-btn-soon'};
}
function tpFmt(iso) {
  return new Date(iso).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}

// SCRUM-87: free sessions a student requests for themselves arrive as
// 'requested' and are not real until this tutor accepts them. Surfaced at
// the top of the tutor's home so a request can't sit unnoticed — without
// this the student would be left staring at "Pending tutor confirmation"
// forever with nothing on the tutor's side ever prompting them.
function tpRenderPendingRequests() {
  const host = document.getElementById('tp-home');
  if (!host) return;
  const existing = document.getElementById('tp-requests-card');
  const pending = tpLiveBookings
    .filter(b => b.status === 'requested' && new Date(b.startTime) > Date.now())
    .sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  if (!pending.length) { if (existing) existing.remove(); return; }

  const card = existing || document.createElement('div');
  card.id = 'tp-requests-card';
  // Deliberately NOT class "tp-card": tpRenderHomeToday() below grabs
  // `#tp-home > .tp-card`, so giving this card that class would make it
  // hijack the today-lessons render.
  card.style.cssText = 'margin-bottom:16px;border:1.5px solid #F0DFAE;background:#FFFCF4;border-radius:14px;padding:16px 18px';
  card.innerHTML = `<div class="tp-card-hdr"><span class="tp-card-title">⏳ Awaiting your confirmation (${pending.length})</span></div>`
    + pending.map((b,i) => `<div class="tp-lesson-row"${i===pending.length-1?' style="border-bottom:none"':''}>
        <div class="tp-l-stripe" style="background:#C8A15A"></div>
        <div class="tp-l-info">
          <div class="tp-l-subj">${b.studentName||'A student'} — ${TYPE_LBL[b.lessonType]||b.lessonType}</div>
          <div class="tp-l-meta">${tpFmt(b.startTime)} · requested by the student</div>
        </div>
        <button class="tp-btn-xs tp-btn-primary" onclick="tpConfirmRequest('${b.id}',this)">Confirm</button>
      </div>`).join('');
  if (!existing) host.insertBefore(card, host.firstChild);
}

async function tpConfirmRequest(bookingId, btn) {
  btn.disabled = true; btn.textContent = 'Confirming…';
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=confirm-booking`, {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ bookingId }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to confirm');
    seedsToast('Confirmed — the student has been emailed the details.', false);
    tpLoadSchedule();
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Confirm';
    seedsToast('Could not confirm: ' + e.message);
  }
}

// SCRUM-88: finished lessons nobody has said anything about yet. These are
// invisible to billing and to payouts until the tutor answers, so this is
// the tutor's own money sitting unclaimed — it belongs at the top of their
// home screen, not buried in the calendar.
function tpRenderAwaitingDelivery() {
  const host = document.getElementById('tp-home');
  if (!host) return;
  const existing = document.getElementById('tp-delivery-card');
  const now = Date.now();
  const awaiting = tpLiveBookings
    .filter(b => !b.deliveryStatus && b.status === 'confirmed' && b.endTime && new Date(b.endTime) < now)
    .sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  if (!awaiting.length) { if (existing) existing.remove(); return; }

  const card = existing || document.createElement('div');
  card.id = 'tp-delivery-card';
  // Same reasoning as tp-requests-card: not class "tp-card", or
  // tpRenderHomeToday() would grab this instead of the today-lessons card.
  card.style.cssText = 'margin-bottom:16px;border:1.5px solid #CFE3F5;background:#F7FBFF;border-radius:14px;padding:16px 18px';
  card.innerHTML = `<div class="tp-card-hdr"><span class="tp-card-title">📋 Confirm what happened (${awaiting.length})</span></div>`
    + `<div style="font-size:.75rem;color:#718096;margin:-4px 0 10px">Families aren't charged and you aren't paid until these are confirmed.</div>`
    + awaiting.slice(0, 8).map((b,i) => `<div class="tp-lesson-row"${i===Math.min(awaiting.length,8)-1?' style="border-bottom:none"':''}>
        <div class="tp-l-stripe" style="background:#4A90D9"></div>
        <div class="tp-l-info">
          <div class="tp-l-subj">${b.studentName||'A student'} — ${b.subject||TYPE_LBL[b.lessonType]||b.lessonType}</div>
          <div class="tp-l-meta">${tpFmt(b.startTime)}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${tpDeliveryControl(b)}</div>
      </div>`).join('')
    + (awaiting.length > 8 ? `<div style="font-size:.72rem;color:#A7A7A7;padding-top:8px">…and ${awaiting.length - 8} more in your calendar.</div>` : '');
  if (!existing) host.insertBefore(card, host.firstChild);
}

function tpRenderHomeToday() {
  tpRenderPendingRequests();
  tpRenderAwaitingDelivery();
  const card = document.querySelector('#tp-home > .tp-card');
  if (!card) return;
  const hdr = card.querySelector('.tp-card-hdr');
  const now = new Date();
  const today = tpLiveBookings.filter(b => {
    const d = new Date(b.startTime);
    return d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
  const countEl = document.getElementById('tp-today-count');
  if (countEl) countEl.textContent = today.length;
  if (!today.length) {
    card.innerHTML = (hdr?.outerHTML||'') + '<div style="padding:16px;text-align:center;color:#A7A7A7;font-size:.82rem">No lessons today.</div>';
    return;
  }
  card.innerHTML = (hdr?.outerHTML||'') + today.map((b,i) => {
    const {label,cls} = tpTimeBtn(b.startTime);
    const last = i===today.length-1 ? 'border-bottom:none' : '';
    return `<div class="tp-lesson-row" style="${last}">
      <div class="tp-l-stripe" style="background:${COLOURS[b.lessonType]||'#C8A15A'}"></div>
      <div class="tp-l-info">
        <div class="tp-l-subj">${b.studentName} — ${b.subject}</div>
        <div class="tp-l-meta">${new Date(b.startTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · ${TYPE_LBL[b.lessonType]}</div>
      </div>
      <button class="tp-l-btn ${cls}"${cls==='tp-l-btn-live'?` onclick="tpJoinLesson('${b.meetLink||''}')"`:''}>${label}</button>
        <button onclick="tpOpenLessonLogFromBtn(this)" data-bid="${b.id||''}" data-sid="${b.studentId||''}" data-sname="${b.studentName||''}" data-subj="${b.subject||''}" title="Log lesson" style="padding:5px 9px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.68rem;font-weight:600;color:#718096;cursor:pointer;background:#fff;font-family:Inter,sans-serif">📝</button>
      </div>
    </div>`;
  }).join('');
}

function tpJoinLesson(meetLink) {
  if (meetLink) window.open(meetLink, '_blank');
  else alert('No meeting link set for this lesson yet.');
}

async function tpRenderAssignedLeads() {
  try {
    // Backend now scopes GET (no email filter) to this tutor's own leads
    // server-side — the client-side filter below is just an extra status
    // check, not the access boundary.
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/leads`, { headers: await seedsAuthHeaders() });
    const leads = await r.json();
    const mine = leads.filter(l => l.assigned_tutor === earnCurrentTutor && l.status === 'assigned');
    const cards = document.querySelectorAll('#tp-home .tp-card');
    const trialCard = Array.from(cards).find(c => c.innerHTML.includes('trial request') || c.innerHTML.includes('New trial'));
    if (!trialCard) return;
    const hdr = trialCard.querySelector('.tp-card-hdr');
    if (!mine.length) {
      trialCard.innerHTML = (hdr?.outerHTML||'') + '<div style="padding:16px;text-align:center;color:#A7A7A7;font-size:.82rem">No pending assignments.</div>';
      return;
    }
    trialCard.innerHTML = (hdr?.outerHTML||'') + mine.map((l,i)=>{
      const last = i===mine.length-1 ? 'border-bottom:none' : '';
      const isConfirmed = l.status === 'confirmed';
      // SCRUM-81: if this tutor has a Cal.com consultation link on file, the
      // family already got a real scheduling link by email the moment admin
      // assigned this lead (see api/leads.js) — the backend flags that on
      // the lead itself (notes.calLinkSent) so this button doesn't also
      // invite the tutor into the legacy manual-slots flow on top of it,
      // which used to happen unconditionally regardless of Cal.com status.
      let calLinkSent = false;
      try { calLinkSent = !!JSON.parse(l.notes || '{}').calLinkSent; } catch(e) {}
      let actionBtn;
      if (isConfirmed) {
        actionBtn = `<button class="tp-btn-xs tp-btn-ghost" style="color:#2D7A4F">Confirmed ✓</button>`;
      } else if (calLinkSent) {
        actionBtn = `<button class="tp-btn-xs tp-btn-ghost" style="color:#718096">Sent via Cal.com</button>`;
      } else {
        actionBtn = `<button class="tp-btn-xs tp-btn-primary" onclick="tpOpenProposeSlots('${l.id}','${l.name}','${l.subject||''}',this)">Propose times</button>`;
      }
      const meta = isConfirmed ? 'Times proposed — awaiting student choice'
        : calLinkSent ? 'Family received a Cal.com scheduling link — awaiting their booking'
        : 'Assigned by admin · propose available times';
      return `<div class="tp-lesson-row" style="${last}">
        <div class="tp-l-stripe" style="background:#2D7A4F"></div>
        <div class="tp-l-info">
          <div class="tp-l-subj">${l.name} — ${l.subject||''} (${l.level||''})</div>
          <div class="tp-l-meta">${meta}</div>
        </div>
        ${actionBtn}
      </div>`;
    }).join('');
  } catch(e) { console.error('tpRenderAssignedLeads:', e.message); }
}

async function tpConfirmLead(leadId, btn) {
  btn.disabled = true; btn.textContent = 'Confirming…';
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/leads`, {
      method: 'PATCH',
      headers: await seedsAuthHeaders(),
      body: JSON.stringify({id: leadId, status: 'confirmed'}),
    });
    if (!r.ok) throw new Error('Failed');
    btn.textContent = 'Confirmed ✓';
    btn.classList.replace('tp-btn-primary','tp-btn-ghost');
  } catch(e) { btn.disabled=false; btn.textContent='Retry'; }
}

const _origTPOpen = window._openTutorPortal;
window._openTutorPortal = function() {
  _origTPOpen();
  setTimeout(tpLoadSchedule, 300);
};
const _origTPPanel = window.showTpPanel;
window.showTpPanel = function(id, navEl) {
  _origTPPanel(id, navEl);
  if (id==='tp-home'||id==='tp-schedule') tpLoadSchedule();
  if (id==='tp-schedule') { tpCalViewDate = new Date(); setTimeout(tpCalRender, 300); }
  if (id==='tp-earnings') { earnLoadData(); setTimeout(earnLoadFullHistory, 1000); }
  if (id==='tp-students') tpRenderStudentsList();
  if (id==='tp-resources') tpLoadResources();
};


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "tpLiveBookings", { get: () => tpLiveBookings, set: (v) => { tpLiveBookings = v; }, configurable: true });
  window.tpLoadSchedule = tpLoadSchedule;
  window.tpRenderRecentHomework = tpRenderRecentHomework;
  window.COLOURS = COLOURS;
  window.TYPE_LBL = TYPE_LBL;
  window.tpTimeBtn = tpTimeBtn;
  window.tpFmt = tpFmt;
  window.tpRenderPendingRequests = tpRenderPendingRequests;
  window.tpConfirmRequest = tpConfirmRequest;
  window.tpRenderAwaitingDelivery = tpRenderAwaitingDelivery;
  window.tpRenderHomeToday = tpRenderHomeToday;
  window.tpJoinLesson = tpJoinLesson;
  window.tpRenderAssignedLeads = tpRenderAssignedLeads;
  window.tpConfirmLead = tpConfirmLead;
  window._origTPOpen = _origTPOpen;
  window._origTPPanel = _origTPPanel;
}
