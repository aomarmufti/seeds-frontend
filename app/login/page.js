'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, currentSession, currentProfile } from '@/lib/supabase';
import { Seedling } from '@/components/icons';

function portalFor(role) {
  if (role === 'admin') return '/admin/leads';
  if (role === 'tutor') return '/tutor/schedule';
  return '/student/lessons';
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    params.get('pending') ? "Your account is awaiting approval. We'll email you once it's ready."
      // Supabase appends ?error=…&error_description=… to redirectTo when the
      // OAuth round-trip fails (e.g. the Google provider isn't enabled yet).
      : params.get('error_description') || params.get('error') || ''
  );
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Already signed in? Don't make them type it again. This is also where a
  // Google sign-in lands after the OAuth redirect back to /login — the session
  // check below routes them to their portal.
  useEffect(() => {
    (async () => {
      const session = await currentSession();
      if (!session) return;
      const profile = await currentProfile(session);
      const role = profile?.role || 'student';
      if (role !== 'pending') router.replace(next || portalFor(role));
    })();
  }, [next, router]);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase().auth.signInWithPassword({ email, password });
      if (authErr) throw new Error('That email and password don’t match an account.');

      const profile = await currentProfile(data.session);
      const role = profile?.role || 'student';

      if (role === 'pending') {
        setError("Your account is awaiting approval. We'll email you once it's ready.");
        setBusy(false);
        return;
      }
      // `next` is honoured only after the role check below decides it's
      // allowed — the portal shell re-checks and redirects if it isn't theirs.
      router.replace(next || portalFor(role));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setError('');
    // Full-page redirect flow — this only returns if the redirect never
    // started (e.g. the Google provider isn't enabled in Supabase yet). The
    // requested `next` page survives the round-trip via redirectTo's query.
    const redirectTo = window.location.origin + '/login' + (next ? `?next=${encodeURIComponent(next)}` : '');
    const { error: oauthErr } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (oauthErr) {
      setError(oauthErr.message || 'Google sign-in failed — please try again.');
      setGoogleBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, color: 'var(--gold-ink)' }}>
          <Seedling size={22} />
          <strong style={{ letterSpacing: '-.01em' }}>Seeds Tuition</strong>
        </div>

        <h1>Sign in</h1>
        <p className="sub">Students, tutors and staff all sign in here.</p>

        <button type="button" className="auth-google-btn" id="lg-google-btn" onClick={signInWithGoogle} disabled={googleBusy}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
          {googleBusy ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="auth-divider">or</div>

        <form onSubmit={signIn}>
          <label className="field">
            <span>Email</span>
            <input
              type="email" required autoComplete="email" id="lg-email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password" required autoComplete="current-password" id="lg-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <div className="error-note" style={{ marginBottom: 12 }}>{error}</div> : null}

          <button className="btn" type="submit" disabled={busy} id="lg-enter">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footlink">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-links">
          New to Seeds? <Link href="/signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-wrap"><div className="auth-card"><div className="skeleton" style={{ height: 20 }} /></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
