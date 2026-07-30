// Extracted from index.html by the SCRUM-32 migration (block 24).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ ACCESSIBILITY PASS (SCRUM-36) ══════════════════════════════════════════
// Applied generically across every modal/overlay rather than touching each
// of the several dozen open/close call sites individually — lower risk,
// and covers all of them at once instead of a handful.
(function() {
  // (containerSelector, openClass) for every overlay pattern in this file.
  const OVERLAY_TYPES = [
    ['.ad-modal-overlay', 'open'],
    ['.lg-overlay', 'lg-open'],
    ['.legal-overlay', 'open'],
    ['.bk-overlay', 'bk-open'],
    ['.tp-overlay', 'tp-open'],
    ['.ad-overlay', 'ad-open'],
  ];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function allOverlays() {
    const els = [];
    OVERLAY_TYPES.forEach(([sel, cls]) => document.querySelectorAll(sel).forEach(el => els.push([el, cls])));
    return els;
  }

  // Mark every overlay as a dialog for screen readers, once at load.
  allOverlays().forEach(([el]) => {
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
  });

  // Move focus into a modal the moment it opens (its open class is added),
  // and restore focus to whatever triggered it once closed — a MutationObserver
  // works regardless of which of the many inline onclick handlers did the
  // opening/closing, so nothing else in this file needs to change.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      const el = m.target;
      const match = OVERLAY_TYPES.find(([sel, cls]) => el.matches(sel) && el.classList.contains(cls));
      if (match) {
        lastFocused = document.activeElement;
        const target = el.querySelector(FOCUSABLE) || el;
        setTimeout(() => target.focus(), 50);
      } else if (lastFocused && !OVERLAY_TYPES.some(([sel, cls]) => el.matches(sel) && el.classList.contains(cls))) {
        // This overlay just closed (class removed) — only refocus if no
        // other overlay is now open, so closing one modal from within
        // another doesn't steal focus back too early.
        const anyOpen = allOverlays().some(([o, cls]) => o.classList.contains(cls));
        if (!anyOpen && lastFocused.isConnected) { lastFocused.focus(); lastFocused = null; }
      }
    });
  });
  allOverlays().forEach(([el]) => observer.observe(el, { attributes: true, attributeFilter: ['class'] }));

  // Escape closes whichever overlay is currently open. Prefers triggering
  // the modal's own close button (some, like the profile-setup modal, run
  // extra logic on dismiss beyond hiding the overlay — reusing the real
  // button means that logic still runs), then a click-outside handler some
  // overlays wire directly on the container, falling back to just removing
  // the open class for the few overlay types with neither.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const [el, cls] of allOverlays()) {
      if (!el.classList.contains(cls)) continue;
      const closeBtn = el.querySelector('[aria-label="Close" i]');
      if (closeBtn) { closeBtn.click(); return; }
      el.click(); // satisfies onclick="if(event.target===this)close...()" where present
      if (el.classList.contains(cls)) el.classList.remove(cls); // last-resort fallback
      return;
    }
  });
})();

