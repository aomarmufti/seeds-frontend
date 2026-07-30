// Extracted from index.html by the SCRUM-32 migration (block 1).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── SUPABASE CLIENT ──────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://fgnosgawafdotmyjslmy.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbm9zZ2F3YWZkb3RteWpzbG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU1MzksImV4cCI6MjA5ODQ5MTUzOX0.USt2u3RaSBQJaHRizy7GV6qgtsLgNEuMcuymkJImGAI';
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Escapes user-supplied text before it's interpolated into innerHTML —
// use for any chat message, note, or profile field coming from the database.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global error toast — makes failures visible instead of silent
function seedsToast(msg, isError = true) {
  let t = document.getElementById('seeds-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'seeds-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.setAttribute('aria-atomic', 'true');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;max-width:420px;padding:12px 18px;border-radius:12px;font-family:Inter,sans-serif;font-size:.82rem;font-weight:600;box-shadow:0 8px 30px rgba(13,27,42,.25);display:none';
    document.body.appendChild(t);
  }
  t.style.background = isError ? '#c0392b' : '#2D7A4F';
  t.style.color = '#fff';
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 6000);
}

// A plain fetch() has no built-in timeout — if the backend (or a downstream
// call it makes, e.g. to a third-party API) hangs, the caller waits forever
// with no way to recover. Used anywhere a frozen "Confirming…" state would
// otherwise be possible, so callers always get an outcome one way or another.
function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Handle return from Stripe Connect onboarding
(function() {
  const params = new URLSearchParams(window.location.search);
  const connect = params.get('connect');
  if (connect === 'done') {
    setTimeout(() => alert('✓ Payout setup complete! Your earnings will now transfer automatically when admin approves a payout.'), 800);
    history.replaceState(null, '', window.location.pathname);
  } else if (connect === 'refresh') {
    setTimeout(() => alert('Setup was interrupted. Open the Earnings tab and click "Set up payouts" to try again.'), 800);
    history.replaceState(null, '', window.location.pathname);
  }
})();

// Tutor name map for portal switching
const lgTutorMap = {
  'Azeem Omar-Mufti': { key:'azeem',     name:'Azeem',      subject:'Mathematics',        initials:'AZ' },
  'Suleiman':          { key:'suleiman',  name:'Suleiman',   subject:'History & Arabic',    initials:'SU' },
  'Abdul-Moez':        { key:'abdulmoez', name:'Abdul-Moez', subject:'Chemistry & Biology', initials:'AM' },
};

// ── PUBLIC ENTRY POINTS ──────────────────────────────────────────────────
function openPortal()      { lgOpen(); }
function openTutorPortal() { lgOpen(); }
function openAdmin()       { lgOpen(); }

// ── SCREEN MANAGEMENT ────────────────────────────────────────────────────
let _lgSession = null;

function lgShowScreen(screen) {
  ['signin','signup','setpw','forgot'].forEach(s =>
    document.getElementById('lg-screen-' + s).style.display = s === screen ? 'block' : 'none'
  );
}

function lgShowForgot() {
  lgShowScreen('forgot');
  const el = document.getElementById('lg-forgot-email');
  if (el) { el.value = ''; }
  document.getElementById('lg-forgot-enter').disabled = true;
  document.getElementById('lg-forgot-success').style.display = 'none';
  const errEl = document.getElementById('lg-forgot-error');
  if (errEl) errEl.style.display = 'none';
}
function lgValidateForgot() {
  const email = document.getElementById('lg-forgot-email').value.trim();
  document.getElementById('lg-forgot-enter').disabled = !email.includes('@');
}
async function lgSendReset() {
  const email = document.getElementById('lg-forgot-email').value.trim();
  const btn = document.getElementById('lg-forgot-enter');
  btn.disabled = true; btn.textContent = 'Sending…';
  const { error } = await sbClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) {
    const errEl = document.getElementById('lg-forgot-error');
    errEl.textContent = error.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Send reset link →';
  } else {
    document.getElementById('lg-forgot-success').style.display = 'block';
    btn.textContent = 'Sent ✓';
  }
}

