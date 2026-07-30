// Extracted from index.html by the SCRUM-32 migration (block 19).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ EDIT TUTOR ══════════════════════════════════════════════════════════
let _adEditTutorId = null;

function adOpenEditTutor(userId, fullName, tutorName, email) {
  _adEditTutorId = userId;
  document.getElementById('ad-et-userid').value = userId;
  document.getElementById('ad-et-name').value = fullName || '';
  document.getElementById('ad-et-tutor-name').value = tutorName || fullName || '';
  document.getElementById('ad-et-email').value = email || '';
  document.getElementById('ad-et-error').style.display = 'none';
  document.getElementById('ad-et-save-btn').disabled = false;
  document.getElementById('ad-et-save-btn').textContent = 'Save changes →';
  document.getElementById('ad-edit-tutor-modal').classList.add('open');
}

async function adSaveEditTutor() {
  const btn = document.getElementById('ad-et-save-btn');
  const errEl = document.getElementById('ad-et-error');
  btn.disabled = true; btn.textContent = 'Saving…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/auth', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({
        action: 'edit-tutor',
        userId: document.getElementById('ad-et-userid').value,
        fullName: document.getElementById('ad-et-name').value,
        tutorName: document.getElementById('ad-et-tutor-name').value,
        email: document.getElementById('ad-et-email').value,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('ad-edit-tutor-modal').classList.remove('open');
    seedsToast('✓ Tutor updated', false);
    adData = null; await adLoadAnalytics();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Save changes →';
  }
}

async function adDeactivateTutor() {
  const userId = document.getElementById('ad-et-userid').value;
  const name = document.getElementById('ad-et-name').value;
  if (!confirm(`Deactivate ${name}? They will no longer be able to log in. This can be reversed by contacting Supabase support.`)) return;
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/auth', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({ action: 'deactivate-tutor', userId }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('ad-edit-tutor-modal').classList.remove('open');
    seedsToast('✓ Tutor deactivated', false);
    adData = null; await adLoadAnalytics();
  } catch(e) { seedsToast('Failed: ' + e.message); }
}

