// Extracted from index.html by the SCRUM-32 migration (block 3).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// NOTE (SCRUM-32): _openAdminPortal(), showAdPanel() are declared here but replaced later by
// another module assigning to window. Under the old shared global scope that
// replacement applied to this block's own calls too; as a module, a local
// declaration would shadow it. Declared as ...$base and published to window so
// every reference, here included, still resolves to the current override.

function _openAdminPortal$base(){
  document.getElementById('ad-overlay').classList.add('ad-open');
  document.body.style.overflow='hidden';
  adUpdateLeadsBadge();
}

async function adUpdateLeadsBadge() {
  const badge = document.querySelector('.ad-sidebar .ad-badge');
  if (!badge) return;
  try {
    // Count new leads + pending student signups
    const authHeaders = await adAuthHeaders();
    const [leadsR, pendingR] = await Promise.all([
      fetchWithTimeout(`${AD_BACKEND}/api/leads?status=new`, { headers: authHeaders }),
      fetchWithTimeout(`${AD_BACKEND}/api/analytics?resource=pending-profiles`, { headers: authHeaders }),
    ]);
    const newLeads = await leadsR.json();
    const pendingData = await pendingR.json();
    const pendingCount = Array.isArray(pendingData) ? pendingData.length : 0;
    const total = (Array.isArray(newLeads) ? newLeads.length : 0) + pendingCount;
    if (total > 0) {
      badge.textContent = total;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {
    badge.style.display = 'none';
  }
}
function closeAdmin(){
  document.getElementById('ad-overlay').classList.remove('ad-open');
  document.body.style.overflow='';
  routeClear();
}
function showAdPanel$base(id, navEl){
  routeSet('admin', id);
  document.querySelectorAll('.ad-panel').forEach(p=>p.classList.remove('ad-active'));
  document.getElementById(id).classList.add('ad-active');
  document.querySelectorAll('.ad-nav-item').forEach(n=>n.classList.remove('ad-active-nav'));
  if(navEl) navEl.classList.add('ad-active-nav');
  else {
    const map={'ad-home':0,'ad-leads':1,'ad-bookings':2,'ad-tutors':3,'ad-students':4,'ad-payments':5};
    const items=document.querySelectorAll('.ad-nav-item');
    if(map[id]!==undefined && items[map[id]]) items[map[id]].classList.add('ad-active-nav');
  }
}
function assignTutor(btn, tutorName){
  const row = btn.closest('tr');
  const statusCell = row.children[4];
  statusCell.innerHTML = '<span class="ad-status-pill ad-status-assigned">Assigned — '+tutorName+'</span>';
  btn.parentElement.innerHTML = '<button class="ad-btn-xs ad-btn-view">View</button>';
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window._openAdminPortal = _openAdminPortal$base;
  window.adUpdateLeadsBadge = adUpdateLeadsBadge;
  window.closeAdmin = closeAdmin;
  window.showAdPanel = showAdPanel$base;
  window.assignTutor = assignTutor;
}