function lgOpen() {
  lgClearError();
  ['lg-email','lg-password','lg-magic-email','lg-su-name','lg-su-email','lg-su-password'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['lg-su-subject','lg-su-level'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('lg-enter').disabled = true;
  document.getElementById('lg-magic-success').style.display = 'none';
  document.getElementById('lg-su-success').style.display = 'none';
  document.getElementById('lg-overlay').classList.add('lg-open');
  document.getElementById('portal-launch-btn').style.display = 'none';
  document.body.style.overflow = 'hidden';
  lgShowScreen('signin');
  lgShowTab('password');
}

function closeLogin() {
  document.getElementById('lg-overlay').classList.remove('lg-open');
  document.getElementById('portal-launch-btn').style.display = 'flex';
  document.body.style.overflow = '';
}

function lgShowTab(tab) {
  document.getElementById('lg-pw-section').style.display    = tab === 'password' ? 'block' : 'none';
  document.getElementById('lg-magic-section').style.display = tab === 'magic'    ? 'block' : 'none';
  document.getElementById('lg-tab-pw').classList.toggle('lg-tab-active',    tab === 'password');
  document.getElementById('lg-tab-magic').classList.toggle('lg-tab-active', tab === 'magic');
  lgClearError();
}
function lgValidate() {
  const email = document.getElementById('lg-email').value.trim();
  const pass  = document.getElementById('lg-password').value;
  document.getElementById('lg-enter').disabled = !(email.includes('@') && pass.length >= 6);
}
function lgValidateMagic() {
  const email = document.getElementById('lg-magic-email').value.trim();
  document.getElementById('lg-magic-enter').disabled = !email.includes('@');
}
function lgShowError(msg) {
  const el = document.getElementById('lg-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function lgClearError() {
  ['lg-error','lg-signup-error','lg-setpw-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
}
function lgSetLoading(loading) {
  const btn = document.getElementById('lg-enter');
  btn.disabled = loading;
  btn.textContent = loading ? 'Signing in…' : 'Sign in →';
}

async function lgEnter() {
  const email    = document.getElementById('lg-email').value.trim();
  const password = document.getElementById('lg-password').value;
  lgClearError(); lgSetLoading(true);
  try {
    if (window._lgMarkPasswordLogin) window._lgMarkPasswordLogin();
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await lgHandleSession(data.session, false);
  } catch(e) {
    lgShowError(e.message || 'Sign in failed — check your email and password.');
    lgSetLoading(false);
  }
}

// SCRUM-71: one button covers sign-in AND sign-up for all three roles —
// role-based routing already happens post-session in
// lgOpenPortalForSession(), driven by profiles.role, not by which button
// was clicked. A brand-new Google account gets profiles.role='student'
// from the handle_new_user() trigger (same default as today's email
// self-signup) — there is no way for a Google sign-in to provision a
// tutor/admin role; that still only happens via an admin's invite-tutor/
// create-tutor flow (api/auth.js), which creates the auth user directly.
// A tutor/admin whose email an admin already provisioned just signs in
// with the SAME email via Google — Supabase Auth links it to their
// existing (already role='tutor'/'admin') account automatically, it does
// not create a second one.
//
// This whole button does nothing until Google OAuth is actually enabled
// for this Supabase project (Dashboard -> Authentication -> Providers ->
// Google, with a Client ID/Secret from Google Cloud Console, and the
// site's URL added to Redirect URLs) — an external setup step no code
// change can perform.
async function lgGoogleSignIn() {
  lgClearError();
  const { error } = await sbClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  // signInWithOAuth navigates the whole page away to Google on success —
  // this only returns here if it failed before that redirect even started
  // (e.g. the provider isn't enabled yet).
  if (error) lgShowError(error.message || 'Google sign-in failed — please try again.');
}

async function lgSendMagic() {
  const email = document.getElementById('lg-magic-email').value.trim();
  lgClearError();
  document.getElementById('lg-magic-enter').disabled = true;
  document.getElementById('lg-magic-enter').textContent = 'Sending…';
  // SCRUM-78: this is a sign-in convenience for an existing account, not a
  // signup path — shouldCreateUser:false stops a brand-new email from
  // silently provisioning a real account here. The one supported way to
  // request access is lgSignup() below, which creates a 'pending' profile
  // and a leads row for admin review; this button must not become a second,
  // unreviewed way in.
  const { error } = await sbClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: false }
  });
  if (error) {
    lgShowError(error.message.includes('Signups not allowed')
      ? 'No account found for that email — use "Request access" below instead.'
      : error.message);
    document.getElementById('lg-magic-enter').disabled = false;
    document.getElementById('lg-magic-enter').textContent = 'Send magic link →';
  } else {
    document.getElementById('lg-magic-success').style.display = 'block';
    document.getElementById('lg-magic-enter').textContent = 'Sent ✓';
  }
}

// ── SIGN UP ──────────────────────────────────────────────────────────────
function lgValidateSignup() {
  const name    = document.getElementById('lg-su-name').value.trim();
  const email   = document.getElementById('lg-su-email').value.trim();
  const pass    = document.getElementById('lg-su-password').value;
  const subject = document.getElementById('lg-su-subject').value;
  const level   = document.getElementById('lg-su-level').value;
  document.getElementById('lg-su-enter').disabled =
    !(name && email.includes('@') && pass.length >= 8 && subject && level);
}

async function lgSignup() {
  const name    = document.getElementById('lg-su-name').value.trim();
  const email   = document.getElementById('lg-su-email').value.trim();
  const pass    = document.getElementById('lg-su-password').value;
  const subject = document.getElementById('lg-su-subject').value;
  const level   = document.getElementById('lg-su-level').value;
  const btn     = document.getElementById('lg-su-enter');
  const errEl   = document.getElementById('lg-signup-error');
  btn.disabled = true; btn.textContent = 'Sending…';
  errEl.style.display = 'none';
  try {
    const { data, error } = await sbClient.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name, role: 'pending' } }
    });
    if (error) throw error;
    if (data.user) {
      await sbClient.from('profiles').upsert({
        id: data.user.id, email, full_name: name,
        role: 'pending', subject, level,
      });
    }
    await fetchWithTimeout(BACKEND + '/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, level, goal: 'Student signup', availability: [] }),
    });
    document.getElementById('lg-su-success').style.display = 'block';
    btn.textContent = 'Request sent ✓';
  } catch(e) {
    errEl.textContent = e.message || 'Signup failed — please try again.';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Request access →';
  }
}

