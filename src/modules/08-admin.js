// Extracted from index.html by the SCRUM-32 migration (block 8).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── ADMIN: TUTOR INVITE ───────────────────────────────────────────────────
function adShowInviteTutor() {
  ['ad-it-name','ad-it-email','ad-it-subjects'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ad-it-error').style.display = 'none';
  document.getElementById('ad-it-success').style.display = 'none';
  document.getElementById('ad-it-btn').disabled = true;
  document.getElementById('ad-it-btn').textContent = 'Send invite link →';
  document.getElementById('ad-invite-tutor-modal').classList.add('open');
}
function adValidateIT() {
  const name  = document.getElementById('ad-it-name').value.trim();
  const email = document.getElementById('ad-it-email').value.trim();
  document.getElementById('ad-it-btn').disabled = !(name && email.includes('@'));
}
async function adSendTutorInvite() {
  const btn = document.getElementById('ad-it-btn');
  const errEl = document.getElementById('ad-it-error');
  const name     = document.getElementById('ad-it-name').value.trim();
  const email    = document.getElementById('ad-it-email').value.trim();
  const subjects = document.getElementById('ad-it-subjects').value.trim();
  btn.disabled = true; btn.textContent = 'Sending…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'invite-tutor', fullName: name, email, subjects }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    document.getElementById('ad-it-success').style.display = 'block';
    btn.textContent = 'Sent ✓';
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Send invite link →';
  }
}

// ── ADMIN: CREATE TUTOR DIRECTLY ─────────────────────────────────────────
function adShowCreateTutor() {
  ['ad-ct-name','ad-ct-email','ad-ct-tutorname','ad-ct-subjects'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ad-ct-error').style.display = 'none';
  document.getElementById('ad-ct-success').style.display = 'none';
  document.getElementById('ad-ct-btn').disabled = true;
  document.getElementById('ad-ct-btn').textContent = 'Create account & send link →';
  document.getElementById('ad-create-tutor-modal').classList.add('open');
}
function adValidateCT() {
  const name  = document.getElementById('ad-ct-name').value.trim();
  const email = document.getElementById('ad-ct-email').value.trim();
  document.getElementById('ad-ct-btn').disabled = !(name && email.includes('@'));
}
async function adCreateTutor() {
  const btn = document.getElementById('ad-ct-btn');
  const errEl = document.getElementById('ad-ct-error');
  const fullName   = document.getElementById('ad-ct-name').value.trim();
  const email      = document.getElementById('ad-ct-email').value.trim();
  const tutorName  = document.getElementById('ad-ct-tutorname').value.trim() || fullName;
  const subjects   = document.getElementById('ad-ct-subjects').value.trim();
  btn.disabled = true; btn.textContent = 'Creating…'; errEl.style.display = 'none';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'create-tutor', fullName, email, tutorName, subjects }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    document.getElementById('ad-ct-success').style.display = 'block';
    btn.textContent = 'Done ✓';
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Create account & send link →';
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.adShowInviteTutor = adShowInviteTutor;
  window.adValidateIT = adValidateIT;
  window.adSendTutorInvite = adSendTutorInvite;
  window.adShowCreateTutor = adShowCreateTutor;
  window.adValidateCT = adValidateCT;
  window.adCreateTutor = adCreateTutor;
}
