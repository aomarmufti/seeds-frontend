// Extracted from index.html by the SCRUM-32 migration (block 7).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── ADMIN: APPROVE PENDING SIGNUP AS TUTOR ────────────────────────────────
let _adApproveTutorUserId = null;
function adOpenApproveTutor(userId, suggestedName) {
  _adApproveTutorUserId = userId;
  document.getElementById('ad-at-tutorname').value = suggestedName || '';
  document.getElementById('ad-at-subjects').value = '';
  document.getElementById('ad-at-error').style.display = 'none';
  document.getElementById('ad-at-success').style.display = 'none';
  document.getElementById('ad-at-btn').disabled = false;
  document.getElementById('ad-at-btn').textContent = 'Approve as tutor →';
  document.getElementById('ad-approve-tutor-modal').classList.add('open');
}
async function adSubmitApproveTutor() {
  const tutorName = document.getElementById('ad-at-tutorname').value.trim();
  const subjects = document.getElementById('ad-at-subjects').value.trim();
  const errEl = document.getElementById('ad-at-error');
  if (!tutorName) { errEl.textContent = 'Please enter a display name.'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('ad-at-btn');
  btn.disabled = true; btn.textContent = 'Approving…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'approve-student', userId: _adApproveTutorUserId, role: 'tutor', tutorName, subjects }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Approval failed');
    document.getElementById('ad-at-success').style.display = 'block';
    btn.textContent = 'Approved ✓';
    await adLoadAnalytics();
    adRenderLeads();
    setTimeout(() => document.getElementById('ad-approve-tutor-modal').classList.remove('open'), 1200);
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Approve as tutor →';
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "_adApproveTutorUserId", { get: () => _adApproveTutorUserId, set: (v) => { _adApproveTutorUserId = v; }, configurable: true });
  window.adOpenApproveTutor = adOpenApproveTutor;
  window.adSubmitApproveTutor = adSubmitApproveTutor;
}