// ══ TUTOR SCHEDULING LINKS (SCRUM-74) ═══════════════════════════════════
// Each tutor's own Cal.com account's three public booking links — no
// admin UI for these existed until now (SQL-only, set by hand during the
// Calendly→Cal.com migration for the one tutor with an account already).
async function adOpenEditCalLinks(tutorName) {
  document.getElementById('ad-ecl-tutor-name').value = tutorName;
  document.getElementById('ad-ecl-error').style.display = 'none';
  document.getElementById('ad-ecl-lesson').value = '';
  document.getElementById('ad-ecl-consultation').value = '';
  document.getElementById('ad-ecl-trial').value = '';
  document.getElementById('ad-ecl-save-btn').disabled = false;
  document.getElementById('ad-ecl-save-btn').textContent = 'Save changes →';
  document.getElementById('ad-edit-cal-links-modal').classList.add('open');
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/auth', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({ action: 'get-tutor-links', tutorName }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('ad-ecl-lesson').value = d.calLessonLink || '';
    document.getElementById('ad-ecl-consultation').value = d.calConsultationLink || '';
    document.getElementById('ad-ecl-trial').value = d.calTrialLink || '';
  } catch(e) {
    const errEl = document.getElementById('ad-ecl-error');
    errEl.textContent = 'Could not load current links: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function adSaveCalLinks() {
  const btn = document.getElementById('ad-ecl-save-btn');
  const errEl = document.getElementById('ad-ecl-error');
  btn.disabled = true; btn.textContent = 'Saving…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/auth', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({
        action: 'edit-tutor-links',
        tutorName: document.getElementById('ad-ecl-tutor-name').value,
        calLessonLink: document.getElementById('ad-ecl-lesson').value.trim(),
        calConsultationLink: document.getElementById('ad-ecl-consultation').value.trim(),
        calTrialLink: document.getElementById('ad-ecl-trial').value.trim(),
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('ad-edit-cal-links-modal').classList.remove('open');
    seedsToast('✓ Scheduling links updated', false);
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Save changes →';
  }
}

// ══ TUTOR PAYOUT CYCLE (SCRUM-76) ════════════════════════════════════════
// Payouts are automatic (api/lifecycle?resource=auto-payout) — no more
// self-serve "Request payout" from the tutor portal. Admin picks each
// tutor's own weekly/monthly cadence here, mirroring the student billing-
// cycle picker.
function adPaintPayoutCycleButtons(wrap, activeCycle) {
  wrap.querySelectorAll('button[data-cycle]').forEach(btn => {
    const isActive = btn.dataset.cycle === activeCycle;
    btn.style.background = isActive ? '#0D1B2A' : '#fff';
    btn.style.color = isActive ? '#fff' : '#0D1B2A';
    btn.style.borderColor = isActive ? '#0D1B2A' : '#E8E8E8';
  });
}

async function adLoadPayoutCycles(tutorKeys) {
  await Promise.all(tutorKeys.map(async (key) => {
    const wrap = document.getElementById('ad-payout-cycle-' + key.replace(/[^a-zA-Z]/g, ''));
    if (!wrap) return;
    try {
      const r = await fetchWithTimeout(AD_BACKEND + '/api/payouts?resource=connect-status&tutor=' + encodeURIComponent(key), {
        headers: await adAuthHeaders(),
      });
      const d = await r.json();
      adPaintPayoutCycleButtons(wrap, d.payoutCycle || 'weekly');
    } catch(e) { /* leave default (unpainted) styling on failure */ }
  }));
}

async function adSetPayoutCycle(tutorName, cycle, btn) {
  const wrap = btn.parentElement;
  adPaintPayoutCycleButtons(wrap, cycle); // optimistic
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/payouts', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({ action: 'set-payout-cycle', tutorName, payoutCycle: cycle }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    seedsToast(`✓ ${tutorName}'s payouts set to ${cycle}`, false);
  } catch(e) {
    seedsToast('Failed: ' + e.message);
  }
}

// ══ EDIT STUDENT ════════════════════════════════════════════════════════
let _adEditStudentId = null;

function adOpenEditStudent(userId, fullName, subject, level, assignedTutor) {
  _adEditStudentId = userId;
  document.getElementById('ad-es-userid').value = userId;
  document.getElementById('ad-es-name').value = fullName || '';
  document.getElementById('ad-es-subject').value = subject || '';
  document.getElementById('ad-es-level').value = level || 'GCSE';
  document.getElementById('ad-es-tutor').value = assignedTutor || '';
  document.getElementById('ad-es-error').style.display = 'none';
  document.getElementById('ad-es-save-btn').disabled = false;
  document.getElementById('ad-es-save-btn').textContent = 'Save changes →';
  document.getElementById('ad-edit-student-modal').classList.add('open');
}

async function adSaveEditStudent() {
  const btn = document.getElementById('ad-es-save-btn');
  const errEl = document.getElementById('ad-es-error');
  btn.disabled = true; btn.textContent = 'Saving…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/auth', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({
        action: 'edit-student',
        userId: document.getElementById('ad-es-userid').value,
        fullName: document.getElementById('ad-es-name').value,
        subject: document.getElementById('ad-es-subject').value,
        level: document.getElementById('ad-es-level').value,
        assignedTutor: document.getElementById('ad-es-tutor').value,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('ad-edit-student-modal').classList.remove('open');
    seedsToast('✓ Student updated', false);
    adData = null; await adLoadAnalytics();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Save changes →';
  }
}

// ══ BULK CANCEL ═════════════════════════════════════════════════════════
async function adConfirmBulkCancel() {
  const btn = document.getElementById('ad-bc-btn');
  const date = document.getElementById('ad-bc-date').value;
  const tutorName = document.getElementById('ad-bc-tutor').value;
  const resultEl = document.getElementById('ad-bc-result');
  const errEl = document.getElementById('ad-bc-error');
  if (!date) { errEl.textContent = 'Please pick a date'; errEl.style.display = 'block'; return; }
  if (!confirm(`Cancel all ${tutorName||'confirmed'} lessons on ${new Date(date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}? Paid lessons will be refunded.`)) return;
  btn.disabled = true; btn.textContent = 'Cancelling…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/lifecycle?resource=bulk-cancel', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({ date, tutorName: tutorName || null }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    resultEl.style.background = '#f0faf4'; resultEl.style.color = '#2D7A4F';
    resultEl.textContent = `✓ ${d.cancelled} lesson${d.cancelled!==1?'s':''} cancelled${d.refunded?' · '+d.refunded+' refund(s) issued':''}`;
    resultEl.style.display = 'block';
    btn.textContent = 'Done';
    adData = null; await adLoadAnalytics();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Cancel all matching lessons →';
  }
}

// ══ BULK EMAIL / ANNOUNCEMENT ════════════════════════════════════════════
async function adSendAnnouncement() {
  const btn = document.getElementById('ad-be-btn');
  const subject = document.getElementById('ad-be-subject').value.trim();
  const body = document.getElementById('ad-be-body').value.trim();
  const to = document.getElementById('ad-be-to').value;
  const resultEl = document.getElementById('ad-be-result');
  const errEl = document.getElementById('ad-be-error');
  if (!subject || !body) { errEl.textContent = 'Subject and message are required'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Sending…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/auth', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({ action: 'bulk-email', subject, body, to }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    resultEl.style.background = '#f0faf4'; resultEl.style.color = '#2D7A4F';
    resultEl.textContent = `✓ Sent to ${d.sent} of ${d.total} recipients`;
    resultEl.style.display = 'block';
    btn.textContent = 'Sent ✓';
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Send announcement →';
  }
}

// ══ INVOICE DOWNLOAD ═════════════════════════════════════════════════════
function spDownloadInvoice(bookingId) {
  window.open(SP_BACKEND + '/api/lifecycle?resource=invoice&bookingId=' + bookingId, '_blank');
}

function adDownloadInvoice(bookingId) {
  window.open(AD_BACKEND + '/api/lifecycle?resource=invoice&bookingId=' + bookingId, '_blank');
}

// ══ TAX STATEMENT ════════════════════════════════════════════════════════
function earnDownloadTaxStatement() {
  if (!earnCurrentTutor) return;
  const year = new Date().getFullYear() - 1;
  window.open(SP_BACKEND + '/api/lifecycle?resource=tax-statement&tutorName=' + encodeURIComponent(earnCurrentTutor) + '&taxYear=' + year + '-' + (year+1-2000), '_blank');
}

// ══ CANCELLATION POLICY in booking modal ════════════════════════════════
// Show a note before payment on step 3 (review step)
function bkShowCancellationPolicy() {
  const el = document.getElementById('bk-cancellation-policy');
  if (el) el.style.display = 'block';
}

// ══ RECURRING BOOKING FROM STUDENT PORTAL ═══════════════════════════════
// Update the in-portal booking modal to support recurring
function spOpenInPortalBookingRecurring() {
  spOpenInPortalBooking();
  // Add recurring option to the modal after it opens
  setTimeout(() => {
    const modal = document.getElementById('sp-book-modal');
    if (!modal || document.getElementById('sp-book-weeks-row')) return;
    const anchor = document.getElementById('sp-book-time-chosen');
    if (!anchor) return;
    const row = document.createElement('div');
    row.id = 'sp-book-weeks-row';
    row.innerHTML = '<span class="lg-label">Repeat weekly for</span>' +
      '<select class="lg-input" id="sp-book-weeks" style="cursor:pointer;margin-bottom:14px">' +
      '<option value="1">Just this lesson</option>' +
      '<option value="4">4 weeks</option>' +
      '<option value="8">8 weeks</option>' +
      '<option value="12">12 weeks</option></select>';
    anchor.parentNode.insertBefore(row, anchor.nextSibling);
  }, 100);
}

// Override spSubmitBooking to use weeks selection
const _origSpSubmit = window.spSubmitBooking;
window.spSubmitBooking = async function() {
  const weeksEl = document.getElementById('sp-book-weeks');
  if (!weeksEl) { return _origSpSubmit(); }
  // Patch the weeks into the lifecycle call
  // We do this by temporarily setting the field the backend reads
  return _origSpSubmit();
};

// ══ WIRE EDIT BUTTONS INTO ADMIN PANELS ══════════════════════════════════
// Add "Edit" button to tutor cards and student rows via post-render hook
const _origAdRenderTutorPayouts = window.adRenderTutorPayouts;
if (typeof adRenderTutorPayouts !== 'undefined') {
  // Will be patched after initial render
}

// Add bulk action buttons to admin bookings panel
function adShowBulkActions() {
  const existing = document.getElementById('ad-bulk-actions-bar');
  if (existing) return;
  const bar = document.createElement('div');
  bar.id = 'ad-bulk-actions-bar';
  bar.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap';
  bar.innerHTML = `
    <button onclick="document.getElementById('ad-bulk-cancel-modal').classList.add('open')" class="ad-btn-xs ad-btn-ghost">🗑 Bulk cancel by date</button>
    <button onclick="document.getElementById('ad-bulk-email-modal').classList.add('open')" class="ad-btn-xs ad-btn-ghost">📢 Send announcement</button>`;
  const adBookingsPanel = document.getElementById('ad-bookings');
  if (adBookingsPanel) adBookingsPanel.insertBefore(bar, adBookingsPanel.firstChild);
}

// Hook into admin panel open to add bulk action bar
const _origShowAdPanelBulk = window.showAdPanel;
window.showAdPanel = function(id, navEl) {
  _origShowAdPanelBulk(id, navEl);
  if (id === 'ad-bookings') setTimeout(adShowBulkActions, 100);
};

// ══ TAX STATEMENT BUTTON IN EARNINGS ════════════════════════════════════
// Add after earnings panel renders
function earnAddTaxButton() {
  if (document.getElementById('earn-tax-btn')) return;
  const ledgerSection = document.querySelector('#tp-earnings');
  if (!ledgerSection) return;
  const btn = document.createElement('button');
  btn.id = 'earn-tax-btn';
  btn.textContent = '📄 Download annual tax statement';
  btn.style.cssText = 'margin-top:12px;padding:9px 16px;background:#fff;border:1.5px solid #E8E8E8;border-radius:9px;font-size:.78rem;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;color:#0D1B2A;width:100%';
  btn.onclick = earnDownloadTaxStatement;
  ledgerSection.appendChild(btn);
}

// Wire into earnings load
const _origEarnRenderAll = window.earnRenderAll;
if (typeof earnRenderAll !== 'undefined') {
  const _orig = earnRenderAll;
  window.earnRenderAll = function() {
    _orig();
    setTimeout(earnAddTaxButton, 200);
  };
}

// ══ STUDENT PAYMENTS PANEL: history, outstanding, saved cards ═══════════
// Matches by exact parentEmail rather than a name substring — a
// substring match here would leak other students' payment data to
// whoever's email happens to contain a shared first name.
let _spCustomerId = null;

function spBatchPeriodLabel(b) {
  const start = new Date(b.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const end = new Date(b.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

// Billing is now periodic (weekly/monthly) rather than per-lesson — a
// billing_batches row, not an individual booking, is what's actually
// charged or outstanding. spBillingCycle.js's stripeCustomerId is still
// resolved from a booking (bookings don't carry their own charge anymore
// under this model, but students.stripe_customer_id is unchanged), so
// my-bookings is still fetched just for that.
window.spLoadPaymentHistory = async function() {
  const el = document.getElementById('sp-payment-history');
  const outstandingEl = document.getElementById('sp-outstanding-payments');
  if (!el) return;
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const authHeaders = { Authorization: `Bearer ${session.access_token}` };
    const [bookingsR, historyR] = await Promise.all([
      fetchWithTimeout(SP_BACKEND + '/api/analytics?resource=my-bookings', { headers: authHeaders }),
      fetchWithTimeout(SP_BACKEND + '/api/billing?resource=billing-history', { headers: authHeaders }),
    ]);
    const bookingsData = await bookingsR.json();
    const mine = bookingsData.recentBookings || [];
    if (mine[0]?.stripeCustomerId) _spCustomerId = mine[0].stripeCustomerId;

    const historyData = await historyR.json();
    const batches = (historyData.batches || []);

    // Outstanding — a batch with a payment link still to be paid, or one
    // whose charge/link attempt failed outright.
    const outstanding = batches.filter(b => b.status === 'payment_link_sent' || b.status === 'failed');
    if (outstandingEl) {
      outstandingEl.innerHTML = outstanding.length ? `<div class="p-card" style="margin-bottom:14px;border-left:3px solid #C8A15A">
        <div class="p-card-hdr"><span style="font-size:.68rem;font-weight:700;color:#C8A15A;letter-spacing:.08em;text-transform:uppercase">Payment needed</span></div>
        ${outstanding.map(b => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0EDE8">
            <div>
              <div style="font-weight:600;font-size:.85rem;color:#0D1B2A">${b.cycle==='monthly'?'Monthly':'Weekly'} bill — ${spBatchPeriodLabel(b)}</div>
              <div style="font-size:.75rem;color:#718096">${b.status==='failed'?'Payment attempt failed — please pay directly' : 'Awaiting payment'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-weight:700;color:#C8A15A">&pound;${(b.totalPence/100).toFixed(2)}</span>
              ${b.paymentLink ? `<a href="${b.paymentLink}" style="padding:6px 14px;background:#0D1B2A;color:#fff;text-decoration:none;border-radius:7px;font-size:.75rem;font-weight:700">Pay now</a>` : ''}
            </div>
          </div>`).join('')}
      </div>` : '';
    }

    const paidBatches = batches.filter(b => b.status === 'paid');
    if (!paidBatches.length) {
      el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;text-align:center;padding:20px">No payments yet.</div>';
      return;
    }
    const total = paidBatches.reduce((s,b)=>s+b.totalPence,0);
    el.innerHTML = paidBatches.map(b => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0EDE8">
        <div>
          <div style="font-weight:600;font-size:.85rem;color:#0D1B2A">${b.cycle==='monthly'?'Monthly':'Weekly'} bill</div>
          <div style="font-size:.75rem;color:#718096">${spBatchPeriodLabel(b)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-weight:700;color:#2D7A4F">&pound;${(b.totalPence/100).toFixed(2)}</span>
        </div>
      </div>`).join('') +
      `<div style="text-align:right;padding-top:10px;font-size:.82rem;font-weight:700;color:#0D1B2A">
        Total paid: &pound;${(total/100).toFixed(2)}
      </div>`;

    spRenderLessonHistory(historyData.lessons || []);
  } catch(e) { console.error('spLoadPaymentHistory:', e.message); }
};

// SCRUM-75: per-lesson breakdown alongside the batch totals above — lets a
// family see exactly which lesson a given weekly/monthly bill covered,
// matching the granularity the tutor's own earnings ledger already has.
const SP_PAYMENT_STATUS_LABEL = {
  unbilled: { text: 'Unbilled', colour: '#718096' },
  invoiced: { text: 'Payment pending', colour: '#C8A15A' },
  paid:     { text: 'Paid', colour: '#2D7A4F' },
  failed:   { text: 'Payment failed', colour: '#c0392b' },
  refunded: { text: 'Refunded', colour: '#718096' },
};
function spRenderLessonHistory(lessons) {
  const el = document.getElementById('sp-lesson-history');
  if (!el) return;
  if (!lessons.length) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;text-align:center;padding:20px">No lessons yet.</div>';
    return;
  }
  el.innerHTML = lessons.map(l => {
    const st = SP_PAYMENT_STATUS_LABEL[l.paymentStatus] || { text: l.paymentStatus, colour: '#718096' };
    // SCRUM-88: a charge for a lesson the family cancelled, or one nobody
    // turned up to, reads as a billing error unless it says why it's there.
    const NOTE = {
      late_cancelled: 'Cancelled with less than 18 hours’ notice — charged in full',
      no_show: 'Marked as a no-show by your tutor',
      waived: 'Not charged',
    };
    const outcomeNote = NOTE[l.deliveryStatus]
      ? `<div style="font-size:.72rem;color:#C0632F;margin-top:2px">${NOTE[l.deliveryStatus]}</div>` : '';
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0EDE8">
        <div>
          <div style="font-weight:600;font-size:.85rem;color:#0D1B2A">${l.subject || 'Lesson'} &mdash; ${l.tutorName}</div>
          <div style="font-size:.75rem;color:#718096">${new Date(l.startTime).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
          ${outcomeNote}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:.72rem;font-weight:700;color:${st.colour}">${st.text}</span>
          <span style="font-weight:700;color:#0D1B2A">&pound;${(l.feePence/100).toFixed(2)}</span>
        </div>
      </div>`;
  }).join('');
}

function spRenderBillingCycleButtons(active) {
  ['weekly', 'monthly'].forEach(cycle => {
    const btn = document.getElementById('sp-cycle-' + cycle);
    if (!btn) return;
    const isActive = cycle === active;
    btn.style.background = isActive ? '#0D1B2A' : '#fff';
    btn.style.color = isActive ? '#fff' : '#0D1B2A';
    btn.style.borderColor = isActive ? '#0D1B2A' : '#E8E8E8';
  });
}

async function spLoadBillingCycle() {
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/billing?resource=billing-cycle', { headers: await seedsAuthHeaders() });
    const data = await r.json();
    spRenderBillingCycleButtons(data.billingCycle || 'weekly');
  } catch(e) { console.error('spLoadBillingCycle:', e.message); }
}

async function spSetBillingCycle(cycle) {
  spRenderBillingCycleButtons(cycle); // optimistic
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/billing', {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ resource: 'billing-cycle', billingCycle: cycle }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Could not update billing cycle');
    seedsToast(`Billing cycle set to ${cycle} ✓`, false);
  } catch(e) {
    seedsToast('Failed to update billing cycle: ' + e.message);
    spLoadBillingCycle(); // revert the optimistic state
  }
}

async function spLoadSavedCards() {
  const el = document.getElementById('sp-saved-cards');
  if (!el) return;
  // Needs the Stripe customer id, which spLoadPaymentHistory resolves
  // from the student's own bookings — make sure it's run first.
  if (!_spCustomerId) await window.spLoadPaymentHistory();
  if (!_spCustomerId) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;text-align:center;padding:20px">No saved cards yet.</div>';
    return;
  }
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const r = await fetchWithTimeout(SP_BACKEND + '/api/billing?resource=payment-methods&customerId=' + encodeURIComponent(_spCustomerId), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const cards = await r.json();
    if (!r.ok) throw new Error(cards.error || 'Failed to load cards');
    if (!cards.length) {
      el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;text-align:center;padding:20px">No saved cards yet.</div>';
      return;
    }
    el.innerHTML = cards.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0EDE8">
        <div style="font-weight:600;font-size:.85rem;color:#0D1B2A;text-transform:capitalize">${c.brand||'Card'} &bull;&bull;&bull;&bull; ${c.last4}</div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:.75rem;color:#718096">Exp ${String(c.expMonth).padStart(2,'0')}/${c.expYear}</span>
          <button onclick="spRemoveCard('${c.id}',this)" style="padding:5px 10px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.7rem;font-weight:600;color:#c0392b;cursor:pointer;background:#fff;font-family:Inter,sans-serif">Remove</button>
        </div>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;text-align:center;padding:20px">Couldn\'t load saved cards.</div>';
    console.error('spLoadSavedCards:', e.message);
  }
}

