// Extracted from index.html by the SCRUM-32 migration (block 6).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── Config ─────────────────────────────────────────────────────────────────
const BACKEND = 'https://seeds-backend-six.vercel.app';

// ── Cal.com real-availability embeds ────────────────────────────────────────
// Each tutor has their own individual Cal.com account (unlimited free event
// types), unlike the single shared Calendly account this replaces (its free
// plan only allowed one active event type account-wide, which broke every
// tutor's booking twice). Embedded as a plain iframe of the tutor's own
// public booking URL — not Cal.com's JS embed SDK, which binds one single
// "init" origin for the whole page and would be a poor fit here since
// different tutors' own individual accounts aren't guaranteed to share one
// Cal.com domain (e.g. cal.com vs. cal.eu). A plain iframe has no such
// binding: it just loads whichever tutor's URL the backend returns.
//
// Not independently verified against a live Cal.com account in this
// environment (no live embed available here) — written to Cal.com's
// documented postMessage shape for a successful booking. Verify on first
// real use; if the shape has changed, this returns null and the caller
// shows a graceful "we'll be in touch" message instead of hanging on a
// booking that actually went through on Cal.com's own calendar.
function calParseBookingSuccess(eventData) {
  if (!eventData || typeof eventData !== 'object') return null;
  const type = eventData.type || (eventData.data && eventData.data.type);
  if (typeof type !== 'string' || !/bookingSuccessful/i.test(type)) return null;
  const data = eventData.data || eventData;
  const booking = data.booking || data;
  const startTime = booking.startTime || booking.start_time;
  const endTime = booking.endTime || booking.end_time;
  if (!startTime) return null;
  return { startTime, endTime };
}
const STRIPE_PK = 'pk_test_51JCVAfK7JOHHGmfJ3soySmouzVwdHLSPwFZKKz7ZsHmrpN8A9x9to207NqshfThICO0QOQKSmQhAO02n2wZ3fnZa00DGO1eals';

// ── State ───────────────────────────────────────────────────────────────────
const bkState = {
  tutor: 'Azeem Omar-Mufti', subject: 'Mathematics',
  type: 'trial', typeLabel: 'Initial Consultation', price: 0,
  // Real slot chosen inside the embedded Cal.com booking page (step 2) — day/time
  // are just display strings derived from this once a slot is picked.
  startTimeISO: null, day: '', time: '',
  customerId: null, paymentMethodId: null,
};

// ── Stripe setup ────────────────────────────────────────────────────────────
// Shared Stripe.js instance — the public wizard no longer collects a card at
// all (only a free trial/consultation can be booked here; paid lessons are
// billed automatically through the portal), but the student portal's own
// "Add card" flow (spOpenAddCard, further down) still needs a live
// Stripe instance, so this stays.
let stripeInstance;
function initStripe() {
  if (stripeInstance) return;
  if (typeof Stripe === 'undefined') { console.error('Stripe.js not loaded'); return; }
  stripeInstance = Stripe(STRIPE_PK);
}

// ── Modal open/close ────────────────────────────────────────────────────────
function openBooking(tutorName, subject) {
  if (tutorName) { bkState.tutor = tutorName; bkState.subject = subject; }
  // Clear any previously-picked slot so a fresh attempt never inherits one
  // from an earlier booking in the same page session.
  bkState.startTimeISO = null; bkState.day = ''; bkState.time = '';
  _bkCalLoadedFor = null;
  document.getElementById('bk-overlay').classList.add('bk-open');
  document.body.style.overflow = 'hidden';
  bkGoStep(1);
}
function closeBooking() {
  document.getElementById('bk-overlay').classList.remove('bk-open');
  document.body.style.overflow = '';
}

// ── Step navigation ─────────────────────────────────────────────────────────
const bkTitles = { 1: 'Choose your tutor', 2: 'Pick a date & time', 3: 'Your details', 4: 'Review & confirm' };
function bkGoStep(n) {
  document.querySelectorAll('.bk-panel').forEach(p => p.classList.remove('bk-panel-active'));
  document.getElementById('bk-step-' + n).classList.add('bk-panel-active');
  document.getElementById('bk-eyebrow').textContent = 'Step ' + n + ' of 4';
  document.getElementById('bk-title-text').textContent = bkTitles[n];
  for (let i = 1; i <= 4; i++) {
    document.getElementById('bk-seg-' + i).classList.toggle('bk-seg-active', i <= n);
  }
  if (n === 2) loadCalWidget();
  if (n === 4) updateBookingSummary();
  document.querySelector('.bk-modal').scrollTop = 0;
}

