// Extracted from index.html by the SCRUM-32 migration (block 20).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ TUTOR PROFILE EDITING ═════════════════════════════════════════════════
async function tpOpenProfile() {
  document.getElementById('tp-profile-error').style.display = 'none';
  document.getElementById('tp-prof-success').style.display = 'none';
  document.getElementById('tp-prof-btn').disabled = false;
  document.getElementById('tp-prof-btn').textContent = 'Save profile →';
  // Pre-fill with current name
  document.getElementById('tp-prof-name').value = earnCurrentTutor || '';
  document.getElementById('tp-profile-modal').classList.add('open');
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const { data: p } = await sbClient.from('profiles').select('whatsapp_number,whatsapp_opted_in').eq('id', session.user.id).maybeSingle();
    if (p) {
      const wn = document.getElementById('tp-prof-whatsapp');
      if (wn) wn.value = p.whatsapp_number || '';
      const wo = document.getElementById('tp-prof-whatsapp-optin');
      if (wo) wo.checked = !!p.whatsapp_opted_in;
    }
  } catch(e) { /* non-fatal — fields just stay blank */ }
}

async function tpSaveProfile() {
  const btn = document.getElementById('tp-prof-btn');
  const errEl = document.getElementById('tp-profile-error');
  const tutorName = document.getElementById('tp-prof-name').value.trim();
  const subjects = document.getElementById('tp-prof-subjects').value.trim();
  const bio = document.getElementById('tp-prof-bio').value.trim();
  const whatsappNumber = document.getElementById('tp-prof-whatsapp')?.value?.trim() || '';
  const whatsappOptedIn = document.getElementById('tp-prof-whatsapp-optin')?.checked || false;
  if (!tutorName) { errEl.textContent='Display name is required'; errEl.style.display='block'; return; }
  btn.disabled=true; btn.textContent='Saving…'; errEl.style.display='none';
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) throw new Error('Not logged in');
    await sbClient.from('profiles').update({
      tutor_name: tutorName,
      ...(subjects ? { subjects } : {}),
      ...(bio ? { bio } : {}),
      whatsapp_number: whatsappNumber || null,
      whatsapp_opted_in: whatsappOptedIn && !!whatsappNumber,
    }).eq('id', session.user.id);
    document.getElementById('tp-prof-success').style.display='block';
    btn.textContent='Saved ✓';
    seedsToast('✓ Profile updated', false);
  } catch(e) {
    errEl.textContent=e.message; errEl.style.display='block';
    btn.disabled=false; btn.textContent='Save profile →';
  }
}

// ══ PWA MANIFEST (add to home screen) ═══════════════════════════════════
(function() {
  // Dynamic manifest
  const manifest = {
    name: 'Seeds Tuition',
    short_name: 'Seeds',
    description: 'GCSE & A-Level tuition platform',
    start_url: window.location.pathname,
    display: 'standalone',
    background_color: '#0D1B2A',
    theme_color: '#0D1B2A',
    icons: [
      { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230D1B2A"/><text y="72" font-size="60" text-anchor="middle" x="50">🌱</text></svg>', sizes: '192x192', type: 'image/svg+xml' },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = url;
  document.head.appendChild(link);

  // Apple touch meta tags
  const metaTheme = document.createElement('meta');
  metaTheme.name = 'theme-color';
  metaTheme.content = '#0D1B2A';
  document.head.appendChild(metaTheme);

  const metaApple = document.createElement('meta');
  metaApple.name = 'apple-mobile-web-app-capable';
  metaApple.content = 'yes';
  document.head.appendChild(metaApple);

  const metaAppleTitle = document.createElement('meta');
  metaAppleTitle.name = 'apple-mobile-web-app-title';
  metaAppleTitle.content = 'Seeds';
  document.head.appendChild(metaAppleTitle);
})();

// ══ TUTOR PROFILE BUTTON IN NAV ══════════════════════════════════════════
// Add profile edit to tutor sidebar after portal opens
const _origTpOpen = window._openTutorPortal;
if (typeof _openTutorPortal !== 'undefined') {
  window._openTutorPortal = function() {
    _origTpOpen && _origTpOpen();
    setTimeout(() => {
      const sidebar = document.querySelector('.tp-sidebar');
      if (!sidebar || document.getElementById('tp-edit-profile-btn')) return;
      const btn = document.createElement('div');
      btn.id = 'tp-edit-profile-btn';
      btn.className = 'tp-nav-item';
      btn.textContent = '👤  Edit profile';
      btn.style.marginTop = 'auto';
      btn.onclick = tpOpenProfile;
      sidebar.appendChild(btn);
    }, 300);
  };
}

// ══ SAFEGUARDING LOG (admin student detail) ═══════════════════════════════
async function adLogSafeguarding(studentId, studentName) {
  const note = prompt(`Safeguarding note for ${studentName}:
(This will be timestamped and stored securely)`);
  if (!note || !note.trim()) return;
  // Store as a lead note or lifecycle note
  fetchWithTimeout(AD_BACKEND + '/api/lifecycle?resource=notes', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
    body: JSON.stringify({
      studentId, tutorName: 'Admin (Safeguarding)', subject: 'SAFEGUARDING',
      note: '[SAFEGUARDING] ' + note.trim(),
    }),
  }).then(r => {
    if (r.ok) seedsToast('✓ Safeguarding note logged securely', false);
    else seedsToast('Failed to log note');
  }).catch(e => seedsToast('Error: ' + e.message));
}

// ══ BOOKING FILTER HELPER (wire to existing adRenderBookings) ════════════
// adFilterBookings and adClearBookingFilters already defined above in main code

// ══ FINAL POLISH: Show tutor name in portal header ════════════════════════
function tpUpdateHeader(tutorName) {
  const el = document.querySelector('.tp-topbar-title') || document.querySelector('.tp-topbar h1');
  if (el && tutorName) el.textContent = tutorName;
}

// Wire to tutor portal load
const _origTpSwitcherSet = window.tpSwitcherSet;
if (typeof earnCurrentTutor !== 'undefined') {
  // Will be called when tutor logs in — add to existing hook
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.tpOpenProfile = tpOpenProfile;
  window.tpSaveProfile = tpSaveProfile;
  window._origTpOpen = _origTpOpen;
  window.adLogSafeguarding = adLogSafeguarding;
  window.tpUpdateHeader = tpUpdateHeader;
  window._origTpSwitcherSet = _origTpSwitcherSet;
}
