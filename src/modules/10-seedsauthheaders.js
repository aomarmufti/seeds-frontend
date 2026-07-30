// Extracted from index.html by the SCRUM-32 migration (block 10).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// NOTE (SCRUM-32): spRenderHome(), spSubmitBooking() are declared here but replaced later by
// another module assigning to window. Under the old shared global scope that
// replacement applied to this block's own calls too; as a module, a local
// declaration would shadow it. Declared as ...$base and published to window so
// every reference, here included, still resolves to the current override.

const SP_BACKEND = 'https://seeds-backend-six.vercel.app';
let spBookings = [];

// SCRUM-13: notes/homework/progress/lessons/availability now require the
// caller's Supabase session token so the backend can verify ownership —
// shared by both the student and tutor portals since both call the same
// lifecycle.js endpoints.
async function seedsAuthHeaders() {
  const { data: { session } } = await sbClient.auth.getSession();
  return session ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } : { 'Content-Type': 'application/json' };
}

async function spLoadData() {
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const { data: profile } = await sbClient
      .from('profiles').select('full_name').eq('id', session.user.id).single();
    const studentName = profile?.full_name || '';
    const studentEmail = session.user.email;

    const r = await fetchWithTimeout(`${SP_BACKEND}/api/analytics?resource=my-bookings`, { headers: await seedsAuthHeaders() });
    const analytics = await r.json();
    spBookings = (analytics.recentBookings || []).filter(b => b.status !== 'cancelled');
    spRenderHome(studentName);
    spRenderCalendar();
    calRender(); // refresh grid with real bookings
    spCheckPendingSlots(studentEmail);
    spCheckPendingPayments(studentEmail);
    spLoadLifecycle(studentEmail);
  } catch(e) { console.error('spLoadData:', e.message); seedsToast('Could not load your lessons — check your connection and refresh.'); }
}

// ── STUDENT LIFECYCLE: progress, homework ────────────────────────────────
let spStudentId = null;

async function spLoadLifecycle(email) {
  try {
    const _spAuthH = await seedsAuthHeaders();
    const [progR, hwR] = await Promise.all([
      fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=progress&studentEmail=${encodeURIComponent(email)}`, { headers: _spAuthH }),
      fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=homework&studentEmail=${encodeURIComponent(email)}`, { headers: _spAuthH }),
    ]);
    const progress = await progR.json();
    const homework = await hwR.json();
    spRenderProgressWithTrend(progress);
    spRenderHomework(homework);
  } catch(e) { console.error('spLoadLifecycle:', e.message); }
}

const SP_PROG_COLOURS = ['#C8A15A','#2D7A4F','#4A90D9','#7B5EA7'];

function spRenderProgress(progress) {
  const el = document.getElementById('sp-progress-cards');
  if (progress.length) {
    const top = progress.reduce((a,b) => b.percent > a.percent ? b : a, progress[0]);
    const pEl = document.getElementById('sp-stat-progress');
    const lblEl = document.getElementById('sp-stat-progress-lbl');
    if (pEl) pEl.innerHTML = top.percent + '<em>%</em>';
    if (lblEl) lblEl.textContent = top.subject + ' progress';
  }
  // Home mini progress card
  const homeEl = document.getElementById('sp-home-progress');
  if (homeEl) {
    if (!progress.length) {
      homeEl.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;padding:8px 0">No progress tracked yet.</div>';
    } else {
      const COL = ['#C8A15A','#2D7A4F','#7B5EA7','#4A90D9'];
      homeEl.innerHTML = progress.slice(0,4).map((p,i) => `
        <div class="p-prog-item"${i===Math.min(progress.length,4)-1?' style="margin-bottom:0"':''}>
          <div class="p-prog-hdr"><span class="p-prog-name">${p.subject}</span><span class="p-prog-pct">${p.percent}% · ${p.target_grade||'—'}</span></div>
          <div class="p-prog-track"><div class="p-prog-fill" style="width:${p.percent}%;background:${COL[i%4]}"></div></div>
        </div>`).join('');
    }
  }
  if (!el) return;
  if (!progress.length) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.85rem;padding:20px;text-align:center">No progress recorded yet. Your tutor will update this after your lessons.</div>';
    return;
  }
  el.innerHTML = progress.map((p, i) => {
    const colour = SP_PROG_COLOURS[i % SP_PROG_COLOURS.length];
    return `<div class="psc">
      <div class="psc-hdr">
        <div><div class="psc-name">${p.subject}</div><div class="psc-target">Target: ${p.target_grade||'—'}</div></div>
        <div class="psc-grade" style="color:${colour}">${p.current_grade||'—'}</div>
      </div>
      <div class="psc-bar"><div class="psc-fill" style="width:${p.percent}%;background:${colour}"></div></div>
      <div class="psc-pct">${p.percent}% covered${p.note ? ' · '+p.note : ''}</div>
    </div>`;
  }).join('');
}

