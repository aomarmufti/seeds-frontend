// Extracted from index.html by the SCRUM-32 migration (block 9).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── ADMIN: CREATE STUDENT MODAL ──────────────────────────────────────────
function adShowCreateStudent() {
  ['ad-cs-name','ad-cs-email'].forEach(id => document.getElementById(id).value = '');
  ['ad-cs-subject','ad-cs-level','ad-cs-tutor'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ad-cs-error').style.display = 'none';
  document.getElementById('ad-cs-success').style.display = 'none';
  document.getElementById('ad-cs-btn').disabled = true;
  document.getElementById('ad-cs-btn').textContent = 'Create & send invite →';
  document.getElementById('ad-create-student-modal').classList.add('open');
}
function adHideCreateStudent() {
  document.getElementById('ad-create-student-modal').classList.remove('open');
}
function adValidateCS() {
  const name  = document.getElementById('ad-cs-name').value.trim();
  const email = document.getElementById('ad-cs-email').value.trim();
  document.getElementById('ad-cs-btn').disabled = !(name && email.includes('@'));
}
async function adCreateStudent() {
  const btn = document.getElementById('ad-cs-btn');
  const errEl = document.getElementById('ad-cs-error');
  btn.disabled = true; btn.textContent = 'Creating…';
  errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({
        action: 'create-student',
        fullName:       document.getElementById('ad-cs-name').value.trim(),
        email:          document.getElementById('ad-cs-email').value.trim(),
        subject:        document.getElementById('ad-cs-subject').value || null,
        level:          document.getElementById('ad-cs-level').value || null,
        assignedTutor:  document.getElementById('ad-cs-tutor').value || null,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    document.getElementById('ad-cs-success').style.display = 'block';
    btn.textContent = 'Done ✓';
    adRenderStudents(); // refresh students list
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Create & send invite →';
  }
}

// ── ADMIN: APPROVE PENDING STUDENT SIGNUP ────────────────────────────────
async function adApproveStudent(userId, tutorName, btn) {
  btn.disabled = true; btn.textContent = 'Approving…';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'approve-student', userId, assignedTutor: tutorName }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    // Also update the lead status
    await adLoadAnalytics();
    adRenderLeads();
    btn.textContent = 'Approved ✓'; btn.style.background = '#2D7A4F';
  } catch(e) {
    alert('Approval failed: ' + e.message);
    btn.disabled = false; btn.textContent = 'Approve';
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.adShowCreateStudent = adShowCreateStudent;
  window.adHideCreateStudent = adHideCreateStudent;
  window.adValidateCS = adValidateCS;
  window.adCreateStudent = adCreateStudent;
  window.adApproveStudent = adApproveStudent;
}
