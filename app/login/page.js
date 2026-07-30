'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    params.get('pending') ? "Your account is awaiting approval. We'll email you once it's ready." : ''
  );
  const [busy, setBusy] = useState(false);

  // Already signed in? Don't make them type it again.
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

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, color: 'var(--gold-ink)' }}>
          <Seedling size={22} />
          <strong style={{ letterSpacing: '-.01em' }}>Seeds Tuition</strong>
        </div>

        <h1>Sign in</h1>
        <p className="sub">Students, tutors and staff all sign in here.</p>

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
