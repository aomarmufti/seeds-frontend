// Extracted from index.html by the SCRUM-32 migration (block 21).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

function openLegal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';}
function closeLegal(id){document.getElementById(id).classList.remove('open');document.body.style.overflow='';}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.openLegal = openLegal;
  window.closeLegal = closeLegal;
}
