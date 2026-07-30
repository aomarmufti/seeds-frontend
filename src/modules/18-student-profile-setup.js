// Extracted from index.html by the SCRUM-32 migration (block 18).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ STUDENT PROFILE SETUP ═════════════════════════════════════════════════
async function spSaveProfile() {
  const btn = document.getElementById('sp-profile-btn');
  const errEl = document.getElementById('sp-profile-error') || document.createElement('div');
  const year = document.getElementById('sp-profile-year').value;
  const targets = document.getElementById('sp-profile-targets').value.trim();
  const subjects = document.getElementById('sp-profile-subjects-input')?.value?.trim() || '';
  const currentGrade = document.getElementById('sp-profile-current')?.value?.trim() || '';
  const aimGrade = document.getElementById('sp-profile-aim')?.value?.trim() || '';
  const whatsappNumber = document.getElementById('sp-profile-whatsapp')?.value?.trim() || '';
  const whatsappOptedIn = document.getElementById('sp-profile-whatsapp-optin')?.checked || false;
  if (!year) {
    errEl.textContent = 'Please select your school year.';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const { data: { session }, error: sErr } = await sbClient.auth.getSession();
    if (sErr || !session) throw new Error('Not logged in — please refresh and try again.');
    const uid = session.user.id;
    // Parse "Maths: A*, Bio: A" → {Maths:'A*', Bio:'A'}
    const targetObj = {};
    targets.split(',').forEach(t => {
      const [sub, grade] = t.split(':');
      if (sub && grade) targetObj[sub.trim()] = grade.trim();
    });
    // Upsert so it works even if no profile row exists yet — role must be
    // included here since a fresh insert (no existing row) would otherwise
    // violate profiles.role's NOT NULL constraint. This modal only ever
    // shows in the student portal, so 'student' is always correct here.
    const { error } = await sbClient.from('profiles').upsert({
      id: uid,
      role: 'student',
      school_year: year,
      target_grades: targetObj,
      subjects: subjects || null,
      onboarding_complete: true,
      whatsapp_number: whatsappNumber || null,
      whatsapp_opted_in: whatsappOptedIn && !!whatsappNumber,
    }, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    // Mark done so modal never appears again on this device
    localStorage.setItem('sp_profile_done_' + uid, '1');
    document.getElementById('sp-profile-modal').classList.remove('open');
    seedsToast('✓ Profile saved', false);
    // Refresh student home to show updated profile
    if (typeof spLoadData === 'function') spLoadData();
  } catch(e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Save & continue →';
  }
}

// Closing without completing the form should still count as "seen" so it
// only ever prompts once per device, not on every login — previously this
// set an untracked, non-per-user localStorage key that nothing ever read,
// so dismissing had no lasting effect.
async function spDismissProfileModal() {
  document.getElementById('sp-profile-modal').classList.remove('open');
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session) localStorage.setItem('sp_profile_done_' + session.user.id, '1');
  } catch(e) {}
}

// SCRUM-24: Group Sessions recordings — descoped to a pasted link (Zoom
// cloud recording, Drive, etc.) rather than hosting video ourselves.
async function spLoadRecordings() {
  const grid = document.getElementById('sp-rec-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#A7A7A7">Loading…</div>';
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const sRes = await fetchWithTimeout(`${SP_BACKEND}/api/analytics?resource=students`, { headers: await seedsAuthHeaders() });
    const students = await sRes.json();
    const me = students.find(s => (s.parent_email||'').toLowerCase() === (session.user.email||'').toLowerCase());
    if (!me) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#A7A7A7">No student record found yet.</div>';
      return;
    }
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=materials&studentId=${me.id}&type=recording`, { headers: await seedsAuthHeaders() });
    const items = await r.json();
    if (!r.ok) throw new Error(items.error || 'Failed to load');
    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#A7A7A7">
        <div style="font-size:2rem;margin-bottom:10px">🎥</div>
        <div style="font-size:.9rem;font-weight:600;color:#718096;margin-bottom:4px">No recordings yet</div>
        <div style="font-size:.8rem">Recordings of your group past-paper sessions will appear here after each session.</div>
      </div>`;
      return;
    }
    grid.innerHTML = items.map(it => `
      <a href="${escapeHtml(it.url)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:inherit;border:1.5px solid #E8E8E8;border-radius:12px;padding:16px">
        <div style="font-size:1.5rem;margin-bottom:8px">🎥</div>
        <div style="font-weight:600;color:#0D1B2A;font-size:.88rem;margin-bottom:4px">${escapeHtml(it.title)}</div>
        <div style="font-size:.76rem;color:#718096">${it.subject ? escapeHtml(it.subject) : 'Group session'} · ${new Date(it.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
      </a>`).join('');
  } catch(e) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#c0392b">${escapeHtml(e.message)}</div>`;
  }
}

