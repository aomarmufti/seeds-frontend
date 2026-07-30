// Extracted from index.html by the SCRUM-32 migration (block 2).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// NOTE (SCRUM-32): _openStudentPortal(), showPortalPanel() are declared here but replaced later by
// another module assigning to window. Under the old shared global scope that
// replacement applied to this block's own calls too; as a module, a local
// declaration would shadow it. Declared as ...$base and published to window so
// every reference, here included, still resolves to the current override.

function _openStudentPortal$base(){
  document.getElementById('portal-overlay').style.display='block';
  document.getElementById('portal-launch-btn').style.display='none';
  document.body.style.overflow='hidden';
}
function closePortal(){
  document.getElementById('portal-overlay').style.display='none';
  document.getElementById('portal-launch-btn').style.display='flex';
  document.body.style.overflow='';
  routeClear();
}
function showPortalPanel$base(id,navEl){
  document.querySelectorAll('.p-panel').forEach(p=>p.classList.remove('p-active'));
  document.getElementById(id).classList.add('p-active');
  document.querySelectorAll('.p-nav-item').forEach(n=>n.classList.remove('p-active-nav'));
  if(navEl) navEl.classList.add('p-active-nav');
  if (id === 'p-rec' && typeof spLoadRecordings === 'function') spLoadRecordings();
  routeSet('student', id);
}
function togglePHW(el){
  el.classList.toggle('p-done');
  el.textContent=el.classList.contains('p-done')?'✓':'';
  const t=el.nextElementSibling?.querySelector('.p-hw-title');
  if(t) t.classList.toggle('p-striked');
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window._openStudentPortal = _openStudentPortal$base;
  window.closePortal = closePortal;
  window.showPortalPanel = showPortalPanel$base;
  window.togglePHW = togglePHW;
}
