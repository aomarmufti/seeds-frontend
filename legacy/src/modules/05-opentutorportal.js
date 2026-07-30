// Extracted from index.html by the SCRUM-32 migration (block 5).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// NOTE (SCRUM-32): _openTutorPortal(), showTpPanel(), earnRenderAll() are declared here but replaced later by
// another module assigning to window. Under the old shared global scope that
// replacement applied to this block's own calls too; as a module, a local
// declaration would shadow it. Declared as ...$base and published to window so
// every reference, here included, still resolves to the current override.

function _openTutorPortal$base(){
  document.getElementById('tp-overlay').classList.add('tp-open');
  document.body.style.overflow='hidden';
}
function closeTutorPortal(){
  document.getElementById('tp-overlay').classList.remove('tp-open');
  document.body.style.overflow='';
  routeClear();
}
function showTpPanel$base(id, navEl){
  document.querySelectorAll('.tp-panel').forEach(p=>p.classList.remove('tp-active'));
  document.getElementById(id).classList.add('tp-active');
  document.querySelectorAll('.tp-nav-item').forEach(n=>n.classList.remove('tp-active-nav'));
  if(navEl) navEl.classList.add('tp-active-nav');
  closeStudentDetail();
  routeSet('tutor', id);
}
// SCRUM-83: replaces the old switchTutor(). Identity is set once from the
// authenticated session and is not selectable — see the sidebar comment.
function tpSetIdentity(name, email, avatarKey){
  const initials = (name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const h = new Date().getHours();
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const firstName = (name || '').split(' ')[0] || name || '';
  document.getElementById('tp-greeting-name').textContent = 'Good ' + tod + ', ' + firstName;
  document.getElementById('tp-topbar-av').textContent = initials;
  document.getElementById('tp-identity-name').textContent = name || '—';
  document.getElementById('tp-identity-email').textContent = email || '';
  // Only the three original tutors have a photo asset; everyone else gets
  // their initials rather than a broken image.
  const av = document.getElementById('tp-identity-av');
  if (av) {
    av.innerHTML = avatarKey
      ? `<img src="images/${avatarKey}.jpg" loading="lazy" decoding="async" alt="">`
      : '';
    if (!avatarKey) {
      av.textContent = initials;
      av.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#fff;background:rgba(255,255,255,.15)';
    }
  }
}
let _tpCurrentStudent = null; // {id, name, subject}

async function tpRenderStudentsList() {
  const tbody = document.getElementById('tp-students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#A7A7A7;padding:20px">Loading students…</td></tr>';
  try {
    // Get this tutor's bookings to derive their student list
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/analytics?resource=students`, { headers: await seedsAuthHeaders() });
    const students = await r.json();
    const mine = students.filter(tpIsMyStudent);
    if (!mine.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#A7A7A7;padding:20px">No students yet.</td></tr>';
      return;
    }
    tbody.innerHTML = mine.map(s => {
      const initials = s.student_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const myBookings = (s.bookings||[]).filter(b => b.tutor_name === earnCurrentTutor);
      const subject = myBookings[0] ? (myBookings[0].subject || '—') : '—';
      const lessonCount = myBookings.length;
      const escName = s.student_name.replace(/'/g, "\\'");
      return `<tr onclick="tpOpenStudent('${s.id}','${escName}','${initials}')" style="cursor:pointer">
        <td><div style="display:flex;align-items:center;gap:9px"><div class="tp-mini-av">${initials}</div>${s.student_name}</div></td>
        <td>${subject}</td>
        <td>${myBookings.some(b=>b.lesson_type==='trial')?'Trial':'Weekly'}</td>
        <td>${lessonCount}</td>
        <td><button class="tp-btn-xs tp-btn-ghost">Open</button></td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#c0392b;padding:20px">Failed: ${e.message}</td></tr>`;
  }
}

function tpOpenStudent(studentId, name, initials) {
  _tpCurrentStudent = { id: studentId, name };
  document.getElementById('tp-students-list').style.display = 'none';
  document.getElementById('tp-student-detail').classList.add('tp-detail-active');
  document.getElementById('tp-detail-name').textContent = name;
  document.getElementById('tp-detail-av').textContent = initials;
  document.getElementById('tp-detail-sub').textContent = 'Loading…';
  tpLoadStudentLifecycle(studentId);
  tpLoadStudentContact(studentId);
}

// SCRUM-55: contact card for this student's parent — email always,
// WhatsApp only if the parent has opted in.
async function tpLoadStudentContact(studentId) {
  const el = document.getElementById('tp-detail-contact');
  if (!el) return;
  el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem">Loading…</div>';
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=contact-info&for=parent&studentId=${studentId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to load contact info');
    const waLink = data.whatsappNumber
      ? `<a href="https://wa.me/${data.whatsappNumber.replace(/[^\d]/g,'')}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:.78rem;font-weight:600;margin-left:8px">💬 WhatsApp</a>`
      : '';
    el.innerHTML = data.email
      ? `<a href="mailto:${escapeHtml(data.email)}" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:.78rem;font-weight:600;color:#0D1B2A;text-decoration:none">✉ Email</a>${waLink}`
      : '<div style="color:#A7A7A7;font-size:.82rem">Parent contact info not available.</div>';
  } catch(e) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem">Couldn\'t load parent contact info.</div>';
  }
}

function closeStudentDetail() {
  document.getElementById('tp-students-list').style.display = 'block';
  document.getElementById('tp-student-detail').classList.remove('tp-detail-active');
  _tpCurrentStudent = null;
}

async function tpLoadStudentLifecycle(studentId) {
  // Load notes, homework, progress in parallel
  try {
    const _tpAuthH = await seedsAuthHeaders();
    const [notesR, hwR, progR] = await Promise.all([
      fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=notes&studentId=${studentId}`, { headers: _tpAuthH }),
      fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=homework&studentId=${studentId}`, { headers: _tpAuthH }),
      fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=progress&studentId=${studentId}`, { headers: _tpAuthH }),
    ]);
    const notes = await notesR.json();
    const homework = await hwR.json();
    const progress = await progR.json();

    // Subtitle from first progress subject
    const sub = document.getElementById('tp-detail-sub');
    if (sub) sub.textContent = progress.length ? progress.map(p=>p.subject).join(', ') : 'No subjects tracked yet';

    tpRenderProgress(progress);
    tpRenderHomework(homework);
    tpRenderNotes(notes);
  } catch(e) { console.error('lifecycle load:', e.message); }
}

function tpRenderProgress(progress) {
  const el = document.getElementById('tp-detail-progress');
  if (!el) return;
  if (!progress.length) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem">No progress recorded yet. Add one below.</div>';
    return;
  }
  el.innerHTML = progress.map(p => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-weight:600;color:#0D1B2A;font-size:.85rem">${escapeHtml(p.subject)}</span>
        <span style="font-size:.8rem;color:#718096">${escapeHtml(p.current_grade)||'—'} → ${escapeHtml(p.target_grade)||'—'} · ${p.percent}%</span>
      </div>
      <div style="height:7px;background:#F0EDE8;border-radius:4px;overflow:hidden"><div style="height:100%;width:${p.percent}%;background:var(--gold)"></div></div>
      ${p.note ? `<div style="font-size:.76rem;color:#A7A7A7;margin-top:4px">${escapeHtml(p.note)}</div>` : ''}
    </div>`).join('');
}

function tpRenderHomework(homework) {
  const el = document.getElementById('tp-detail-homework');
  if (!el) return;
  if (!homework.length) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem">No homework assigned yet.</div>';
    return;
  }
  el.innerHTML = homework.map(h => {
    const due = h.due_date ? new Date(h.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'No due date';
    const status = h.completed
      ? '<span style="font-size:.72rem;color:#2D7A4F;font-weight:700">✓ Completed</span>'
      : `<span style="font-size:.72rem;color:#C8A15A;font-weight:700">Due ${due}</span>`;
    return `<div style="padding:10px 0;border-bottom:1px solid #F0EDE8">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="font-weight:600;color:#0D1B2A;font-size:.85rem">${h.title}</div>
        ${status}
      </div>
      ${h.description ? `<div style="font-size:.78rem;color:#718096;margin-top:2px">${h.description}</div>` : ''}
    </div>`;
  }).join('');
}

function tpRenderNotes(notes) {
  const el = document.getElementById('tp-detail-notes');
  if (!el) return;
  if (!notes.length) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem">No notes yet.</div>';
    return;
  }
  el.innerHTML = notes.map(n => {
    const d = new Date(n.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    return `<div class="tp-note-item"><div class="tp-note-date">${d}</div><div class="tp-note-body">${n.note}</div></div>`;
  }).join('');
}

async function tpSaveNote() {
  if (!_tpCurrentStudent) return;
  const textarea = document.getElementById('tp-note-input');
  const val = textarea.value.trim();
  if (!val) return;
  try {
    await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=notes`, {
      method:'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ studentId:_tpCurrentStudent.id, tutorName:earnCurrentTutor, note:val }),
    });
    textarea.value = '';
    tpLoadStudentLifecycle(_tpCurrentStudent.id);
  } catch(e) { alert('Failed to save note: '+e.message); }
}

async function tpAssignHomework() {
  if (!_tpCurrentStudent) return;
  const title = document.getElementById('tp-hw-title').value.trim();
  if (!title) { alert('Enter a homework title'); return; }
  const desc = document.getElementById('tp-hw-desc').value.trim();
  const due = document.getElementById('tp-hw-due').value;
  try {
    await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=homework`, {
      method:'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ studentId:_tpCurrentStudent.id, tutorName:earnCurrentTutor, title, description:desc, dueDate:due||null }),
    });
    document.getElementById('tp-hw-title').value = '';
    document.getElementById('tp-hw-desc').value = '';
    document.getElementById('tp-hw-due').value = '';
    tpLoadStudentLifecycle(_tpCurrentStudent.id);
  } catch(e) { alert('Failed: '+e.message); }
}

async function tpSaveProgress() {
  if (!_tpCurrentStudent) return;
  const subject = document.getElementById('tp-prog-subject').value.trim();
  const percent = parseInt(document.getElementById('tp-prog-percent').value);
  const target = document.getElementById('tp-prog-target').value.trim();
  if (!subject || isNaN(percent)) { alert('Enter subject and percent'); return; }
  try {
    await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=progress`, {
      method:'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ studentId:_tpCurrentStudent.id, subject, percent, targetGrade:target||null }),
    });
    document.getElementById('tp-prog-subject').value = '';
    document.getElementById('tp-prog-percent').value = '';
    document.getElementById('tp-prog-target').value = '';
    tpLoadStudentLifecycle(_tpCurrentStudent.id);
  } catch(e) { alert('Failed: '+e.message); }
}

// ── EARNINGS DATA ────────────────────────────────────────────────────────
// In a real system this comes from your database.
// Format: { date:'YYYY-MM-DD', student, type:'gcse'|'alevel'|'group'|'trial', fee, paid:bool }
const TUTOR_CUT = 0.78;
const LABEL = {gcse:'GCSE 1:1',alevel:'A-Level 1:1',group:'Group session',trial:'Free trial',consultation:'Initial Consultation'};
let EARN_LESSONS = []; // populated from API
let earnCurrentTutor = null; // set when tutor logs in

// Whose students are mine. This used to be "anyone I have a booking with",
// which meant a student admin had explicitly assigned to me was invisible in
// my portal until they'd actually booked something — exactly backwards, since
// the whole point of the assignment is that I'm meant to reach out to them.
// assignedTutor (students.assigned_tutor) is the real link; bookings are kept
// as a fallback so historic students assigned before that column existed, or
// booked with me without a formal assignment, don't disappear.
function tpIsMyStudent(s) {
  if (!earnCurrentTutor) return false;
  if (s.assigned_tutor === earnCurrentTutor) return true;
  return (s.bookings || []).some(b => b.tutor_name === earnCurrentTutor);
}

function earnCut(fee){ return Math.round(fee * TUTOR_CUT); }
function earnFmt(p){ return '£'+(p/100).toFixed(2); }
function earnDateFmt(d){ return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }

async function earnLoadData() {
  try {
    const tutor = earnCurrentTutor || 'Azeem Omar-Mufti';

    // Previously called the admin-only default /api/analytics with no auth
    // at all — always 401'd for a real tutor, so this whole panel was
    // silently empty (masked by earnLoadFullHistory's delayed correction
    // 1s later, via a separately-fixed endpoint). Uses the tutor-scoped,
    // authenticated resource directly now — no flash of empty data, and
    // no dependency on an endpoint a real tutor can never call.
    const [analyticsR, payoutsR] = await Promise.all([
      fetchWithTimeout(`${BACKEND}/api/analytics?resource=my-tutor-bookings`, { headers: await seedsAuthHeaders() }),
      fetchWithTimeout(`${BACKEND}/api/payouts?tutor=${encodeURIComponent(tutor)}`, { headers: await seedsAuthHeaders() }),
    ]);
    const data = await analyticsR.json();
    const payoutHistory = await payoutsR.json();

    const tutorBookings = (data.recentBookings || []).filter(b => b.status !== 'cancelled');

    // Build ledger rows — include payout info
    const paidPayouts = Array.isArray(payoutHistory) ? payoutHistory.filter(p => p.status === 'paid') : [];
    const lastPaidAt = paidPayouts.length ? new Date(paidPayouts[0].paid_at) : null;

    EARN_LESSONS = tutorBookings.map(b => ({
      date: b.startTime.slice(0, 10),
      startTime: b.startTime,
      student: b.studentName,
      type: b.lessonType,
      fee: b.feePence,
      // Here "paid" means the TUTOR has been paid out (status flips to
      // 'completed' when a payout is approved — see payouts.js
      // approve-and-transfer), not whether the student's payment
      // succeeded — that's tracked separately via paymentIntentId below,
      // which earnRenderLedger uses for its own "awaiting payout" state.
      paid: b.status === 'completed',
      status: b.status,
      paymentStatus: b.paymentStatus,
      paymentIntentId: b.paymentIntentId,
    }));

    // Store payout history for display
    window._earnPayoutHistory = paidPayouts;
    earnRenderAll();
  } catch(e) {
    console.error('earnLoadData failed:', e.message);
    earnRenderAll();
  }
}

function earnRenderAll$base(){
  earnUpdateKPIs();
  earnRenderChart();
  earnRenderLedger();
  if (typeof earnRenderForecast === 'function') earnRenderForecast();
}

function earnUpdateKPIs(){
  const summary = window._earnTutorSummary;
  const unpaid = summary ? summary.unpaid : EARN_LESSONS.filter(l=>!l.paid&&l.fee>0).reduce((s,l)=>s+earnCut(l.fee),0);
  const totalEarned = summary ? Math.round(summary.revenue * TUTOR_CUT) : EARN_LESSONS.filter(l=>l.fee>0).reduce((s,l)=>s+earnCut(l.fee),0);

  // Paid this month — lessons completed this calendar month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = EARN_LESSONS
    .filter(l => l.fee>0 && l.paid && new Date(l.date) >= thisMonthStart)
    .reduce((s,l) => s+earnCut(l.fee), 0);

  document.getElementById('earn-unpaid').textContent = (unpaid/100).toFixed(2);
  const paidMonthEl = document.getElementById('earn-paid-month');
  const totalEl = document.getElementById('earn-total');
  if (paidMonthEl) paidMonthEl.textContent = (paidThisMonth/100).toLocaleString('en-GB',{minimumFractionDigits:2});
  if (totalEl) totalEl.textContent = (totalEarned/100).toLocaleString('en-GB',{minimumFractionDigits:2});

  earnCheckConnect();
}

async function earnCheckConnect() {
  const el = document.getElementById('earn-connect-status');
  if (!el || !earnCurrentTutor) return;
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/payouts?resource=connect-status&tutor=${encodeURIComponent(earnCurrentTutor)}`, {
      headers: await seedsAuthHeaders(),
    });
    const s = await r.json();
    const cycleEl = document.getElementById('earn-payout-cycle');
    if (cycleEl) cycleEl.textContent = (s.payoutCycle === 'monthly' ? 'Monthly' : 'Weekly') + ', automatic';
    if (s.onboardingComplete) {
      el.innerHTML = '<span style="color:#2D7A4F">✓ Payouts enabled</span><div style="font-size:.72rem;color:#718096;margin-top:2px">Bank account connected via Stripe</div>';
    } else if (s.connected) {
      el.innerHTML = '<button onclick="earnStartConnect(this)" style="padding:8px 14px;background:#C8A15A;color:#fff;border:none;border-radius:9px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">Finish payout setup →</button><div style="font-size:.72rem;color:#718096;margin-top:4px">Setup incomplete</div>';
    } else {
      el.innerHTML = '<button onclick="earnStartConnect(this)" style="padding:8px 14px;background:#0D1B2A;color:#fff;border:none;border-radius:9px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">Set up payouts →</button><div style="font-size:.72rem;color:#718096;margin-top:4px">Connect your bank to get paid</div>';
    }
  } catch(e) {
    el.innerHTML = '<span style="color:#A7A7A7">Unable to check status</span>';
  }
}