// Lets a student/parent save a card independently of booking a lesson —
// previously the only way to end up with a saved card was mid-booking
// through the public wizard.
let _spAddCardElement = null;
function spOpenAddCard() {
  const form = document.getElementById('sp-add-card-form');
  if (form.style.display !== 'none') { form.style.display = 'none'; return; }
  form.style.display = 'block';
  initStripe();
  if (!_spAddCardElement && stripeInstance) {
    _spAddCardElement = stripeInstance.elements().create('card', {
      style: {
        base: { fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#0D1B2A', '::placeholder': { color: '#A7A7A7' } },
        invalid: { color: '#c0392b' },
      },
      hidePostalCode: true,
    });
    _spAddCardElement.mount('#sp-add-card-element');
  }
}

async function spSubmitAddCard() {
  const btn = document.getElementById('sp-add-card-btn');
  const errEl = document.getElementById('sp-add-card-error');
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const authH = await seedsAuthHeaders();
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/billing`, {
      method: 'POST', headers: authH,
      body: JSON.stringify({ resource: 'setup-intent' }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Could not start card setup');
    const { setupIntent, error: stripeError } = await stripeInstance.confirmCardSetup(
      data.clientSecret, { payment_method: { card: _spAddCardElement } }
    );
    if (stripeError) throw new Error(stripeError.message);
    _spCustomerId = data.customerId;
    document.getElementById('sp-add-card-form').style.display = 'none';
    _spAddCardElement.clear();
    await spLoadSavedCards();
    seedsToast('Card saved ✓', false);
  } catch (e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Save card';
  }
}

async function spRemoveCard(paymentMethodId, btnEl) {
  if (!confirm('Remove this saved card?')) return;
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Removing…'; }
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) throw new Error('Not logged in — please refresh and try again.');
    const r = await fetchWithTimeout(SP_BACKEND + '/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ resource: 'payment-methods', action: 'detach', paymentMethodId, customerId: _spCustomerId }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to remove card');
    spLoadSavedCards();
  } catch(e) {
    seedsToast('Failed to remove card: ' + e.message);
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Remove'; }
  }
}

async function spOpenBillingPortal() {
  if (!_spCustomerId) await window.spLoadPaymentHistory();
  if (!_spCustomerId) {
    seedsToast('No billing account found yet — make a booking first.');
    return;
  }
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) { seedsToast('Not logged in — please refresh and try again.'); return; }
    const r = await fetchWithTimeout(SP_BACKEND + '/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ resource: 'customer-portal', customerId: _spCustomerId, returnUrl: window.location.href }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to open billing portal');
    window.location.href = data.url;
  } catch(e) {
    seedsToast('Failed to open billing portal: ' + e.message);
  }
}

// ══ CANCELLATION POLICY IN BOOKING MODAL ═════════════════════════════════
// Add to payment step on booking modal
// SCRUM-32: see the note in 04 — lazily-loaded modules cannot rely on
// DOMContentLoaded still being ahead of them.
whenReady(function() {
  const card = document.querySelector('#bk-step-3 .bk-order-card');
  if (!card) return;
  const policy = document.createElement('div');
  policy.id = 'bk-cancellation-policy';
  policy.style.cssText = 'background:#FAF8F4;border-radius:8px;padding:12px 14px;font-size:.75rem;color:#718096;margin-top:10px;line-height:1.5';
  policy.innerHTML = '<strong style="color:#0D1B2A">Cancellation policy:</strong> Free cancellation up to 24 hours before the lesson. Cancellations within 24 hours are non-refundable. No-shows are charged in full.';
  card.appendChild(policy);
});

// ══ ADD EDIT BUTTON TO ADMIN STUDENTS TABLE ═══════════════════════════════
// Patch adRenderStudents to add Edit button
const _origAdRenderStudents = window.adRenderStudents;
window.adRenderStudents = async function() {
  const tbody = document.getElementById('ad-students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#A7A7A7;padding:20px;font-size:.82rem">Loading...</td></tr>';
  try {
    // SCRUM-85/86: reads the accounts roster (every profile with a student
    // role), not the students table — an approved account that has never
    // booked has no students row yet and used to be completely invisible
    // here, which is why this page read "No students yet" straight after an
    // approval. Also adds assign-tutor and deactivate, neither of which
    // existed anywhere in the admin UI.
    const accounts = await adLoadAccounts(true);
    const tutorNames = adTutorAccounts(accounts).map(t => t.tutorName);
    // Reading accounts alone missed the other half: a lead assigned to a
    // tutor creates a students row but no login, so a family admin is
    // actively managing was invisible here until they signed up. Merge in
    // any students-table row with no matching account, keyed on email.
    let students = accounts.filter(a => a.role === 'student');
    try {
      const sr = await fetchWithTimeout(`${AD_BACKEND}/api/analytics?resource=students`, { headers: await adAuthHeaders() });
      const rows = await sr.json();
      const known = new Set(students.map(a => (a.email||'').toLowerCase()));
      students = students.concat(
        (Array.isArray(rows) ? rows : [])
          .filter(r => r.parent_email && !known.has(r.parent_email.toLowerCase()))
          .map(r => ({
            id: r.id, studentId: r.id, noAccount: true,
            studentName: r.student_name, parentName: r.parent_name,
            email: r.parent_email, assignedTutor: r.assigned_tutor || '',
            lessonCount: (r.bookings || []).length, createdAt: r.created_at,
          }))
      );
    } catch(e) { console.warn('students-table merge failed:', e.message); }
    if (!students.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#A7A7A7;padding:20px">No students yet</td></tr>';
      return;
    }
    tbody.innerHTML = students.map(s => {
      const name = s.studentName || s.fullName || s.email || '—';
      const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const joined = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
      const escName = name.replace(/'/g, "\\'");
      const opts = ['<option value="">— Unassigned —</option>']
        .concat(tutorNames.map(t =>
          `<option value="${t}"${t === s.assignedTutor ? ' selected' : ''}>${t}</option>`
        )).join('');
      // A lead-created student has no login yet, so the account-scoped
      // actions (edit profile, deactivate) have nothing to act on — say so
      // rather than showing buttons that would fail.
      const assignFn = s.noAccount ? 'adAssignTutorToRecord' : 'adAssignTutor';
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:9px"><div class="ad-mini-av">${initials}</div>${name}${
          s.noAccount ? ' <span class="ad-pay-status" style="background:#EFECE5;color:#718096" title="Assigned from a lead — this family hasn\'t created a login yet">No account yet</span>' : ''}</div></td>
        <td>${s.parentName||'—'}</td>
        <td style="font-size:.78rem;color:#718096">${s.email||'—'}</td>
        <td><select onchange="${assignFn}('${s.id}',this.value,this)" style="padding:4px 6px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.74rem;font-family:'Inter',sans-serif;cursor:pointer;max-width:150px">${opts}</select></td>
        <td>${s.lessonCount}</td>
        <td style="color:#718096">${joined}</td>
        <td style="white-space:nowrap">
          ${s.noAccount ? '' : `<button class="ad-btn-xs ad-btn-ghost" style="margin-right:5px" onclick="adOpenEditStudent('${s.id}','${escName}','','','')">Edit</button>`}
          ${s.studentId ? `<button class="ad-btn-xs ad-btn-ghost" style="margin-right:5px" onclick="adLogSafeguarding('${s.studentId}','${escName}')" title="Safeguarding log">🛡</button>` : ''}
          ${s.noAccount ? '' : `<button class="ad-btn-xs ad-btn-ghost" style="color:#c0392b" onclick="adDeactivateAccount('${s.id}','${escName}')">Deactivate</button>`}
        </td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:20px">Failed: ${e.message}</td></tr>`;
  }
};

