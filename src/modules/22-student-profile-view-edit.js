// Extracted from index.html by the SCRUM-32 migration (block 22).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ STUDENT PROFILE VIEW & EDIT ══════════════════════════════════════════
async function spRenderProfileView() {
  const el = document.getElementById('sp-profile-view');
  if (!el) return;
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const { data: profile } = await sbClient.from('profiles')
      .select('school_year, subjects, target_grades, onboarding_complete')
      .eq('id', session.user.id)
      .maybeSingle();
    const { data: userData } = await sbClient.auth.getUser();
    const email = userData?.user?.email || session.user.email;
    const name = profile?.full_name || email.split('@')[0];

    const targetGrades = profile?.target_grades || {};
    const targetsHtml = Object.keys(targetGrades).length
      ? Object.entries(targetGrades).map(([sub,g]) =>
          `<span style="display:inline-block;background:#FAF8F4;border:1px solid #E8E8E8;border-radius:6px;padding:3px 10px;font-size:.78rem;margin:3px">${escapeHtml(sub)}: <strong>${escapeHtml(g)}</strong></span>`
        ).join('')
      : '<span style="color:#A7A7A7;font-size:.83rem">Not set yet</span>';

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #F0EDE8">
        <div style="width:56px;height:56px;border-radius:50%;background:#0D1B2A;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:#C8A15A;flex-shrink:0">
          ${escapeHtml(name[0].toUpperCase())}
        </div>
        <div>
          <div style="font-weight:700;font-size:1.05rem;color:#0D1B2A">${escapeHtml(name)}</div>
          <div style="font-size:.8rem;color:#718096">${escapeHtml(email)}</div>
        </div>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F8F6F2">
          <span style="font-size:.82rem;color:#718096">School year</span>
          <span style="font-weight:600;font-size:.85rem;color:#0D1B2A">${profile?.school_year ? escapeHtml(profile.school_year) : '<em style="color:#A7A7A7">Not set</em>'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F8F6F2">
          <span style="font-size:.82rem;color:#718096">Subjects</span>
          <span style="font-weight:600;font-size:.85rem;color:#0D1B2A">${profile?.subjects ? escapeHtml(profile.subjects) : '<em style="color:#A7A7A7">Not set</em>'}</span>
        </div>
        <div style="padding:10px 0">
          <div style="font-size:.82rem;color:#718096;margin-bottom:8px">Target grades</div>
          <div>${targetsHtml}</div>
        </div>
      </div>`;
  } catch(e) {
    el.innerHTML = '<div style="color:#c0392b;font-size:.82rem">Failed to load profile: ' + e.message + '</div>';
  }
}

// SCRUM-55: contact card for the parent's assigned tutor — email always,
// WhatsApp only if the tutor has opted in.
async function spLoadTutorContact() {
  const el = document.getElementById('sp-tutor-contact');
  if (!el) return;
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const { data: profile } = await sbClient.from('profiles').select('assigned_tutor').eq('id', session.user.id).maybeSingle();
    const tutorName = profile?.assigned_tutor;
    if (!tutorName) {
      el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;padding:10px 0">No tutor assigned yet.</div>';
      return;
    }
    const r = await fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=contact-info&for=tutor&tutorName=' + encodeURIComponent(tutorName), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to load contact info');
    const waLink = data.whatsappNumber
      ? `<a href="https://wa.me/${data.whatsappNumber.replace(/[^\d]/g,'')}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:.78rem;font-weight:600;margin-left:8px">💬 WhatsApp</a>`
      : '';
    el.innerHTML = `
      <div style="font-weight:700;font-size:.9rem;color:#0D1B2A;margin-bottom:8px">${escapeHtml(tutorName)}</div>
      <a href="mailto:${escapeHtml(data.email||'')}" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:.78rem;font-weight:600;color:#0D1B2A;text-decoration:none">✉ Email</a>${waLink}
    `;
  } catch(e) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;padding:10px 0">Couldn\'t load tutor contact info.</div>';
  }
}

function spOpenEditProfile() {
  // Pre-fill the profile modal with existing data then open it
  sbClient.from('profiles')
    .select('school_year, subjects, target_grades')
    .eq('id', sbClient.auth.getUser().then ? '' : '')
    .maybeSingle()
    .then(() => {});

  sbClient.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;
    sbClient.from('profiles').select('school_year,subjects,target_grades,whatsapp_number,whatsapp_opted_in').eq('id',session.user.id).maybeSingle().then(({ data: p }) => {
      if (p) {
        const yr = document.getElementById('sp-profile-year');
        if (yr) yr.value = p.school_year || '';
        const si = document.getElementById('sp-profile-subjects-input');
        if (si) si.value = p.subjects || '';
        const tg = document.getElementById('sp-profile-targets');
        if (tg) tg.value = Object.entries(p.target_grades || {}).map(([k,v])=>k+': '+v).join(', ');
        const wn = document.getElementById('sp-profile-whatsapp');
        if (wn) wn.value = p.whatsapp_number || '';
        const wo = document.getElementById('sp-profile-whatsapp-optin');
        if (wo) wo.checked = !!p.whatsapp_opted_in;
      }
      document.getElementById('sp-profile-error').style.display = 'none';
      const btn = document.getElementById('sp-profile-btn');
      btn.disabled = false; btn.textContent = 'Save & continue →';
      document.getElementById('sp-profile-modal').classList.add('open');
    });
  });
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.spRenderProfileView = spRenderProfileView;
  window.spLoadTutorContact = spLoadTutorContact;
  window.spOpenEditProfile = spOpenEditProfile;
}