async function earnStartConnect(btn) {
  btn.disabled = true; btn.textContent = 'Opening…';
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/payouts`, {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({
        action: 'create-connect-account',
        tutorName: earnCurrentTutor,
        returnOrigin: window.location.origin,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    // Redirect to Stripe onboarding
    window.location.href = data.url;
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Set up payouts →';
    alert('Could not start setup: ' + e.message);
  }
}

function earnRenderChart(){
  const yr = parseInt(document.getElementById('earn-year-sel').value);
  // Aggregate by month
  const months = Array.from({length:12},(_,i)=>({label:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],total:0}));
  EARN_LESSONS.forEach(l=>{
    const d = new Date(l.date);
    if(d.getFullYear()===yr && l.fee>0) months[d.getMonth()].total += earnCut(l.fee);
  });
  const max = Math.max(...months.map(m=>m.total), 1);
  const now = new Date();
  const container = document.getElementById('earn-month-chart');
  container.innerHTML = months.map((m,i)=>{
    const pct = Math.round((m.total/max)*100);
    const isCurrent = yr===now.getFullYear() && i===now.getMonth();
    const colour = isCurrent ? 'var(--gold)' : (m.total>0 ? '#0D1B2A' : '#E8E8E8');
    const tip = m.total>0 ? earnFmt(m.total) : '—';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:default;height:100%" title="${m.label}: ${tip}">
      <div style="flex:1;width:100%;display:flex;align-items:flex-end">
        <div style="width:100%;height:${Math.max(pct,2)}%;background:${colour};border-radius:3px 3px 0 0;min-height:3px;transition:height .4s"></div>
      </div>
      <div style="font-size:.62rem;color:#A7A7A7;font-family:Inter,sans-serif;white-space:nowrap">${m.label}</div>
    </div>`;
  }).join('');
}