function spRenderHomework(homework) {
  const el = document.getElementById('sp-homework-container');
  // Update home stat: homework completion rate
  if (homework.length) {
    const done = homework.filter(h => h.completed).length;
    const rate = Math.round((done / homework.length) * 100);
    const hEl = document.getElementById('sp-stat-hw');
    if (hEl) hEl.innerHTML = rate + '<em>%</em>';
  }
  // Home mini homework card
  const homeEl = document.getElementById('sp-home-homework');
  if (homeEl) {
    if (!homework.length) {
      homeEl.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;padding:8px 0">No homework assigned yet.</div>';
    } else {
      const sorted = [...homework].sort((a,b) => (a.completed?1:0)-(b.completed?1:0)).slice(0,4);
      homeEl.innerHTML = sorted.map((h,i) => {
        const due = h.due_date ? new Date(h.due_date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}) : '';
        const urgent = h.due_date && !h.completed && (new Date(h.due_date)-Date.now() < 3*86400000);
        return `<div class="p-hw"${i===sorted.length-1?' style="border-bottom:none"':''}>
          <div class="p-hw-chk${h.completed?' p-done':''}" onclick="spToggleHomework('${h.id}',${!h.completed},this)">${h.completed?'✓':''}</div>
          <div class="p-hw-task"><div class="p-hw-title${h.completed?' p-striked':''}">${h.title}</div><div class="p-hw-sub">${h.subject||''} · ${h.tutor_name}</div></div>
          <span class="p-hw-due${urgent?' p-urgent':''}">${h.completed?'Done ✓':(due?'Due '+due:'')}</span>
        </div>`;
      }).join('');
    }
  }
  if (!el) return;
  if (!homework.length) {
    el.innerHTML = '<div class="p-card"><div style="color:#A7A7A7;font-size:.85rem;padding:20px;text-align:center">No homework assigned yet.</div></div>';
    return;
  }
  const pending = homework.filter(h => !h.completed);
  const done = homework.filter(h => h.completed);

  const hwRow = (h, isDone) => {
    const due = h.due_date ? new Date(h.due_date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}) : '';
    const urgent = h.due_date && new Date(h.due_date) - Date.now() < 3*86400000 && !isDone;
    return `<div class="p-hw"${isDone?'':' '}>
      <div class="p-hw-chk${isDone?' p-done':''}" onclick="spToggleHomework('${h.id}',${!isDone},this)">${isDone?'✓':''}</div>
      <div class="p-hw-task">
        <div class="p-hw-title${isDone?' p-striked':''}">${h.title}</div>
        <div class="p-hw-sub">${h.subject||''} · ${h.tutor_name}${h.description?' · '+h.description:''}</div>
      </div>
      <span class="p-hw-due${urgent?' p-urgent':''}">${isDone?'Done ✓':(due?'Due '+due:'No due date')}</span>
    </div>`;
  };

  let html = '';
  if (pending.length) {
    html += `<div class="p-card" style="margin-bottom:12px">
      <div class="p-card-hdr"><span style="font-size:.68rem;font-weight:700;color:#718096;letter-spacing:.08em;text-transform:uppercase">Pending</span></div>
      ${pending.map(h => hwRow(h, false)).join('')}
    </div>`;
  }
  if (done.length) {
    html += `<div class="p-card">
      <div class="p-card-hdr"><span style="font-size:.68rem;font-weight:700;color:#718096;letter-spacing:.08em;text-transform:uppercase">Completed</span></div>
      ${done.map(h => hwRow(h, true)).join('')}
    </div>`;
  }
  el.innerHTML = html;
}

async function spToggleHomework(id, markComplete, el) {
  try {
    await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=homework`, {
      method: 'PATCH',
      headers: await seedsAuthHeaders(),
      body: JSON.stringify({ id, completed: markComplete }),
    });
    // Reload
    const { data: { session } } = await sbClient.auth.getSession();
    if (session) spLoadLifecycle(session.user.email);
  } catch(e) { console.error('toggle homework:', e.message); }
}

async function spCheckPendingPayments(email) {
  // Billing is periodic (weekly/monthly), not per-lesson — what can be
  // "due" is a billing_batches row (the family's saved card was declined,
  // or they have no card on file so a Checkout link was emailed instead),
  // not an individual booking. Bookings themselves no longer carry their
  // own pending-payment state under this model.
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/billing?resource=billing-history`, { headers: await seedsAuthHeaders() });
    const data = await r.json();
    const unpaid = (data.batches||[]).filter(b => b.status === 'payment_link_sent' || b.status === 'failed');
    if (!unpaid.length) return;

    const homePanel = document.getElementById('p-home');
    if (!homePanel) return;
    const existing = document.getElementById('sp-pay-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'sp-pay-banner';
    banner.style.cssText = 'background:#fff3cd;border:1.5px solid #C8A15A;border-radius:14px;padding:18px 20px;margin-bottom:16px';
    banner.innerHTML = `
      <div style="font-weight:700;color:#0D1B2A;margin-bottom:6px">💳 Payment due</div>
      <div style="font-size:.82rem;color:#4A5568;margin-bottom:12px">${unpaid.length > 1 ? 'You have ' + unpaid.length + ' outstanding bills' : 'You have an outstanding bill'} — please pay to keep your account up to date.</div>
      ${unpaid.map(b => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #f0e0b0">
        <div>
          <div style="font-weight:600;font-size:.85rem">${b.cycle==='monthly'?'Monthly':'Weekly'} bill — £${(b.totalPence/100).toFixed(2)}</div>
          <div style="font-size:.75rem;color:#718096">${spBatchPeriodLabel(b)}${b.status==='failed'?' · Payment failed':''}</div>
        </div>
        ${b.paymentLink ? `<a href="${b.paymentLink}" style="padding:8px 16px;background:#0D1B2A;color:#fff;text-decoration:none;border-radius:8px;font-size:.78rem;font-weight:700;font-family:Inter,sans-serif">Pay now</a>` : ''}
      </div>`).join('')}`;
    homePanel.insertBefore(banner, homePanel.firstChild.nextSibling || homePanel.firstChild);
  } catch(e) { console.error('spCheckPendingPayments:', e.message); }
}
async function spCheckPendingSlots(email) {
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/leads?email=${encodeURIComponent(email)}`, {
      headers: await seedsAuthHeaders(),
    });
    const leads = await r.json();
    const pending = (leads || []).filter(l => {
      if (l.status !== 'confirmed' || !l.notes) return false;
      try { return JSON.parse(l.notes).proposedSlots?.length > 0; }
      catch(e) { return false; }
    });
    spRenderSlotPicker(pending);
  } catch(e) { console.error('spCheckPendingSlots:', e.message); }
}