// Check if student needs profile setup (on portal open)
async function spCheckProfileSetup() {
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const uid = session.user.id;
    // Skip if already completed this browser session
    if (localStorage.getItem('sp_profile_done_' + uid)) return;
    const { data: profile } = await sbClient.from('profiles')
      .select('school_year, onboarding_complete')
      .eq('id', uid)
      .maybeSingle();
    // Show if no school year set and not marked complete
    if (!profile?.school_year && !profile?.onboarding_complete) {
      setTimeout(() => {
        document.getElementById('sp-profile-modal').classList.add('open');
      }, 1200);
    } else {
      // Already complete — mark in localStorage so we never check again
      localStorage.setItem('sp_profile_done_' + uid, '1');
    }
  } catch(e) { console.warn('spCheckProfileSetup:', e.message); }
}

// ══ TUTOR SELF-MANAGE LESSONS ════════════════════════════════════════════
let _tpSrBookingId = null;

function tpOpenSelfManage(bookingIdOrBtn, studentName, subject, startTime) {
  // Can be called with (btn, ...) or (bookingId, ...)
  let bookingId = bookingIdOrBtn;
  if (typeof bookingIdOrBtn === 'object' && bookingIdOrBtn.dataset) {
    bookingId = bookingIdOrBtn.dataset.bid;
    studentName = bookingIdOrBtn.dataset.sname;
    subject = bookingIdOrBtn.dataset.subj;
    startTime = bookingIdOrBtn.dataset.start;
  }
  _tpSrBookingId = bookingId;
  document.getElementById('tp-sr-title').textContent = 'Manage lesson';
  document.getElementById('tp-sr-desc').textContent = subject + ' with ' + studentName + ' · ' + tpFmt(startTime);
  document.getElementById('tp-sr-error').style.display = 'none';
  document.getElementById('tp-sr-reschedule-btn').disabled = false;
  document.getElementById('tp-sr-reschedule-btn').textContent = 'Reschedule →';
  const dt = document.getElementById('tp-sr-time');
  dt.value = new Date(startTime).toISOString().slice(0,16);
  document.getElementById('tp-self-reschedule-modal').classList.add('open');
}

async function tpSelfReschedule() {
  const btn = document.getElementById('tp-sr-reschedule-btn');
  const errEl = document.getElementById('tp-sr-error');
  const newTime = document.getElementById('tp-sr-time').value;
  if (!newTime || !_tpSrBookingId) return;
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    // SCRUM-57: this used to call the admin-only analytics?action=
    // reschedule-booking endpoint, which would 403 for a real tutor caller
    // — self-reschedule-booking verifies the caller actually owns this
    // lesson instead of requiring admin.
    const r = await fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=self-reschedule-booking', {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ bookingId: _tpSrBookingId, newStartTime: new Date(newTime).toISOString() }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    document.getElementById('tp-self-reschedule-modal').classList.remove('open');
    seedsToast('✓ Lesson rescheduled', false);
    if (typeof tpLoadSchedule === 'function') tpLoadSchedule();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Reschedule →';
  }
}

async function tpSelfCancel() {
  if (!_tpSrBookingId || !confirm('Cancel this lesson? If the student paid, a refund will be issued.')) return;
  try {
    // SCRUM-57: see tpSelfReschedule — self-cancel-booking verifies
    // ownership instead of requiring admin.
    const r = await fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=self-cancel-booking', {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ bookingId: _tpSrBookingId }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('tp-self-reschedule-modal').classList.remove('open');
    seedsToast(d.refunded ? '✓ Lesson cancelled & refund issued' : '✓ Lesson cancelled', false);
    if (typeof tpLoadSchedule === 'function') tpLoadSchedule();
  } catch(e) { seedsToast('Failed: ' + e.message); }
}

// ══ LESSON DELIVERY ATTESTATION (SCRUM-88) ═══════════════════════════════
// Nothing is billed to a family or paid to a tutor until the tutor says what
// actually happened. Before this, a lesson was charged simply because its
// start time had passed — a no-show or a lesson that never ran was billed
// exactly like one that was taught.
// Every outcome a week of teaching actually throws up, and what each one
// does to the money. Two buttons ("Taught" / "No-show") forced a tutor to
// bill a family in full for anything that wasn't a clean lesson — there was
// no way to say the two of you agreed to move it, or that the tutor was the
// one who couldn't make it.
const TP_OUTCOMES = [
  { key:'delivered',        label:'Taught as planned',            bills:true,
    detail:'Charged as normal. You get paid for it.' },
  { key:'partial',          label:'Cut short by the student',     bills:true,
    detail:'Charged in full — you held and delivered the slot.' },
  { key:'no_show',          label:'Student didn\'t turn up',      bills:true,
    detail:'Charged in full — you held the slot. You still get paid.' },
  { key:'cancelled_mutual', label:'Cancelled by agreement',       bills:false,
    detail:'Nobody is charged and nobody is paid.' },
  { key:'tutor_cancelled',  label:'I cancelled / couldn\'t make it', bills:false,
    detail:'Nobody is charged and nobody is paid.' },
  { key:'waived',           label:'Waive this one (goodwill)',    bills:false,
    detail:'Nobody is charged and nobody is paid.' },
];