// ── Selector helpers ────────────────────────────────────────────────────────
function selectTutor(el, name, subject) {
  document.querySelectorAll('.bk-tutor-opt').forEach(o => o.classList.remove('bk-selected'));
  el.classList.add('bk-selected');
  bkState.tutor = name; bkState.subject = subject;
}
function selectType(el, type, price) {
  document.querySelectorAll('.bk-type-card').forEach(o => o.classList.remove('bk-selected'));
  el.classList.add('bk-selected');
  bkState.type = type; bkState.price = price;
  bkState.typeLabel = el.querySelector('.bk-type-name').childNodes[0].textContent.trim();
}

// ── Cal.com embed (step 2) — real per-tutor availability ────────────────────
// Cache key includes lessonType alongside tutor — a trial/consultation and a
// regular paid lesson are different Cal.com event types, so switching lesson
// type for the same tutor (going back to step 1) must reload the embed too.
let _bkCalLoadedFor = null;
async function loadCalWidget() {
  const statusEl = document.getElementById('bk-cal-status');
  const wrapEl = document.getElementById('bk-cal-wrap');
  const embedEl = document.getElementById('bk-cal-embed');
  const cacheKey = bkState.tutor + '|' + bkState.type;
  if (_bkCalLoadedFor === cacheKey) return; // already loaded for this tutor + lesson type
  statusEl.style.display = 'block';
  statusEl.textContent = "Loading " + bkState.tutor + "'s availability…";
  wrapEl.style.display = 'none';
  embedEl.src = 'about:blank';
  try {
    // context=consultation — this wizard only ever books the free 15-min
    // Initial Consultation, never the (longer) free trial lesson itself,
    // which is booked separately from the portal afterwards.
    const r = await fetchWithTimeout(`${BACKEND}/api/bookings?action=scheduling-link&tutorName=${encodeURIComponent(bkState.tutor)}&lessonType=${encodeURIComponent(bkState.type)}&context=consultation`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Could not load availability');
    _bkCalLoadedFor = cacheKey;
    statusEl.style.display = 'none';
    wrapEl.style.display = 'block';
    // ?embed=true renders Cal.com's own iframe-friendly layout (no site
    // chrome around the booking calendar).
    embedEl.src = data.url + (data.url.includes('?') ? '&' : '?') + 'embed=true';
  } catch(e) {
    statusEl.textContent = e.message || "We couldn't load real-time availability for this tutor. Please email hello@seedsinstitute.co.uk to arrange a time.";
  }
}

// Cal.com's embedded booking page posts a window message once a visitor
// finishes scheduling — see calParseBookingSuccess above for the (best-
// effort, unverified-live) payload shape this expects.
//
// More than one Cal.com embed can exist on this page (this public wizard,
// plus the logged-in student portal's own "Book a lesson" modal) — only one
// modal is ever actually open at a time, so route the event to whichever
// one is currently visible rather than assuming it's always this wizard.
window.addEventListener('message', async (e) => {
  const booking = calParseBookingSuccess(e.data);
  if (!booking) return;

  const wizardOpen = document.getElementById('bk-overlay')?.classList.contains('bk-open');
  if (!wizardOpen) return; // some other embed's event — its own listener handles it

  bkState.startTimeISO = booking.startTime;
  const d = new Date(booking.startTime);
  bkState.day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  bkState.time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  bkGoStep(3);
});
// ── Step 4 summary ──────────────────────────────────────────────────────────
function updateBookingSummary() {
  document.getElementById('bk-sum-tutor').textContent = bkState.tutor;
  document.getElementById('bk-sum-type').textContent = bkState.typeLabel;
  document.getElementById('bk-sum-time').textContent = bkState.day + ' · ' + bkState.time;
  const studentName = document.getElementById('bk-student-name').value || 'Student';
  document.getElementById('bk-sum-student').textContent = studentName;
  document.getElementById('bk-sum-price').textContent = 'Free';
}

// ── UI helpers ──────────────────────────────────────────────────────────────
function bkSetLoading(loading, label) {
  const btn = document.getElementById('bk-free-btn');
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? (label || '…') : 'Confirm Free Consultation →';
}
function bkShowError(msg) {
  const err = document.getElementById('bk-step4-error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
  else { alert(msg); }
}
function bkShowSuccess() {
  document.getElementById('bk-final-tutor').textContent = bkState.tutor;
  document.getElementById('bk-final-time').textContent = bkState.day + ' · ' + bkState.time;
  document.getElementById('bk-final-type').textContent = bkState.typeLabel;
  document.querySelectorAll('.bk-panel').forEach(p => p.classList.remove('bk-panel-active'));
  document.getElementById('bk-step-success').classList.add('bk-panel-active');
  document.getElementById('bk-eyebrow').textContent = 'Confirmed';
  document.getElementById('bk-title-text').textContent = '';
  document.querySelectorAll('.bk-step-seg').forEach(s => s.classList.add('bk-seg-active'));
}

// ── Build a JS Date from the selected day/time strings ───────────────────────
function buildStartTime() {
  // The real slot the visitor picked inside the embedded Cal.com booking page
  // (step 2) — resolved server-side from the postMessage's event URI.
  return bkState.startTimeISO ? new Date(bkState.startTimeISO) : null;
}

// ── Step 3 validation — student name, parent name, and a valid email are
// mandatory (we can't confirm a booking or send a calendar invite without
// them). Shows the error inline on step 3 itself, rather than setting it on
// a different step's hidden element, which is what silently swallowed this
// error before: a user with a blank/invalid email would click Confirm on
// step 4, get bounced back to step 3, and see no visible feedback at all.
function bkValidateStep3() {
  const errEl = document.getElementById('bk-step3-error');
  const studentName = document.getElementById('bk-student-name').value.trim();
  const parentName  = document.getElementById('bk-parent-name').value.trim();
  const email       = document.getElementById('bk-email').value.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!studentName || !parentName || !email) {
    errEl.textContent = 'Please fill in the student\'s name, your name, and your email address — these are required to confirm the booking.';
    errEl.style.display = 'block';
    return false;
  }
  if (!emailLooksValid) {
    errEl.textContent = 'That email address doesn\'t look right — please double-check it.';
    errEl.style.display = 'block';
    return false;
  }
  errEl.style.display = 'none';
  return true;
}
function bkStep3Continue() {
  if (!bkValidateStep3()) return;
  bkGoStep(4);
}

// ── Main booking flow ───────────────────────────────────────────────────────
async function completeBooking() {
  const parentEmail = document.getElementById('bk-email').value.trim();
  const parentName  = document.getElementById('bk-parent-name').value.trim();
  const parentPhone = document.getElementById('bk-phone').value.trim();
  const studentName = document.getElementById('bk-student-name').value.trim();

  // Defence in depth — step 3 already gates on this, so in normal use this
  // should never trigger, but don't let a booking through without it.
  if (!bkValidateStep3()) {
    bkGoStep(3);
    return;
  }

  const startTime = buildStartTime();
  if (!startTime) {
    bkShowError('Something went wrong finding your chosen time — please go back and pick a slot again.');
    bkGoStep(2);
    return;
  }

  // The public wizard only ever books a free trial/consultation — no
  // payment, just send confirmation. Paid lessons are booked (and billed
  // automatically on the family's own weekly/monthly cycle) through the
  // Student Portal once they're enrolled, not here.
  bkSetLoading(true, 'Confirming…');
  try {
    const res = await fetchWithTimeout(`${BACKEND}/api/bookings?action=confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName, parentName, parentEmail, parentPhone,
        tutorName: bkState.tutor, subject: bkState.subject,
        lessonType: 'consultation', studentLevel: null,
        startTime: startTime.toISOString(), paymentIntentId: null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        bkShowError(data.error + ' Please go back and choose a different time.');
        bkGoStep(2);
        return;
      }
      throw new Error(data.error || 'Booking failed');
    }
    bkShowSuccess();
  } catch (err) {
    bkShowError(err.message);
  } finally {
    bkSetLoading(false);
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.BACKEND = BACKEND;
  window.calParseBookingSuccess = calParseBookingSuccess;
  window.STRIPE_PK = STRIPE_PK;
  window.bkState = bkState;
  Object.defineProperty(window, "stripeInstance", { get: () => stripeInstance, set: (v) => { stripeInstance = v; }, configurable: true });
  window.initStripe = initStripe;
  window.openBooking = openBooking;
  window.closeBooking = closeBooking;
  window.bkTitles = bkTitles;
  window.bkGoStep = bkGoStep;
  window.selectTutor = selectTutor;
  window.selectType = selectType;
  Object.defineProperty(window, "_bkCalLoadedFor", { get: () => _bkCalLoadedFor, set: (v) => { _bkCalLoadedFor = v; }, configurable: true });
  window.loadCalWidget = loadCalWidget;
  window.updateBookingSummary = updateBookingSummary;
  window.bkSetLoading = bkSetLoading;
  window.bkShowError = bkShowError;
  window.bkShowSuccess = bkShowSuccess;
  window.buildStartTime = buildStartTime;
  window.bkValidateStep3 = bkValidateStep3;
  window.bkStep3Continue = bkStep3Continue;
  window.completeBooking = completeBooking;
}
