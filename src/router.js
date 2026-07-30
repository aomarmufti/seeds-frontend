// SCRUM-34: real client-side routing.
//
// "Pages" were div show/hide toggles with no URL involvement at all: every
// screen in every portal lived at the same address, so nothing could be
// linked to, the back button always left the site, and a refresh dumped you
// back at the marketing page.
//
// Routes look like #/tutor/tp-schedule — portal, then the panel's own element
// id, so a route is readable and maps to exactly one panel.
//
// Security note: a route never opens a portal by itself. Restoring a deep link
// goes through lgOpenPortalForSession(), which only ever runs against a real
// authenticated session. Pasting #/admin/ad-leads while signed out gets you the
// login screen, and the panel is applied afterwards — the URL is a request, not
// a grant.

const PORTALS = {
  student: { overlay: 'portal-overlay', navClass: 'p-nav-item', show: 'showPortalPanel', close: 'closePortal', isOpen: (el) => el.style.display === 'block' },
  tutor:   { overlay: 'tp-overlay',     navClass: 'tp-nav-item', show: 'showTpPanel',    close: 'closeTutorPortal', isOpen: (el) => el.classList.contains('tp-open') },
  admin:   { overlay: 'ad-overlay',     navClass: 'ad-nav-item', show: 'showAdPanel',    close: 'closeAdmin', isOpen: (el) => el.classList.contains('ad-open') },
};

// Set while the router is itself writing the hash or driving a panel change,
// so our own hashchange handler doesn't bounce the navigation back.
let applying = false;

function parse(hash) {
  const m = /^#\/([a-z]+)(?:\/([\w-]+))?/.exec(hash || '');
  if (!m || !PORTALS[m[1]]) return null;
  return { portal: m[1], panel: m[2] || null };
}

function currentOpenPortal() {
  for (const [name, cfg] of Object.entries(PORTALS)) {
    const el = document.getElementById(cfg.overlay);
    if (el && cfg.isOpen(el)) return name;
  }
  return null;
}

// Called by the portal panel switchers so the URL follows the UI.
export function routeSet(portal, panelId) {
  if (applying) return;
  const next = `#/${portal}${panelId ? '/' + panelId : ''}`;
  if (location.hash === next) return;
  applying = true;
  try { history.pushState(null, '', next); } finally { applying = false; }
}

// Called by the portal close handlers.
export function routeClear() {
  if (applying) return;
  if (!location.hash || location.hash === '#/') return;
  applying = true;
  try { history.pushState(null, '', location.pathname + location.search); } finally { applying = false; }
}

// Apply the panel named in the URL, if any. Called after a portal has opened
// through the normal authenticated path — never to open one.
export function routeApplyPanel(portal) {
  const route = parse(location.hash);
  if (!route || route.portal !== portal || !route.panel) return;
  const cfg = PORTALS[portal];
  const panel = document.getElementById(route.panel);
  if (!panel) return;
  // Find the sidebar item that drives this panel so the nav highlight matches.
  const nav = document.querySelector(`.${cfg.navClass}[onclick*="${route.panel}"]`);
  applying = true;
  try { window[cfg.show](route.panel, nav); } finally { applying = false; }
}

// Back/forward. Only moves between panels of an already-open portal, or closes
// one — it will not open a portal, for the reason in the header comment.
function onNavigate() {
  if (applying) return;
  const open = currentOpenPortal();
  const route = parse(location.hash);

  if (open && (!route || route.portal !== open)) {
    applying = true;
    try { window[PORTALS[open].close](); } finally { applying = false; }
    return;
  }
  if (open && route && route.portal === open) routeApplyPanel(open);
}

window.addEventListener('popstate', onNavigate);
window.addEventListener('hashchange', onNavigate);

// Bridged like every other module so the portal code can call these as bare
// globals, matching how the rest of the app resolves cross-module references.
window.routeSet = routeSet;
window.routeClear = routeClear;
window.routeApplyPanel = routeApplyPanel;
