// Extracted from index.html by the SCRUM-32 migration (block 13).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

let _tpAlStudents = [];
let _tpAlStartTimeISO = null;
let _tpAlCalLoadedFor = null;
async function tpOpenAddLesson() {
  document.getElementById('tp-al-error').style.display = 'none';
  document.getElementById('tp-al-success').style.display = 'none';
  document.getElementById('tp-al-subject').value = '';
  document.getElementById('tp-al-btn').disabled = true;
  document.getElementById('tp-al-btn').textContent = 'Add to calendar';
  _tpAlStartTimeISO = null;
  _tpAlCalLoadedFor = null;
  document.getElementById('tp-al-time-chosen').style.display = 'none';
  document.getElementById('tp-add-lesson-modal').classList.add('open');
  tpLoadAlCal();
  // Load this tutor's students
  const sel = document.getElementById('tp-al-student');
  sel.innerHTML = '<option value="">Loading...</option>';
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/analytics?resource=students', { headers: await seedsAuthHeaders() });
    const students = await r.json();
    _tpAlStudents = students.filter(tpIsMyStudent);
    if (!_tpAlStudents.length) {
      // Show all students if none matched yet (new tutor)
      _tpAlStudents = students;
    }
    sel.innerHTML = '<option value="">Select a student...</option>' +
      _tpAlStudents.map(s => '<option value="'+s.id+'">'+s.student_name+'</option>').join('');
  } catch(e) {
    sel.innerHTML = '<option value="">Failed to load</option>';
  }
}

// Real availability via the tutor's own Cal.com account, same pattern as
// the public wizard and the student portal's booking modal — previously
// this was a raw datetime-local input the tutor could set to literally
// anything, with no check against their own real schedule.
async function tpLoadAlCal() {
  const lessonType = document.getElementById('tp-al-type').value;
  const statusEl = document.getElementById('tp-al-cal-status');
  const wrapEl = document.getElementById('tp-al-cal-wrap');
  const embedEl = document.getElementById('tp-al-cal-embed');
  const cacheKey = earnCurrentTutor + '|' + lessonType;
  if (_tpAlCalLoadedFor === cacheKey) return;
  _tpAlStartTimeISO = null;
  document.getElementById('tp-al-time-chosen').style.display = 'none';
  tpAlValidate();
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading your availability…';
  wrapEl.style.display = 'none';
  embedEl.src = 'about:blank';
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/bookings?action=scheduling-link&tutorName=' + encodeURIComponent(earnCurrentTutor) + '&lessonType=' + encodeURIComponent(lessonType));
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Could not load your availability');
    _tpAlCalLoadedFor = cacheKey;
    statusEl.style.display = 'none';
    wrapEl.style.display = 'block';
    embedEl.src = data.url + (data.url.includes('?') ? '&' : '?') + 'embed=true';
  } catch(e) {
    statusEl.textContent = e.message || "We couldn't load your real-time availability. Please email hello@seedsinstitute.co.uk to arrange this instead.";
  }
}

window.addEventListener('message', async (e) => {
  const booking = calParseBookingSuccess(e.data);
  if (!booking) return;
  const modalOpen = document.getElementById('tp-add-lesson-modal')?.classList.contains('open');
  if (!modalOpen) return;

  const statusEl = document.getElementById('tp-al-cal-status');
  const chosenEl = document.getElementById('tp-al-time-chosen');
  document.getElementById('tp-al-cal-wrap').style.display = 'none';
  _tpAlStartTimeISO = booking.startTime;
  const d = new Date(booking.startTime);
  statusEl.style.display = 'none';
  chosenEl.style.display = 'block';
  chosenEl.textContent = '✓ ' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  tpAlValidate();
});

function tpAlValidate() {
  const s = document.getElementById('tp-al-student').value;
  document.getElementById('tp-al-btn').disabled = !(s && _tpAlStartTimeISO);
}
async function tpCreateLesson() {
  const btn = document.getElementById('tp-al-btn');
  const errEl = document.getElementById('tp-al-error');
  const studentId = document.getElementById('tp-al-student').value;
  const subject = document.getElementById('tp-al-subject').value.trim();
  const lessonType = document.getElementById('tp-al-type').value;
  const startTime = _tpAlStartTimeISO;
  const weeks = parseInt(document.getElementById('tp-al-weeks').value);
  if (!subject) { errEl.textContent = 'Please enter a subject'; errEl.style.display = 'block'; return; }
  if (!startTime) { errEl.textContent = 'Please pick a time in the calendar above'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Adding...'; errEl.style.display = 'none';
  try {
    const _tpAlAuthH = await seedsAuthHeaders();
    const r = await fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=lessons', {
      method: 'POST', headers: _tpAlAuthH,
      body: JSON.stringify({
        studentId, tutorName: earnCurrentTutor, subject,
        lessonType, startTime: new Date(startTime).toISOString(), recurringWeeks: weeks,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    // No per-lesson charge — this lesson is billed automatically on the
    // family's next billing date, together with everything else they've
    // had since their last bill.
    const payMsg = lessonType === 'trial' ? ' Free lesson.' : ' It\'ll be included in the family\'s next billing cycle.';

    const succEl = document.getElementById('tp-al-success');
    succEl.textContent = '\u2713 ' + data.created + ' lesson(s) added.' + payMsg;
    succEl.style.display = 'block';
    btn.textContent = 'Done';
    if (typeof tpLoadSchedule === 'function') tpLoadSchedule();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Add to calendar';
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "_tpAlStudents", { get: () => _tpAlStudents, set: (v) => { _tpAlStudents = v; }, configurable: true });
  Object.defineProperty(window, "_tpAlStartTimeISO", { get: () => _tpAlStartTimeISO, set: (v) => { _tpAlStartTimeISO = v; }, configurable: true });
  Object.defineProperty(window, "_tpAlCalLoadedFor", { get: () => _tpAlCalLoadedFor, set: (v) => { _tpAlCalLoadedFor = v; }, configurable: true });
  window.tpOpenAddLesson = tpOpenAddLesson;
  window.tpLoadAlCal = tpLoadAlCal;
  window.tpAlValidate = tpAlValidate;
  window.tpCreateLesson = tpCreateLesson;
}