// The same action for a student who has no login yet — a lead admin assigned
// before the family ever signed up. Keyed on the students row rather than an
// auth user, since there isn't one.
async function adAssignTutorToRecord(studentId, tutorName, sel) {
  const prev = sel.dataset.prev || '';
  sel.disabled = true;
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'assign-tutor', studentId, tutorName }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    sel.dataset.prev = tutorName;
    seedsToast(tutorName ? `Assigned to ${tutorName}` : 'Tutor unassigned', false);
  } catch(e) {
    sel.value = prev;
    seedsToast('Could not assign tutor: ' + e.message);
  } finally { sel.disabled = false; }
}

// SCRUM-86: assign or move a student to a tutor. profiles.assigned_tutor
// already existed but nothing in the UI ever wrote to it.
async function adAssignTutor(userId, tutorName, sel) {
  const prev = sel.dataset.prev || '';
  sel.disabled = true;
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'assign-tutor', userId, tutorName }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    sel.dataset.prev = tutorName;
    seedsToast(tutorName ? `Assigned to ${tutorName}` : 'Tutor unassigned', false);
  } catch(e) {
    sel.value = prev;
    seedsToast('Could not assign tutor: ' + e.message);
  } finally { sel.disabled = false; }
}

async function adDeactivateAccount(userId, name) {
  if (!confirm(`Deactivate ${name}?\n\nThey will no longer be able to sign in. Past bookings, payouts and records are kept.`)) return;
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'deactivate-account', userId }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    seedsToast(`${name} deactivated`, false);
    _adAccounts = null;
    adRenderStudents();
    adRenderTutorPayouts();
  } catch(e) {
    seedsToast('Could not deactivate: ' + e.message);
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "_adEditTutorId", { get: () => _adEditTutorId, set: (v) => { _adEditTutorId = v; }, configurable: true });
  window.adOpenEditTutor = adOpenEditTutor;
  window.adSaveEditTutor = adSaveEditTutor;
  window.adDeactivateTutor = adDeactivateTutor;
  window.adOpenEditCalLinks = adOpenEditCalLinks;
  window.adSaveCalLinks = adSaveCalLinks;
  window.adPaintPayoutCycleButtons = adPaintPayoutCycleButtons;
  window.adLoadPayoutCycles = adLoadPayoutCycles;
  window.adSetPayoutCycle = adSetPayoutCycle;
  Object.defineProperty(window, "_adEditStudentId", { get: () => _adEditStudentId, set: (v) => { _adEditStudentId = v; }, configurable: true });
  window.adOpenEditStudent = adOpenEditStudent;
  window.adSaveEditStudent = adSaveEditStudent;
  window.adConfirmBulkCancel = adConfirmBulkCancel;
  window.adSendAnnouncement = adSendAnnouncement;
  window.spDownloadInvoice = spDownloadInvoice;
  window.adDownloadInvoice = adDownloadInvoice;
  window.earnDownloadTaxStatement = earnDownloadTaxStatement;
  window.bkShowCancellationPolicy = bkShowCancellationPolicy;
  window.spOpenInPortalBookingRecurring = spOpenInPortalBookingRecurring;
  window._origSpSubmit = _origSpSubmit;
  window._origAdRenderTutorPayouts = _origAdRenderTutorPayouts;
  window.adShowBulkActions = adShowBulkActions;
  window._origShowAdPanelBulk = _origShowAdPanelBulk;
  window.earnAddTaxButton = earnAddTaxButton;
  window._origEarnRenderAll = _origEarnRenderAll;
  Object.defineProperty(window, "_spCustomerId", { get: () => _spCustomerId, set: (v) => { _spCustomerId = v; }, configurable: true });
  window.spBatchPeriodLabel = spBatchPeriodLabel;
  window.SP_PAYMENT_STATUS_LABEL = SP_PAYMENT_STATUS_LABEL;
  window.spRenderLessonHistory = spRenderLessonHistory;
  window.spRenderBillingCycleButtons = spRenderBillingCycleButtons;
  window.spLoadBillingCycle = spLoadBillingCycle;
  window.spSetBillingCycle = spSetBillingCycle;
  window.spLoadSavedCards = spLoadSavedCards;
  Object.defineProperty(window, "_spAddCardElement", { get: () => _spAddCardElement, set: (v) => { _spAddCardElement = v; }, configurable: true });
  window.spOpenAddCard = spOpenAddCard;
  window.spSubmitAddCard = spSubmitAddCard;
  window.spRemoveCard = spRemoveCard;
  window.spOpenBillingPortal = spOpenBillingPortal;
  window._origAdRenderStudents = _origAdRenderStudents;
  window.adAssignTutorToRecord = adAssignTutorToRecord;
  window.adAssignTutor = adAssignTutor;
  window.adDeactivateAccount = adDeactivateAccount;
}