// ── SET PASSWORD ─────────────────────────────────────────────────────────
function lgValidateSetPw() {
  const pw  = document.getElementById('lg-setpw-pw').value;
  const pw2 = document.getElementById('lg-setpw-confirm').value;
  const errEl = document.getElementById('lg-setpw-error');
  const ok = pw === pw2 && pw.length >= 8;
  document.getElementById('lg-setpw-enter').disabled = !ok;
  if (pw2 && !ok) {
    errEl.textContent = pw.length < 8 ? 'At least 8 characters required.' : "Passwords don't match.";
    errEl.style.display = 'block';
  } else { errEl.style.display = 'none'; }
}

async function lgSetPassword() {
  const pw  = document.getElementById('lg-setpw-pw').value;
  const confirm = document.getElementById('lg-setpw-confirm').value;
  const errEl = document.getElementById('lg-setpw-error');
  const btn = document.getElementById('lg-setpw-enter');
  if (pw !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }
  if (pw.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters.';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true; btn.textContent = 'Saving…';
  errEl.style.display = 'none';
  // Set password AND mark hasPassword so magic-link logins skip this next time
  const { error } = await sbClient.auth.updateUser({
    password: pw,
    data: { hasPassword: true },
  });
  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Set password & enter portal →';
  } else {
    // Route using the REAL profile role from the DB, not stale metadata
    const { data: { session } } = await sbClient.auth.getSession();
    await lgHandleSession(session || _lgSession, false);
  }
}

// Password is mandatory after magic link — no skip

// ── SESSION HANDLER ──────────────────────────────────────────────────────
async function lgHandleSession(session, viaMagicLink) {
  if (!session) return;
  const { data: profile } = await sbClient
    .from('profiles')
    .select('role, full_name, tutor_name')
    .eq('id', session.user.id)
    .single();
  const role = profile?.role || 'student';
  // SCRUM-80: password sign-in already has the login modal open when this
  // runs, but magic-link and Google OAuth both complete via a real
  // cross-page redirect — the page reloads fresh with the modal closed, so
  // showing a screen/error here without opening it first renders invisibly.
  // The user just sees the plain homepage with nothing having happened.
  const ensureLoginOpen = () => {
    document.getElementById('lg-overlay').classList.add('lg-open');
    document.getElementById('portal-launch-btn').style.display = 'none';
    document.body.style.overflow = 'hidden';
  };
  if (role === 'pending') {
    ensureLoginOpen();
    lgShowScreen('signin');
    lgShowError('Your account is pending approval. We\'ll email you once approved.');
    return;
  }
  if (viaMagicLink) {
    _lgSession = session;
    if (_lgSession) _lgSession._profile = profile;
    ensureLoginOpen();
    lgShowScreen('setpw');
    return;
  }
  await lgOpenPortalForSession(session, profile);
}

