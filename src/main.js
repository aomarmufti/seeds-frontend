// SCRUM-32 entry point.
//
// The app used to be 25 global-scope <script> blocks inside index.html. They
// are now ES modules under ./modules, imported in their original document
// order — that order is load-bearing: later blocks call into earlier ones at
// module-evaluation time, and each module's generated bridge has to have run
// before the next one references it.
//
// Only what an anonymous visitor actually needs is eager: the marketing page,
// the booking wizard, config and the auth/login flow. Everything behind a
// login lives in ./portal.js and is fetched on demand by loadPortal() below.

import './router.js';

import './modules/00-scroll-progress-indicator-lets-people-se.js';
import './modules/01-supabase-client.js';
import './modules/06-config.js';
import './modules/21-openlegal.js';
import './modules/24-accessibility-pass.js';

// Fetch the portal chunk, once. Returns the same promise on every later call,
// so two concurrent sign-in paths can't race two downloads.
let portalPromise = null;
export function loadPortal() {
  if (!portalPromise) portalPromise = import('./portal.js');
  return portalPromise;
}
window.loadPortal = loadPortal;