function tpOpenOutcome(bookingId, studentName) {
  const rows = TP_OUTCOMES.map((o,i) => `
    <label style="display:flex;gap:11px;align-items:flex-start;padding:11px 13px;border:1.5px solid #E8E8E8;border-radius:10px;cursor:pointer;margin-bottom:7px" onmouseover="this.style.borderColor='#C8A15A'" onmouseout="this.style.borderColor=this.querySelector('input').checked?'#0D1B2A':'#E8E8E8'">
      <input type="radio" name="tp-outcome" value="${o.key}"${i===0?' checked':''} style="margin-top:3px;cursor:pointer"
             onchange="document.querySelectorAll('#tp-outcome-list label').forEach(l=>l.style.borderColor=l.querySelector('input').checked?'#0D1B2A':'#E8E8E8')">
      <span>
        <span style="display:block;font-weight:650;font-size:.85rem;color:#0D1B2A">${o.label}</span>
        <span style="display:block;font-size:.75rem;color:${o.bills?'#8A6A22':'#718096'};margin-top:1px">${o.detail}</span>
      </span>
    </label>`).join('');
  document.getElementById('tp-outcome-student').textContent = studentName || 'this lesson';
  document.getElementById('tp-outcome-list').innerHTML = rows;
  document.getElementById('tp-outcome-note').value = '';
  document.getElementById('tp-outcome-err').style.display = 'none';
  document.getElementById('tp-outcome-save').disabled = false;
  document.getElementById('tp-outcome-save').textContent = 'Save outcome';
  document.getElementById('tp-outcome-modal').dataset.bid = bookingId;
  document.getElementById('tp-outcome-modal').classList.add('open');
  document.querySelectorAll('#tp-outcome-list label').forEach(l =>
    l.style.borderColor = l.querySelector('input').checked ? '#0D1B2A' : '#E8E8E8');
}

async function tpSubmitOutcome() {
  const modal = document.getElementById('tp-outcome-modal');
  const btn = document.getElementById('tp-outcome-save');
  const sel = document.querySelector('input[name="tp-outcome"]:checked');
  if (!sel) return;
  btn.disabled = true; btn.textContent = 'Saving…';
  const ok = await tpMarkDelivered(modal.dataset.bid, sel.value,
                                   document.getElementById('tp-outcome-note').value.trim() || null);
  if (ok) { modal.classList.remove('open'); }
  else { btn.disabled = false; btn.textContent = 'Save outcome'; }
}

async function tpMarkDelivered(bookingId, outcome, note) {
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=mark-delivered', {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ bookingId, outcome, note }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    seedsToast('✓ Lesson marked', false);
    if (typeof tpLoadSchedule === 'function') tpLoadSchedule();
    return true;
  } catch(e) {
    const err = document.getElementById('tp-outcome-err');
    if (err) { err.textContent = e.message; err.style.display = 'block'; }
    else seedsToast('Could not save: ' + e.message);
    return false;
  }
}

// Renders either the outcome already recorded, or the buttons to record one.
// Returns '' for anything that isn't a finished, confirmed lesson, so the
// control never appears on a lesson that hasn't happened yet.
function tpDeliveryControl(b) {
  const OUTCOME_LBL = {
    delivered: '✓ Taught', partial: '✓ Cut short', no_show: '⚠ No-show',
    late_cancelled: '⚠ Late cancellation', cancelled_mutual: '— Cancelled',
    tutor_cancelled: '— You cancelled', waived: '— Waived',
  };
  // Must match BILLABLE_OUTCOMES in the backend's lib/cancellationPolicy.js.
  const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];
  if (b.deliveryStatus) {
    const chargeable = BILLABLE.includes(b.deliveryStatus);
    return `<span title="${chargeable ? 'Chargeable' : 'Not charged'}" style="padding:5px 9px;border-radius:7px;font-size:.68rem;font-weight:700;color:${chargeable?'#2D7A4F':'#A7A7A7'};background:${chargeable?'#EAF5EE':'#F4F4F4'};white-space:nowrap">${OUTCOME_LBL[b.deliveryStatus]||b.deliveryStatus}</span>`;
  }
  // end_time, not start_time: a lesson in progress is not yet a lesson that
  // happened, and the backend rejects attesting one either way.
  const finished = b.endTime && new Date(b.endTime) < new Date();
  if (!finished || b.status === 'requested' || b.status === 'cancelled') return '';
  const sn = (b.studentName || '').replace(/'/g, '');
  return `<button onclick="tpOpenOutcome('${b.id||''}','${sn}')" style="padding:6px 12px;border:1.5px solid #2D7A4F;border-radius:7px;font-size:.71rem;font-weight:700;color:#2D7A4F;cursor:pointer;background:#fff;font-family:Inter,sans-serif">What happened? →</button>`;
}