function spRenderSlotPicker(pendingLeads) {
  const existing = document.getElementById('sp-slot-banner');
  if (existing) existing.remove();
  if (!pendingLeads.length) return;

  const homePanel = document.getElementById('p-home');
  if (!homePanel) return;

  const banner = document.createElement('div');
  banner.id = 'sp-slot-banner';
  banner.style.cssText = 'background:linear-gradient(135deg,#0D1B2A,#243650);border-radius:16px;padding:22px 24px;margin-bottom:20px;color:#fff';

  banner.innerHTML = pendingLeads.map(lead => {
    let slots = [];
    let tutorName = lead.assigned_tutor || '';
    try {
      const notes = JSON.parse(lead.notes);
      slots = notes.proposedSlots || [];
      tutorName = notes.tutorName || tutorName;
    } catch(e) {}
    const slotBtns = slots.map(s => {
      const label = new Date(s).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
      return `<button onclick="spSelectSlot('${lead.id}','${s}',this)" style="display:block;width:100%;text-align:left;padding:12px 16px;margin-bottom:8px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;transition:all .2s" onmouseover="this.style.background='rgba(200,161,90,0.25)';this.style.borderColor='#C8A15A'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='rgba(255,255,255,0.15)'">📅 ${label}</button>`;
    }).join('');
    return `
      <div style="font-family:'DM Serif Display',serif;font-size:1.15rem;margin-bottom:4px">Choose your lesson time</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,0.7);margin-bottom:14px">${tutorName} has proposed times for your ${lead.subject} trial lesson. Pick the one that works:</div>
      ${slotBtns}
      <div id="sp-slot-msg-${lead.id}" style="display:none;font-size:.82rem;color:#C8A15A;margin-top:8px;font-weight:600"></div>`;
  }).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:16px 0">');

  homePanel.insertBefore(banner, homePanel.firstChild);
}

async function spSelectSlot(leadId, slot, btn) {
  const parent = btn.parentElement;
  parent.querySelectorAll('button').forEach(b => b.disabled = true);
  btn.textContent = 'Booking…';
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'select-slot', leadId, chosenSlot: slot }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    const msg = document.getElementById('sp-slot-msg-' + leadId);
    if (msg) { msg.textContent = '✓ Lesson booked! Check your email for the calendar invite and meeting link.'; msg.style.display = 'block'; }
    // Refresh after a moment
    setTimeout(() => spLoadData(), 1500);
  } catch(e) {
    parent.querySelectorAll('button').forEach(b => b.disabled = false);
    btn.textContent = '📅 ' + new Date(slot).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
    alert('Booking failed: ' + e.message);
  }
}