function earnRenderLedger(){
  const filter = document.getElementById('earn-filter-sel').value;
  const now = new Date();
  const lessons = EARN_LESSONS.filter(l=>{
    const d = new Date(l.date);
    if(filter==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if(filter==='quarter') return d>=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1);
    return true;
  });
  const tbody = document.getElementById('earn-ledger-body');
  if(!lessons.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#A7A7A7;font-size:.82rem;padding:18px">No lessons in this period</td></tr>';
    document.getElementById('earn-ledger-total').textContent='';
    return;
  }
  let pendingTotal = 0;
  let paidTotal = 0;
  tbody.innerHTML = lessons.map(l=>{
    const cut = earnCut(l.fee);
    if (l.paid) paidTotal += cut; else if (l.fee > 0) pendingTotal += cut;
    // Two independent facts, not one: has the FAMILY paid (payment_status,
    // now billed periodically rather than per-lesson) vs has the TUTOR
    // been paid out (l.paid, status='completed'). A lesson can be
    // confirmed and happening long before either is true.
    const studentPaid = l.paymentStatus === 'paid';
    const status = l.fee===0
      ? `<span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#F5F0E8;color:#718096;font-weight:600">Trial</span>`
      : l.paid
        ? `<span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#2D7A4F18;color:#2D7A4F;font-weight:600">✓ Paid out</span>`
        : studentPaid
          ? `<span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#C8A15A18;color:#C8A15A;font-weight:600">Awaiting payout</span>`
          : l.paymentStatus === 'failed'
            ? `<span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#c0392b18;color:#c0392b;font-weight:600">Payment failed</span>`
            : l.paymentStatus === 'invoiced'
              ? `<span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#4A90D918;color:#4A90D9;font-weight:600">Billed — awaiting payment</span>`
              : `<span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#4A90D918;color:#4A90D9;font-weight:600">Not yet billed</span>`;
    return `<tr>
      <td>${l.student}</td>
      <td>${LABEL[l.type]||l.type}</td>
      <td style="color:#718096">${l.fee?earnFmt(l.fee):'—'}</td>
      <td style="font-weight:700;color:#0D1B2A">${cut?earnFmt(cut):'—'}</td>
      <td>${status}</td>
      <td style="color:#718096">${earnDateFmt(l.date)}</td>
    </tr>`;
  }).join('');
  const payouts = window._earnPayoutHistory || [];
  let payoutHTML = '';
  if (payouts.length) {
    payoutHTML = `<div style="margin-top:18px;border-top:2px solid #E8E8E8;padding-top:14px">
      <div style="font-size:.72rem;font-weight:700;color:#A7A7A7;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Payout history</div>
      ${payouts.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F5F0E8">
        <div>
          <div style="font-size:.83rem;font-weight:600;color:#0D1B2A">${earnFmt(p.amount_pence)} paid out</div>
          <div style="font-size:.72rem;color:#718096">${p.paid_at?new Date(p.paid_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'—'}${p.stripe_transfer_id?' · '+p.stripe_transfer_id:''}</div>
        </div>
        <span style="font-size:.72rem;padding:3px 9px;border-radius:20px;background:#2D7A4F18;color:#2D7A4F;font-weight:600">✓ ${p.transfer_status==='paid'?'Stripe transfer':'Manual'}</span>
      </div>`).join('')}
    </div>`;
  }
  document.getElementById('earn-ledger-total').innerHTML =
    `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px">
      <span>Awaiting payout: <strong style="color:#C8A15A">${earnFmt(pendingTotal)}</strong></span>
      <span>Already paid out: <strong style="color:#2D7A4F">${earnFmt(paidTotal)}</strong></span>
    </div>${payoutHTML}`;
}

// Init earnings when the panel is opened
const _origShowTpPanel = window.showTpPanel;
window.showTpPanel = function(id, navEl){
  _origShowTpPanel(id, navEl);
  if(id==='tp-earnings') earnLoadData();
};


// ── global bridge (generated) ──────────────────────────────────────────
{
  window._openTutorPortal = _openTutorPortal$base;
  window.closeTutorPortal = closeTutorPortal;
  window.showTpPanel = showTpPanel$base;
  window.tpSetIdentity = tpSetIdentity;
  Object.defineProperty(window, "_tpCurrentStudent", { get: () => _tpCurrentStudent, set: (v) => { _tpCurrentStudent = v; }, configurable: true });
  window.tpRenderStudentsList = tpRenderStudentsList;
  window.tpOpenStudent = tpOpenStudent;
  window.tpLoadStudentContact = tpLoadStudentContact;
  window.closeStudentDetail = closeStudentDetail;
  window.tpLoadStudentLifecycle = tpLoadStudentLifecycle;
  window.tpRenderProgress = tpRenderProgress;
  window.tpRenderHomework = tpRenderHomework;
  window.tpRenderNotes = tpRenderNotes;
  window.tpSaveNote = tpSaveNote;
  window.tpAssignHomework = tpAssignHomework;
  window.tpSaveProgress = tpSaveProgress;
  window.TUTOR_CUT = TUTOR_CUT;
  window.LABEL = LABEL;
  Object.defineProperty(window, "EARN_LESSONS", { get: () => EARN_LESSONS, set: (v) => { EARN_LESSONS = v; }, configurable: true });
  Object.defineProperty(window, "earnCurrentTutor", { get: () => earnCurrentTutor, set: (v) => { earnCurrentTutor = v; }, configurable: true });
  window.tpIsMyStudent = tpIsMyStudent;
  window.earnCut = earnCut;
  window.earnFmt = earnFmt;
  window.earnDateFmt = earnDateFmt;
  window.earnLoadData = earnLoadData;
  window.earnRenderAll = earnRenderAll$base;
  window.earnUpdateKPIs = earnUpdateKPIs;
  window.earnCheckConnect = earnCheckConnect;
  window.earnStartConnect = earnStartConnect;
  window.earnRenderChart = earnRenderChart;
  window.earnRenderLedger = earnRenderLedger;
  window._origShowTpPanel = _origShowTpPanel;
}
