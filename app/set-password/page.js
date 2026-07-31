'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, currentSession, currentProfile } from '@/lib/supabase';
import { Seedling } from '@/components/icons';

function portalFor(role) {
  if (role === 'admin') return '/admin/leads';
  if (role === 'tutor') return '/tutor/schedule';
  return '/student/lessons';
}

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // null = still checking, false = no recovery session, true = ready
  const [ready, setReady] = useState(null);

  useEffect(() => {
    const sb = supabase();

    // The recovery session arrives via the emailed link's URL fragment; the
    // client parses it (detectSessionInUrl) and fires PASSWORD_RECOVERY.
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setReady(true);
    });

    (async () => {
      const session = await currentSession();
      if (!session) {
        setReady((r) => (r === null ? false : r));
        return;
      }
      // A Google sign-in has no password to set — Google IS their auth
      // method. app_metadata.provider is set by Supabase Auth itself based on
      // how the session was established. Send them straight to their portal.
      if (session.user?.app_metadata?.provider === 'google') {
        const profile = await currentProfile(session);
        router.replace(portalFor(profile?.role || 'student'));
        return;
      }
      setReady(true);
    })();

    return () => subscription.unsubscribe();
  }, [router]);

  async function setNewPassword(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError('At least 8 characters required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Set the password AND mark hasPassword, matching the legacy flow.
      const { error: updateErr } = await supabase().auth.updateUser({
        password,
        data: { hasPassword: true },
      });
      if (updateErr) throw updateErr;

      const session = await currentSession();
      const profile = await currentProfile(session);
      const role = profile?.role || 'student';
      router.replace(role === 'pending' ? '/login?pending=1' : portalFor(role));
    } catch (err) {
      setError(err.message || 'Could not save the password — please try again.');
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

        <h1>Set your password</h1>

        {ready === null ? (
          <div className="skeleton" style={{ height: 20 }} />
        ) : ready === false ? (
          <>
            <p className="sub">
              This reset link has expired or already been used — request a fresh one.
            </p>
            <div className="auth-links">
              <Link href="/forgot-password">Send a new reset link</Link>
            </div>
          </>
        ) : (
          <>
            <p className="sub">You&apos;re signed in. Choose a new password to finish.</p>
            <form onSubmit={setNewPassword}>
              <label className="field">
                <span>New password</span>
                <input
                  type="password" required autoComplete="new-password" id="sp-password"
                  placeholder="At least 8 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Confirm password</span>
                <input
                  type="password" required autoComplete="new-password" id="sp-confirm"
                  placeholder="Repeat password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                />
              </label>

              {error ? <div className="error-note" style={{ marginBottom: 12 }}>{error}</div> : null}

              <button className="btn" type="submit" disabled={busy} id="sp-enter">
                {busy ? 'Saving…' : 'Set password & enter portal →'}
              </button>
            </form>
          </>
        )}

        {ready !== null ? (
          <div className="auth-footlink">
            <Link href="/login">← Back to sign in</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
