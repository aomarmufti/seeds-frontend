// SCRUM-32: run a callback once the DOM is parsed, whether or not that has
// already happened.
//
// The portal modules used to be inline <script> blocks that ran during parse,
// so DOMContentLoaded was always still ahead of them and
// addEventListener('DOMContentLoaded', …) was a safe way to defer setup.
//
// They are now a lazily-imported chunk fetched when someone signs in — minutes
// after that event has come and gone. A plain listener registered then never
// fires. That is not a hypothetical: it silently un-wired the admin portal's
// data loading (the wrappers around _openAdminPortal and showAdPanel live in
// one of these callbacks), so the dashboard opened empty.
//
// This is the seam every lazily-loaded module has to use instead.
export function whenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

window.whenReady = whenReady;