// ══ SESSION TIMEOUT (30 min inactivity) ══════════════════════════════════
(function() {
  let _timer;
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  function resetTimer() {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      // Only log out if a portal is open
      const isPortalOpen = document.getElementById('ad-overlay')?.classList.contains('ad-open') ||
                           document.getElementById('portal-overlay')?.style.display === 'block' ||
                           document.getElementById('tp-overlay')?.classList.contains('tp-open');
      if (isPortalOpen) {
        seedsToast("Session expired — please sign in again.");
        sbClient.auth.signOut();
        setTimeout(() => window.location.reload(), 2000);
      }
    }, TIMEOUT_MS);
  }
  ['mousemove','keydown','click','scroll','touchstart'].forEach(e => {
    document.addEventListener(e, resetTimer, { passive: true });
  });
  resetTimer();
})();

// ══ SMART JOIN BUTTON (24h before, not just live) ════════════════════════
function spTimeLabel(iso) {
  const diff = new Date(iso) - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins < -90) return null; // past
  if (mins <= 0) return '🔴 Live';
  if (mins <= 1440) return `in ${mins < 60 ? mins + 'm' : Math.round(mins/60) + 'h'}`; // within 24h
  const days = Math.round(mins / 1440);
  return `in ${days}d`;
}

// Update spRenderHome to show Join for lessons within 24h
const _origSpRH = window.spRenderHome;
if (typeof spRenderHome !== 'undefined') {
  window.spRenderHome = function(studentName) {
    _origSpRH(studentName);
    // Re-render upcoming with 24h join window
    const upcoming = spBookings
      .filter(b => {
        const diff = new Date(b.startTime) - Date.now();
        return diff > -5400000 && diff < 7 * 86400000;
      })
      .sort((a,b) => new Date(a.startTime)-new Date(b.startTime))
      .slice(0,3);
    // Cards are already rendered by the original function; just update Join buttons
    document.querySelectorAll('.p-join-soon').forEach(btn => {
      const row = btn.closest('.p-lesson');
      if (!row) return;
      // Find matching booking by text content
      const booking = upcoming.find(b => {
        const subj = row.querySelector('.p-l-subj')?.textContent || '';
        return subj.includes(b.subject);
      });
      if (booking && booking.meetLink) {
        const diff = new Date(booking.startTime) - Date.now();
        if (diff <= 1440 * 60000 && diff > 0) { // within 24h
          btn.textContent = '🔗 Join link';
          btn.classList.add('p-join-live');
          btn.classList.remove('p-join-soon');
          btn.onclick = () => spJoinLesson(booking.meetLink);
        }
      }
    });
  };
}

// Wire profile check into student open
const _origSPOpenProfile = window._openStudentPortal;
window._openStudentPortal = function() {
  _origSPOpenProfile();
  setTimeout(spCheckProfileSetup, 2000);
};


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.spSaveProfile = spSaveProfile;
  window.spDismissProfileModal = spDismissProfileModal;
  window.spLoadRecordings = spLoadRecordings;
  window.spCheckProfileSetup = spCheckProfileSetup;
  Object.defineProperty(window, "_tpSrBookingId", { get: () => _tpSrBookingId, set: (v) => { _tpSrBookingId = v; }, configurable: true });
  window.tpOpenSelfManage = tpOpenSelfManage;
  window.tpSelfReschedule = tpSelfReschedule;
  window.tpSelfCancel = tpSelfCancel;
  window.TP_OUTCOMES = TP_OUTCOMES;
  window.tpOpenOutcome = tpOpenOutcome;
  window.tpSubmitOutcome = tpSubmitOutcome;
  window.tpMarkDelivered = tpMarkDelivered;
  window.tpDeliveryControl = tpDeliveryControl;
  window.spTimeLabel = spTimeLabel;
  window._origSpRH = _origSpRH;
  window._origSPOpenProfile = _origSPOpenProfile;
}
