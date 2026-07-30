// Extracted from index.html by the SCRUM-32 migration (block 16).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// NOTE (SCRUM-32): spLoadPaymentHistory() is declared here but replaced later by
// another module assigning to window. Under the old shared global scope that
// replacement applied to this block's own calls too; as a module, a local
// declaration would shadow it. Declared as ...$base and published to window so
// every reference, here included, still resolves to the current override.

// ── ITEM 6: POST-LESSON LOG ──────────────────────────────────────────────
let _tpLogLesson = null; // { bookingId, studentId, studentName, subject, tutorName }

function tpOpenLessonLogFromBtn(btn) {
  const bid = btn.getAttribute('data-bid') || '';
  const sid = btn.getAttribute('data-sid') || '';
  const sname = btn.getAttribute('data-sname') || '';
  const subj = btn.getAttribute('data-subj') || '';
  tpOpenLessonLog(bid, sid, sname, subj);
}

function tpOpenLessonLog(bookingId, studentId, studentName, subject) {
  _tpLogLesson = { bookingId, studentId, studentName, subject };
  document.getElementById('tp-log-desc').textContent =
    'Log lesson with ' + studentName + ' — ' + subject;
  ['tp-log-notes','tp-log-hw-title','tp-log-subject','tp-log-progress','tp-log-grade'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('tp-log-hw-due').value = '';
  document.getElementById('tp-log-error').style.display = 'none';
  document.getElementById('tp-log-success').style.display = 'none';
  document.getElementById('tp-log-btn').disabled = false;
  document.getElementById('tp-log-btn').textContent = 'Save lesson log →';
  // Pre-fill subject
  if (subject) document.getElementById('tp-log-subject').value = subject;
  // Default due date = 1 week from now
  const d = new Date(); d.setDate(d.getDate()+7);
  document.getElementById('tp-log-hw-due').value = d.toISOString().slice(0,10);
  document.getElementById('tp-log-lesson-modal').classList.add('open');
}

async function tpSubmitLessonLog() {
  if (!_tpLogLesson) return;
  const btn = document.getElementById('tp-log-btn');
  const errEl = document.getElementById('tp-log-error');
  const notes = document.getElementById('tp-log-notes').value.trim();
  const hwTitle = document.getElementById('tp-log-hw-title').value.trim();
  const hwDue = document.getElementById('tp-log-hw-due').value;
  const subject = document.getElementById('tp-log-subject').value.trim();
  const progress = parseInt(document.getElementById('tp-log-progress').value) || null;
  const grade = document.getElementById('tp-log-grade').value.trim();

  if (!notes && !hwTitle && !progress) {
    errEl.textContent = 'Add at least a note, homework, or progress update.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = 'Saving…'; errEl.style.display = 'none';

  const _tpLogAuthH = await seedsAuthHeaders();
  const calls = [];
  if (notes) {
    calls.push(fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=notes', {
      method: 'POST', headers: _tpLogAuthH,
      body: JSON.stringify({
        bookingId: _tpLogLesson.bookingId,
        studentId: _tpLogLesson.studentId,
        tutorName: earnCurrentTutor,
        subject: subject || _tpLogLesson.subject,
        note: notes,
      }),
    }));
  }
  if (hwTitle) {
    calls.push(fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=homework', {
      method: 'POST', headers: _tpLogAuthH,
      body: JSON.stringify({
        studentId: _tpLogLesson.studentId,
        tutorName: earnCurrentTutor,
        subject: subject || _tpLogLesson.subject,
        title: hwTitle,
        dueDate: hwDue || null,
      }),
    }));
  }
  if (subject && progress !== null) {
    calls.push(fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=progress', {
      method: 'POST', headers: _tpLogAuthH,
      body: JSON.stringify({
        studentId: _tpLogLesson.studentId,
        subject: subject || _tpLogLesson.subject,
        percent: progress,
        currentGrade: grade || null,
      }),
    }));
  }

  try {
    await Promise.all(calls);
    document.getElementById('tp-log-success').style.display = 'block';
    btn.textContent = 'Saved ✓';
    if (typeof tpLoadSchedule === 'function') tpLoadSchedule();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Save lesson log →';
  }
}

// ── ITEM 7: STUDENT PAYMENT HISTORY ─────────────────────────────────────
async function spLoadPaymentHistory$base() {
  const el = document.getElementById('sp-payment-history');
  if (!el) return;
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const email = session.user.email;
    const r = await fetchWithTimeout(SP_BACKEND + '/api/analytics');
    const data = await r.json();
    const myPaid = (data.recentBookings || []).filter(b =>
      b.parentEmail && b.parentEmail.toLowerCase() === email.toLowerCase() &&
      b.paymentIntentId && b.feePence > 0
    ).sort((a,b) => new Date(b.startTime)-new Date(a.startTime));

    if (!myPaid.length) {
      el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;text-align:center;padding:20px">No payments yet.</div>';
      return;
    }
    const total = myPaid.reduce((s,b)=>s+b.feePence,0);
    el.innerHTML = myPaid.map(b => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0EDE8">
        <div>
          <div style="font-weight:600;font-size:.85rem;color:#0D1B2A">${b.subject} &mdash; ${b.tutorName}</div>
          <div style="font-size:.75rem;color:#718096">${new Date(b.startTime).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
        <span style="font-weight:700;color:#2D7A4F">&pound;${(b.feePence/100).toFixed(2)}</span>
      </div>`).join('') +
      `<div style="text-align:right;padding-top:10px;font-size:.82rem;font-weight:700;color:#0D1B2A">
        Total paid: &pound;${(total/100).toFixed(2)}
      </div>`;
  } catch(e) { console.error('spLoadPaymentHistory:', e.message); }
}

// ── ITEM 8: TUTOR FULL EARNINGS HISTORY (bypass 25 limit) ──────────────
async function earnLoadFullHistory() {
  // Fetch from a dedicated resource that returns all bookings for this tutor
  const tutor = earnCurrentTutor || 'Azeem Omar-Mufti';
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/payouts?resource=verify&tutor=' + encodeURIComponent(tutor), {
      headers: await seedsAuthHeaders(),
    });
    const allLessons = await r.json();
    if (!Array.isArray(allLessons)) return;
    // Merge into EARN_LESSONS if we have fewer entries currently
    if (allLessons.length > EARN_LESSONS.length) {
      EARN_LESSONS = allLessons.map(b => ({
        date: (b.start_time||'').slice(0,10),
        startTime: b.start_time,
        student: b.students?.student_name || '—',
        type: b.lesson_type,
        fee: b.fee_pence,
        paid: b.status === 'completed', // tutor payout status, not student payment — see earnLoadData
        status: b.status,
        paymentStatus: b.payment_status,
        paymentIntentId: b.stripe_payment_intent_id || null,
      }));
      earnRenderLedger();
    }
  } catch(e) { console.error('earnLoadFullHistory:', e.message); }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "_tpLogLesson", { get: () => _tpLogLesson, set: (v) => { _tpLogLesson = v; }, configurable: true });
  window.tpOpenLessonLogFromBtn = tpOpenLessonLogFromBtn;
  window.tpOpenLessonLog = tpOpenLessonLog;
  window.tpSubmitLessonLog = tpSubmitLessonLog;
  window.spLoadPaymentHistory = spLoadPaymentHistory$base;
  window.earnLoadFullHistory = earnLoadFullHistory;
}