function spFmt(iso) {
  return new Date(iso).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
function spTimeLabel(iso) {
  const diff = new Date(iso) - Date.now();
  const mins = Math.round(diff/60000);
  if (mins < -90) return null; // past
  if (mins < 0 || mins < 15) return '🔴 Live';
  const hrs = Math.round(mins/60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.round(hrs/24)}d`;
}
function spTimeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
function spJoinLesson(meetLink) {
  if (meetLink) {
    window.open(meetLink, '_blank');
  } else {
    alert('Your meeting link isn\'t ready yet — check your confirmation email, or contact your tutor.');
  }
}

// SCRUM-68: per-booking payment-status badge for the student's own
// bookings, matching the admin panel's payment_status-driven badge
// (adRenderBookings) — periodic billing already resolves down to a
// per-booking payment_status server-side (see spCheckPendingPayments'
// comment on the billing model), so this is a straight read, not a new
// computation.
const SP_PAY_BADGE = {
  paid: { bg: '#eaf5ee', color: '#2D7A4F', label: 'Paid' },
  free: { bg: '#eaf5ee', color: '#2D7A4F', label: 'Free' },
  failed: { bg: '#fdeaea', color: '#c0392b', label: 'Failed' },
  invoiced: { bg: '#fff3cd', color: '#8a6d00', label: 'Invoiced' },
};
function spPayBadge(b) {
  if (b.status === 'cancelled') return '';
  const cfg = SP_PAY_BADGE[b.paymentStatus] || { bg: '#f0f0f0', color: '#8a8a8a', label: 'Unbilled' };
  return `<span class="sp-pay-badge" style="padding:2px 9px;border-radius:20px;font-size:.66rem;font-weight:700;background:${cfg.bg};color:${cfg.color};margin-left:6px;white-space:nowrap">${cfg.label}</span>`;
}

function spRenderHome$base(studentName) {
  const greet = document.getElementById('p-greeting-name');
  if (greet && studentName) greet.textContent = studentName.split(' ')[0] ? studentName : 'Welcome';
  const tod = document.getElementById('p-greet-tod');
  if (tod) tod.textContent = 'Good ' + spTimeOfDay() + ' ✨';
  const sub = document.getElementById('p-greet-sub');
  if (sub) {
    const subjects = [...new Set(spBookings.map(b => b.subject).filter(Boolean))];
    sub.textContent = subjects.length ? subjects.join(' · ') : 'Your Seeds student portal';
  }

  const completed = spBookings.filter(b => b.status === 'completed').length;
  const upcomingCount = spBookings.filter(b => new Date(b.startTime) > Date.now()).length;

  // Sidebar profile card
  if (studentName) {
    const initials = studentName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const avEl = document.getElementById('sp-sidebar-av');
    const nmEl = document.getElementById('sp-sidebar-name');
    const sbSub = document.getElementById('sp-sidebar-sub');
    if (avEl) avEl.textContent = initials;
    if (nmEl) nmEl.textContent = studentName;
    const subs = [...new Set(spBookings.map(b => b.subject).filter(Boolean))];
    if (sbSub) sbSub.textContent = subs.length ? subs.join(' · ') : 'Seeds student';
  }

  const lEl = document.getElementById('sp-stat-lessons');
  if (lEl) lEl.textContent = completed;
  const uEl = document.getElementById('sp-stat-upcoming');
  if (uEl) uEl.textContent = upcomingCount;

  const upcoming = spBookings
    .filter(b => new Date(b.startTime) > Date.now() - 5400000)
    .sort((a,b) => new Date(a.startTime)-new Date(b.startTime))
    .slice(0,3);

  const card = document.querySelector('#p-home .p-cols .p-card');
  if (!card) return;
  const hdr = card.querySelector('.p-card-hdr');
  if (!upcoming.length) {
    // SCRUM-87: an approved student with no bookings used to get a dead end
    // here ("your tutor will be in touch soon") with nothing to act on —
    // the only route to a first consultation was the pre-signup wizard on
    // the public site, which they've already been through or never saw.
    const hasConsultation = spBookings.some(b => b.lessonType === 'consultation');
    card.innerHTML = (hdr?.outerHTML||'') + `<div style="padding:22px 16px;text-align:center">
      <div style="font-size:1.6rem;margin-bottom:8px">🌱</div>
      <div style="font-size:.9rem;font-weight:600;color:#0D1B2A;margin-bottom:4px">${hasConsultation ? 'No upcoming lessons' : 'Start with a free consultation'}</div>
      <div style="font-size:.8rem;color:#718096;margin-bottom:14px">${hasConsultation
        ? 'Book your next lesson whenever you\'re ready.'
        : 'A free 15-minute chat to talk through goals and find the right tutor. No payment needed.'}</div>
      <button onclick="spOpenBook()" style="padding:10px 18px;background:#0D1B2A;color:#fff;border:none;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">${hasConsultation ? 'Book a lesson' : 'Book my free consultation →'}</button>
    </div>`;
    return;
  }
  const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F',consultation:'#C8A15A'};
  const TYPE_LBL = {gcse:'GCSE 1:1',alevel:'A-Level 1:1',group:'Group',trial:'Free trial',consultation:'Initial Consultation'};
  card.innerHTML = (hdr?.outerHTML||'') + upcoming.map(b => {
    const lbl = spTimeLabel(b.startTime);
    const isLive = lbl === '🔴 Live';
    // SCRUM-87: a free session the student requested themselves is real and
    // holds the slot, but isn't confirmed until the tutor accepts it — say
    // so plainly rather than showing it as a normal booked lesson.
    const isPending = b.status === 'requested';
    return `<div class="p-lesson">
      <div class="p-l-stripe" style="background:${isPending ? '#A7A7A7' : (COLOURS[b.lessonType]||'#C8A15A')}"></div>
      <div class="p-l-info">
        <div class="p-l-subj">${b.subject} — ${TYPE_LBL[b.lessonType]||b.lessonType}${isPending ? spPendingBadge() : spPayBadge(b)}</div>
        <div class="p-l-meta">${spFmt(b.startTime)} · ${b.tutorName} · 55 min</div>
      </div>
      ${isPending
        ? `<button class="p-join-btn p-join-soon" style="cursor:default;opacity:.7" title="Waiting for your tutor to confirm">Requested</button>`
        : `<button class="p-join-btn ${isLive?'p-join-live':'p-join-soon'}"${isLive?` onclick="spJoinLesson('${b.meetLink||''}')"`:''}>${lbl||'Soon'}</button>`}
    </div>`;
  }).join('');
}

// SCRUM-87: pill shown instead of the payment badge while a requested free
// session is waiting on its tutor.
function spPendingBadge() {
  return `<span style="display:inline-block;margin-left:7px;padding:2px 8px;border-radius:20px;background:#FDF6E7;color:#8A6D1F;font-size:.66rem;font-weight:700;vertical-align:middle">⏳ Pending tutor confirmation</span>`;
}

// ── LIVE CALENDAR ENGINE ─────────────────────────────────────────────────
let calViewDate = new Date(); // which month we're viewing

function calNav(dir) {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + dir, 1);
  calRender();
}

function calRender() {
  const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F'};
  const now = new Date();
  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();

  // Month label
  const monthLabel = document.getElementById('cal-month-label');
  if (monthLabel) monthLabel.textContent = calViewDate.toLocaleDateString('en-GB',{month:'long',year:'numeric'});

  // Grid
  const grid = document.getElementById('cal-grid-body');
  if (!grid) return;

  const firstDay = new Date(year, month, 1);
  // Monday-based: getDay() returns 0=Sun so we shift
  let startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build booking lookup: date string → bookings[]
  const bookingsByDate = {};
  spBookings.forEach(b => {
    const d = new Date(b.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!bookingsByDate[key]) bookingsByDate[key] = [];
      bookingsByDate[key].push(b);
    }
  });

  let cells = '';
  // Prev month filler
  for (let i = 0; i < startOffset; i++) {
    cells += `<div class="cal-d cal-empty"><div class="cal-d-num" style="color:#E8E8E8">${daysInPrevMonth - startOffset + 1 + i}</div></div>`;
  }
  // This month
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    const bookings = bookingsByDate[d] || [];
    const colour = bookings.length ? (COLOURS[bookings[0].lessonType] || '#C8A15A') : '';
    const label = bookings.length ? `<div class="cal-d-lbl" style="color:${colour}">${bookings[0].subject || 'Lesson'} ${new Date(bookings[0].startTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>` : '';
    const hasClass = bookings.length ? 'cal-has' : '';
    const click = bookings.length ? `onclick="calShowDay(${d},${month},${year})" style="cursor:pointer"` : '';
    cells += `<div class="cal-d ${hasClass}${isToday?' cal-today':''}" ${click}><div class="cal-d-num">${d}</div>${label}</div>`;
  }
  // Next month filler
  const totalCells = startOffset + daysInMonth;
  const remaining = totalCells % 7 ? 7 - (totalCells % 7) : 0;
  for (let i = 1; i <= remaining; i++) {
    cells += `<div class="cal-d cal-empty"><div class="cal-d-num" style="color:#E8E8E8">${i}</div></div>`;
  }
  grid.innerHTML = cells;

  // This week count
  const weekStart = new Date(now); weekStart.setHours(0,0,0,0);
  weekStart.setDate(now.getDate() - (now.getDay()+6)%7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+7);
  const thisWeek = spBookings.filter(b => {
    const d = new Date(b.startTime);
    return d >= weekStart && d < weekEnd;
  }).length;
  const wc = document.getElementById('cal-week-count');
  if (wc) wc.textContent = thisWeek ? `${thisWeek} lesson${thisWeek>1?'s':''} this week` : '';

  spRenderCalendar();
}

function calShowDay(day, month, year) {
  // Filter bookings for that day and show in the list
  const dayStart = new Date(year, month, day);
  const dayEnd = new Date(year, month, day + 1);
  const dayBookings = spBookings.filter(b => {
    const d = new Date(b.startTime);
    return d >= dayStart && d < dayEnd;
  });
  const listEl = document.getElementById('cal-ev-list');
  if (!listEl) return;
  const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F'};
  const TYPE_LBL = {gcse:'GCSE 1:1',alevel:'A-Level 1:1',group:'Group',trial:'Free trial',consultation:'Initial Consultation'};
  const header = `<div style="font-size:.79rem;font-weight:700;color:#0D1B2A;margin-bottom:8px">${dayStart.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>`;
  listEl.innerHTML = header + dayBookings.map(b => {
    const icsUrl = `${SP_BACKEND}/api/bookings?action=ics&tutorName=${encodeURIComponent(b.tutorName)}&subject=${encodeURIComponent(b.subject||'')}&lessonType=${encodeURIComponent(b.lessonType||'')}&startTime=${encodeURIComponent(b.startTime)}`;
    const lbl = spTimeLabel(b.startTime);
    const isLive = lbl === '🔴 Live';
    const joinBtn = b.meetLink
      ? `<button onclick="spJoinLesson('${b.meetLink}')" style="padding:6px 13px;background:${isLive?'#2D7A4F':'#0D1B2A'};color:#fff;border:none;border-radius:7px;font-size:.71rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">${isLive?'🔴 Join':'Join lesson'}</button>`
      : '';
    return `<div class="cal-ev">
      <div class="cal-ev-stripe" style="background:${COLOURS[b.lessonType]||'#C8A15A'}"></div>
      <div class="cal-ev-info">
        <div class="cal-ev-subj">${b.subject} — ${TYPE_LBL[b.lessonType]||b.lessonType}${spPayBadge(b)}</div>
        <div class="cal-ev-meta">${spFmt(b.startTime)} · ${b.tutorName} · 55 min${b.meetLink?' · <a href="'+b.meetLink+'" target="_blank" style="color:#4A90D9;text-decoration:none">Meeting link ↗</a>':''}</div>
      </div>
      <div style="display:flex;gap:7px">${joinBtn}
        <a href="${icsUrl}" style="padding:6px 11px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.71rem;font-weight:600;color:#0D1B2A;cursor:pointer;background:#fff;font-family:Inter,sans-serif;text-decoration:none">+ iCal</a>
      </div>
    </div>`;
  }).join('');
}

function spRenderCalendar() {
  const listEl = document.getElementById('cal-ev-list');
  if (!listEl) return;
  const COLOURS = {gcse:'#C8A15A',alevel:'#7B5EA7',group:'#4A90D9',trial:'#2D7A4F'};
  const TYPE_LBL = {gcse:'GCSE 1:1',alevel:'A-Level 1:1',group:'Group',trial:'Free trial',consultation:'Initial Consultation'};
  const upcoming = spBookings
    .filter(b => new Date(b.startTime) > Date.now() - 86400000)
    .sort((a,b) => new Date(a.startTime)-new Date(b.startTime))
    .slice(0,8);
  if (!upcoming.length) {
    listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#A7A7A7;font-size:.82rem">No upcoming lessons.</div>';
    return;
  }
  listEl.innerHTML = upcoming.map(b => {
    const icsUrl = `${SP_BACKEND}/api/bookings?action=ics&tutorName=${encodeURIComponent(b.tutorName)}&subject=${encodeURIComponent(b.subject||'')}&lessonType=${encodeURIComponent(b.lessonType||'')}&startTime=${encodeURIComponent(b.startTime)}`;
    const lbl = spTimeLabel(b.startTime);
    const isLive = lbl === '🔴 Live';
    const joinBtn = b.meetLink
      ? `<button onclick="spJoinLesson('${b.meetLink}')" style="padding:6px 13px;background:${isLive?'#2D7A4F':'#0D1B2A'};color:#fff;border:none;border-radius:7px;font-size:.71rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">${isLive?'🔴 Join':'Join'}</button>`
      : '';
    return `<div class="cal-ev">
    <div class="cal-ev-stripe" style="background:${COLOURS[b.lessonType]||'#C8A15A'}"></div>
    <div class="cal-ev-info">
      <div class="cal-ev-subj">${b.subject} — ${TYPE_LBL[b.lessonType]||b.lessonType}${spPayBadge(b)}</div>
      <div class="cal-ev-meta">${spFmt(b.startTime)} · ${b.tutorName}${b.meetLink?' · <a href="'+b.meetLink+'" target="_blank" style="color:#4A90D9;text-decoration:none">Meeting link ↗</a>':''}</div>
    </div>
    <div style="display:flex;gap:7px">${joinBtn}
      <a href="${icsUrl}" style="padding:6px 11px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.71rem;font-weight:600;color:#0D1B2A;cursor:pointer;background:#fff;font-family:Inter,sans-serif;text-decoration:none">+ iCal</a>
    </div>
  </div>`;
  }).join('');
}

// ── IN-PORTAL BOOKING (for logged-in students) ───────────────────────────
// Real availability via the same Cal.com embed pattern as the public
// booking wizard — previously this was a raw datetime-local input the
// student could set to anything, with zero connection to the tutor's
// actual schedule (a conflict only surfaced as a 409 after submitting).
let _spBookStartTimeISO = null;
let _spBookCalLoadedFor = null;

function spOpenInPortalBooking() {
  document.getElementById('sp-book-error').style.display = 'none';
  document.getElementById('sp-book-success').style.display = 'none';
  document.getElementById('sp-book-btn').disabled = false;
  document.getElementById('sp-book-btn').textContent = 'Request lesson →';
  // Pre-fill subject from their existing bookings
  const subjects = [...new Set(spBookings.map(b=>b.subject).filter(Boolean))];
  if (subjects.length) document.getElementById('sp-book-subject').value = subjects[0];
  _spBookStartTimeISO = null;
  _spBookCalLoadedFor = null;
  document.getElementById('sp-book-time-chosen').style.display = 'none';

  // SCRUM-69: offer a free trial lesson only when eligible — had their
  // Initial Consultation, and don't already have one (the DB enforces at
  // most one non-cancelled trial per student via
  // bookings_one_trial_per_student; spBookings already excludes cancelled
  // rows, see spLoadData).
  const typeSel = document.getElementById('sp-book-type');
  const existingTrialOpt = typeSel.querySelector('option[value="trial"]');
  const eligibleForTrial = spBookings.some(b => b.lessonType === 'consultation')
    && !spBookings.some(b => b.lessonType === 'trial');
  if (eligibleForTrial && !existingTrialOpt) {
    const opt = document.createElement('option');
    opt.value = 'trial';
    opt.textContent = 'Free trial lesson';
    typeSel.insertBefore(opt, typeSel.firstChild);
  } else if (!eligibleForTrial && existingTrialOpt) {
    existingTrialOpt.remove();
  }

  // SCRUM-87: a student who hasn't had their Initial Consultation yet had
  // no way to get one from inside the portal at all — and since the free
  // trial above only unlocks *after* a consultation, they were stuck with
  // nothing but paid lesson types. Offer it, first and selected by default.
  const existingConsultOpt = typeSel.querySelector('option[value="consultation"]');
  const needsConsultation = !spBookings.some(b => b.lessonType === 'consultation');
  if (needsConsultation && !existingConsultOpt) {
    const opt = document.createElement('option');
    opt.value = 'consultation';
    opt.textContent = 'Free initial consultation (15 min)';
    typeSel.insertBefore(opt, typeSel.firstChild);
    typeSel.value = 'consultation';
  } else if (!needsConsultation && existingConsultOpt) {
    existingConsultOpt.remove();
  }
  spSyncBookCopy();

  document.getElementById('sp-book-modal').classList.add('open');
  spLoadBookCal();
}

// SCRUM-87: the modal's fixed "billed on your next cycle" copy and "Book
// lesson" button are wrong for the two free session types — nothing is
// billed, and the tutor still has to accept. Swap both to match.
function spSyncBookCopy() {
  const type = document.getElementById('sp-book-type').value;
  const isFree = type === 'consultation' || type === 'trial';
  const note = document.getElementById('sp-book-note');
  const btn = document.getElementById('sp-book-btn');
  if (note) {
    note.innerHTML = isFree
      ? '🌱 Completely free — no payment now or later. Your tutor confirms the time, and you\'ll see it in your calendar straight away as pending.'
      : '💳 No payment needed now — this lesson will be included in your next billing cycle (see Payments in your portal).';
  }
  if (btn && !btn.disabled) btn.textContent = isFree ? 'Request this time →' : 'Book lesson →';
}

async function spLoadBookCal() {
  const tutorName = document.getElementById('sp-book-tutor').value;
  const lessonType = document.getElementById('sp-book-type').value;
  const statusEl = document.getElementById('sp-book-cal-status');
  const wrapEl = document.getElementById('sp-book-cal-wrap');
  const embedEl = document.getElementById('sp-book-cal-embed');
  const cacheKey = tutorName + '|' + lessonType;
  if (_spBookCalLoadedFor === cacheKey) return;
  _spBookStartTimeISO = null;
  document.getElementById('sp-book-time-chosen').style.display = 'none';
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading ' + tutorName + "'s availability…";
  wrapEl.style.display = 'none';
  embedEl.src = 'about:blank';
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/bookings?action=scheduling-link&tutorName=${encodeURIComponent(tutorName)}&lessonType=${encodeURIComponent(lessonType)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Could not load availability');
    _spBookCalLoadedFor = cacheKey;
    statusEl.style.display = 'none';
    wrapEl.style.display = 'block';
    embedEl.src = data.url + (data.url.includes('?') ? '&' : '?') + 'embed=true';
  } catch(e) {
    statusEl.textContent = e.message || "We couldn't load real-time availability for this tutor. Please email hello@seedsinstitute.co.uk to arrange a time.";
  }
}

// Handles this modal's share of the page-wide Cal.com bookingSuccessful
// postMessage — only acts when this modal is the one actually open.
window.addEventListener('message', async (e) => {
  const booking = calParseBookingSuccess(e.data);
  if (!booking) return;
  const modalOpen = document.getElementById('sp-book-modal')?.classList.contains('open');
  if (!modalOpen) return;

  const statusEl = document.getElementById('sp-book-cal-status');
  const chosenEl = document.getElementById('sp-book-time-chosen');
  document.getElementById('sp-book-cal-wrap').style.display = 'none';
  _spBookStartTimeISO = booking.startTime;
  const d = new Date(booking.startTime);
  statusEl.style.display = 'none';
  chosenEl.style.display = 'block';
  chosenEl.textContent = '✓ ' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
});

async function spSubmitBooking$base() {
  const btn = document.getElementById('sp-book-btn');
  const errEl = document.getElementById('sp-book-error');
  const tutorName = document.getElementById('sp-book-tutor').value;
  const subject = document.getElementById('sp-book-subject').value.trim();
  const lessonType = document.getElementById('sp-book-type').value;
  if (!subject) { errEl.textContent='Please enter a subject'; errEl.style.display='block'; return; }
  if (!_spBookStartTimeISO) { errEl.textContent='Please pick a time in the calendar above'; errEl.style.display='block'; return; }
  const startTime = _spBookStartTimeISO;
  btn.disabled = true; btn.textContent = 'Requesting…'; errEl.style.display = 'none';
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    const studentEmail = session?.user?.email || '';
    const { data: profile } = await sbClient.from('profiles').select('full_name').eq('id', session.user.id).single();
    const studentName = profile?.full_name || studentEmail;

    // No studentId sent here — the backend resolves (and self-heals, if this
    // is this family's first-ever lesson) the caller's own student record
    // from their verified session, rather than trusting a client-supplied id.
    const _spLessonAuthH = await seedsAuthHeaders();
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=lessons`, {
      method: 'POST', headers: _spLessonAuthH,
      body: JSON.stringify({
        studentName, tutorName, subject,
        lessonType, startTime: new Date(startTime).toISOString(), recurringWeeks: 1,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      if (r.status === 409) throw new Error(data.error + ' Please choose a different time.');
      throw new Error(data.error);
    }

    // No per-lesson charge here — the lesson is billed automatically on
    // the family's next billing date (see Payments settings), together
    // with every other lesson completed since the last bill. Booking
    // just books; nothing to pay right now.
    // SCRUM-87: free sessions land as 'requested' — say what actually
    // happens next rather than claiming it's booked.
    const successMsg = (lessonType === 'consultation' || lessonType === 'trial')
      ? '✓ Requested! It\'s in your calendar now — your tutor will confirm shortly.'
      : '✓ Lesson booked! It\'ll be included in your next billing cycle.';
    document.getElementById('sp-book-success').textContent = successMsg;
    document.getElementById('sp-book-success').style.display = 'block';
    btn.textContent = 'Done ✓';
    setTimeout(() => {
      document.getElementById('sp-book-modal').classList.remove('open');
      spLoadData(); // refresh calendar
    }, 2500);
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Request lesson →';
  }
}
const _origSPOpen = window._openStudentPortal;
window._openStudentPortal = function() {
  _origSPOpen();
  spLoadData();
};
const _origSPPanel = window.showPortalPanel;
window.showPortalPanel = function(id, navEl) {
  _origSPPanel(id, navEl);
  if (id === 'p-home' || id === 'p-cal') spLoadData();
  if (id === 'p-cal') { calViewDate = new Date(); calRender(); }
  if (id === 'p-progress' || id === 'p-hw') {
    sbClient.auth.getSession().then(({ data: { session } }) => {
      if (session) spLoadLifecycle(session.user.email);
    });
  }
  if (id === 'p-payments') { spLoadPaymentHistory().then(spLoadSavedCards); spLoadBillingCycle(); }
  if (id === 'p-profile') { spRenderProfileView(); spLoadTutorContact(); }
};


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.SP_BACKEND = SP_BACKEND;
  Object.defineProperty(window, "spBookings", { get: () => spBookings, set: (v) => { spBookings = v; }, configurable: true });
  window.seedsAuthHeaders = seedsAuthHeaders;
  window.spLoadData = spLoadData;
  Object.defineProperty(window, "spStudentId", { get: () => spStudentId, set: (v) => { spStudentId = v; }, configurable: true });
  window.spLoadLifecycle = spLoadLifecycle;
  window.SP_PROG_COLOURS = SP_PROG_COLOURS;
  window.spRenderProgress = spRenderProgress;
  window.spRenderHomework = spRenderHomework;
  window.spToggleHomework = spToggleHomework;
  window.spCheckPendingPayments = spCheckPendingPayments;
  window.spCheckPendingSlots = spCheckPendingSlots;
  window.spRenderSlotPicker = spRenderSlotPicker;
  window.spSelectSlot = spSelectSlot;
  window.spFmt = spFmt;
  window.spTimeLabel = spTimeLabel;
  window.spTimeOfDay = spTimeOfDay;
  window.spJoinLesson = spJoinLesson;
  window.SP_PAY_BADGE = SP_PAY_BADGE;
  window.spPayBadge = spPayBadge;
  window.spRenderHome = spRenderHome$base;
  window.spPendingBadge = spPendingBadge;
  Object.defineProperty(window, "calViewDate", { get: () => calViewDate, set: (v) => { calViewDate = v; }, configurable: true });
  window.calNav = calNav;
  window.calRender = calRender;
  window.calShowDay = calShowDay;
  window.spRenderCalendar = spRenderCalendar;
  Object.defineProperty(window, "_spBookStartTimeISO", { get: () => _spBookStartTimeISO, set: (v) => { _spBookStartTimeISO = v; }, configurable: true });
  Object.defineProperty(window, "_spBookCalLoadedFor", { get: () => _spBookCalLoadedFor, set: (v) => { _spBookCalLoadedFor = v; }, configurable: true });
  window.spOpenInPortalBooking = spOpenInPortalBooking;
  window.spSyncBookCopy = spSyncBookCopy;
  window.spLoadBookCal = spLoadBookCal;
  window.spSubmitBooking = spSubmitBooking$base;
  window._origSPOpen = _origSPOpen;
  window._origSPPanel = _origSPPanel;
}
