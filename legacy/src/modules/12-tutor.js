// Extracted from index.html by the SCRUM-32 migration (block 12).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── TUTOR: PROPOSE SLOTS ─────────────────────────────────────────────────
let _tpProposeLead = null;

function tpOpenProposeSlots(leadId, studentName, subject) {
  _tpProposeLead = { id: leadId, studentName, subject };
  document.getElementById('tp-propose-desc').textContent =
    'Pick up to 3 times for ' + studentName + ' (' + subject + '). They will choose one and a booking will be created.';
  ['tp-slot-1','tp-slot-2','tp-slot-3'].forEach(function(id){ document.getElementById(id).value = ''; });
  document.getElementById('tp-propose-error').style.display = 'none';
  document.getElementById('tp-propose-success').style.display = 'none';
  document.getElementById('tp-propose-btn').disabled = false;
  document.getElementById('tp-propose-btn').textContent = 'Send times to student';
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(16,0,0,0);
  document.getElementById('tp-slot-1').value = tomorrow.toISOString().slice(0,16);
  document.getElementById('tp-propose-modal').classList.add('open');
}

async function tpSubmitSlots() {
  if (!_tpProposeLead) return;
  var slots = ['tp-slot-1','tp-slot-2','tp-slot-3']
    .map(function(id){ return document.getElementById(id).value; })
    .filter(Boolean);
  var errEl = document.getElementById('tp-propose-error');
  if (!slots.length) {
    errEl.textContent = 'Please add at least one time slot.';
    errEl.style.display = 'block';
    return;
  }
  var btn = document.getElementById('tp-propose-btn');
  btn.disabled = true; btn.textContent = 'Sending...';
  errEl.style.display = 'none';
  try {
    var r = await fetchWithTimeout(SP_BACKEND + '/api/leads', {
      method: 'PATCH',
      headers: await seedsAuthHeaders(),
      body: JSON.stringify({
        id: _tpProposeLead.id,
        status: 'confirmed',
        notes: JSON.stringify({ proposedSlots: slots, tutorName: earnCurrentTutor }),
        portalUrl: window.location.origin + window.location.pathname,
      }),
    });
    if (!r.ok) throw new Error('Failed to save slots');
    document.getElementById('tp-propose-success').style.display = 'block';
    btn.textContent = 'Sent';
    if (typeof tpLoadSchedule === 'function') tpLoadSchedule();
  } catch(e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Send times to student';
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  Object.defineProperty(window, "_tpProposeLead", { get: () => _tpProposeLead, set: (v) => { _tpProposeLead = v; }, configurable: true });
  window.tpOpenProposeSlots = tpOpenProposeSlots;
  window.tpSubmitSlots = tpSubmitSlots;
}