async function lgOpenPortalForSession(session, profile) {
  if (!profile) profile = (session && session._profile) || {};
  const role = profile.role || 'student';
  // SCRUM-32: the portals are a separate chunk that an anonymous visitor never
  // downloads, so it has to be here before any _open*Portal() call. This is the
  // only place the eager bundle reaches into portal code, which is why the
  // split was drawn at this line.
  await loadPortal();
  closeLogin();
  if (role === 'admin') {
    _openAdminPortal();
  } else if (role === 'tutor') {
    _openTutorPortal();
    const tutorName = profile.tutor_name || profile.full_name;
    // lgTutorMap only has the original 3 tutors' switcher branding (avatar
    // initials/colour) — it must stay cosmetic-only. Previously the whole
    // dashboard init (earnCurrentTutor, analytics, KPIs) was gated behind a
    // match in this hardcoded map, so any tutor whose tutor_name didn't
    // match exactly (a new tutor via SCRUM-28's dynamic tutors table, or
    // just a slightly different stored name) got a silently blank
    // dashboard — nothing in tpLoadSchedule() etc. runs without
    // earnCurrentTutor set.
    earnCurrentTutor = tutorName;
    // SCRUM-83: identity comes from this session only. lgTutorMap is now
    // purely cosmetic (which photo, if any) and no longer gates anything.
    tpSetIdentity(tutorName, session?.user?.email, lgTutorMap[tutorName]?.key);
    // tpLoadSchedule() (triggered by _openTutorPortal's own wrapper) fetches
    // this tutor's own bookings and calls tpUpdateHomeKPIs itself — no
    // dependency on the admin-only analytics dashboard, which a real tutor
    // account can never successfully call.
  } else {
    _openStudentPortal();
  }
  // SCRUM-34: a deep link like #/tutor/tp-earnings only takes effect here,
  // after a real session has opened the portal — so the URL can request a
  // panel but can never be the thing that grants access to one.
  routeApplyPanel(role === 'admin' ? 'admin' : role === 'tutor' ? 'tutor' : 'student');
}

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) await lgHandleSession(session, false);
  // Stripe redirects here after the emailed "no saved card" payment link is
  // paid (or cancelled) — previously nothing read this, so the payer just
  // landed back on the portal with no confirmation at all, even though the
  // payment itself (and the booking's status) was already handled server-
  // side by the checkout.session.completed webhook.
  const paymentParam = new URLSearchParams(window.location.search).get('payment');
  if (paymentParam === 'success') {
    seedsToast('Payment successful — your lesson is confirmed!', false);
  } else if (paymentParam === 'cancelled') {
    seedsToast('Payment was cancelled — your lesson is still awaiting payment.');
  }
  if (paymentParam) {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url);
  }
  let _lgPasswordLogin = false; // guard: lgEnter handles its own session
  sbClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // User clicked reset link — show set password screen
      _lgSession = session;
      if (_lgSession) _lgSession._profile = { role: session?.user?.user_metadata?.role || 'student' };
      document.getElementById('lg-overlay').classList.add('lg-open');
      document.body.style.overflow = 'hidden';
      lgShowScreen('setpw');
      return;
    }
    if (event === 'SIGNED_IN' && session) {
      if (_lgPasswordLogin) { _lgPasswordLogin = false; return; } // handled by lgEnter
      // SCRUM-71: a Google sign-in also has no password (same as a magic
      // link), but must NOT be routed to the "set password" screen — Google
      // IS their auth method, there's nothing to set. app_metadata.provider
      // is set by Supabase Auth itself based on how this session was
      // established, so it reliably distinguishes the two.
      const isGoogle = session.user?.app_metadata?.provider === 'google';
      const isMagic = !isGoogle && !session.user?.user_metadata?.hasPassword;
      await lgHandleSession(session, isMagic);
    }
  });
  window._lgMarkPasswordLogin = () => { _lgPasswordLogin = true; };
});


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON = SUPABASE_ANON;
  window.sbClient = sbClient;
  window.escapeHtml = escapeHtml;
  window.seedsToast = seedsToast;
  window.fetchWithTimeout = fetchWithTimeout;
  window.lgTutorMap = lgTutorMap;
  window.openPortal = openPortal;
  window.openTutorPortal = openTutorPortal;
  window.openAdmin = openAdmin;
  Object.defineProperty(window, "_lgSession", { get: () => _lgSession, set: (v) => { _lgSession = v; }, configurable: true });
  window.lgShowScreen = lgShowScreen;
  window.lgShowForgot = lgShowForgot;
  window.lgValidateForgot = lgValidateForgot;
  window.lgSendReset = lgSendReset;
  window.lgOpen = lgOpen;
  window.closeLogin = closeLogin;
  window.lgShowTab = lgShowTab;
  window.lgValidate = lgValidate;
  window.lgValidateMagic = lgValidateMagic;
  window.lgShowError = lgShowError;
  window.lgClearError = lgClearError;
  window.lgSetLoading = lgSetLoading;
  window.lgEnter = lgEnter;
  window.lgGoogleSignIn = lgGoogleSignIn;
  window.lgSendMagic = lgSendMagic;
  window.lgValidateSignup = lgValidateSignup;
  window.lgSignup = lgSignup;
  window.lgValidateSetPw = lgValidateSetPw;
  window.lgSetPassword = lgSetPassword;
  window.lgHandleSession = lgHandleSession;
  window.lgOpenPortalForSession = lgOpenPortalForSession;
}
