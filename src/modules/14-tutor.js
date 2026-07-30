// Extracted from index.html by the SCRUM-32 migration (block 14).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── TUTOR: RESOURCES (SCRUM-25, descoped to a pasted link) ────────────────
async function tpLoadResourceStudents() {
  const sel = document.getElementById('tp-res-student');
  if (!sel || sel.dataset.loaded) return;
  try {
    const r = await fetchWithTimeout(SP_BACKEND + '/api/analytics?resource=students', { headers: await seedsAuthHeaders() });
    const students = await r.json();
    const mine = students.filter(tpIsMyStudent);
    mine.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.student_name;
      sel.appendChild(opt);
    });
    sel.dataset.loaded = '1';
  } catch(e) { /* non-fatal — "All my students" still works */ }
}

async function tpLoadResources() {
  const grid = document.getElementById('tp-resource-grid');
  await tpLoadResourceStudents();
  grid.innerHTML = '<div style="color:#A7A7A7;font-size:.85rem;padding:20px;text-align:center">Loading…</div>';
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=materials&tutorName=${encodeURIComponent(earnCurrentTutor)}`, { headers: await seedsAuthHeaders() });
    const items = await r.json();
    if (!r.ok) throw new Error(items.error || 'Failed to load');
    if (!items.length) {
      grid.innerHTML = '<div style="color:#A7A7A7;font-size:.85rem;padding:20px;text-align:center">No resources shared yet.</div>';
      return;
    }
    grid.innerHTML = items.map(it => `
      <div class="tp-resource-card">
        <div class="tp-resource-icon">🔗</div>
        <a href="${escapeHtml(it.url)}" target="_blank" rel="noopener" class="tp-resource-name" style="text-decoration:none;color:inherit">${escapeHtml(it.title)}</a>
        <div class="tp-resource-meta">${it.subject ? escapeHtml(it.subject) + ' · ' : ''}${it.type === 'recording' ? 'Recording' : (it.student_id ? 'One student' : 'All students')}</div>
        <button onclick="tpDeleteResource('${it.id}')" style="margin-top:8px;background:none;border:none;color:#c0392b;font-size:.72rem;cursor:pointer;padding:0">Remove</button>
      </div>`).join('');
  } catch(e) {
    grid.innerHTML = `<div style="color:#c0392b;font-size:.85rem;padding:20px;text-align:center">${escapeHtml(e.message)}</div>`;
  }
}

async function tpAddResource() {
  const errEl = document.getElementById('tp-res-error');
  errEl.style.display = 'none';
  const studentId = document.getElementById('tp-res-student').value;
  const subject = document.getElementById('tp-res-subject').value.trim();
  const title = document.getElementById('tp-res-title').value.trim();
  const url = document.getElementById('tp-res-url').value.trim();
  if (!title || !url) {
    errEl.textContent = 'Please add a title and a link.';
    errEl.style.display = 'block';
    return;
  }
  try {
    const r = await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=materials`, {
      method: 'POST', headers: await seedsAuthHeaders(),
      body: JSON.stringify({ tutorName: earnCurrentTutor, studentId: studentId || undefined, subject: subject || undefined, title, url }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to add resource');
    document.getElementById('tp-res-subject').value = '';
    document.getElementById('tp-res-title').value = '';
    document.getElementById('tp-res-url').value = '';
    seedsToast('✓ Resource added', false);
    tpLoadResources();
  } catch(e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

async function tpDeleteResource(id) {
  if (!confirm('Remove this resource?')) return;
  try {
    await fetchWithTimeout(`${SP_BACKEND}/api/lifecycle?resource=materials&id=${id}&tutorName=${encodeURIComponent(earnCurrentTutor)}`, {
      method: 'DELETE', headers: await seedsAuthHeaders(),
    });
    tpLoadResources();
  } catch(e) { seedsToast('Failed to remove: ' + e.message); }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.tpLoadResourceStudents = tpLoadResourceStudents;
  window.tpLoadResources = tpLoadResources;
  window.tpAddResource = tpAddResource;
  window.tpDeleteResource = tpDeleteResource;
}
