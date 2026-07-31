'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Seedling } from '@/components/icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendReset(e) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setBusy(true);
    setError('');
    // The emailed link lands on /set-password, which picks up the recovery
    // session and lets the user choose a new password.
    const { error: resetErr } = await supabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/set-password',
    });
    if (resetErr) {
      setError(resetErr.message || 'Could not send the reset link — please try again.');
      setBusy(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, color: 'var(--gold-ink)' }}>
          <Seedling size={22} />
          <strong style={{ letterSpacing: '-.01em' }}>Seeds Tuition</strong>
        </div>

        <h1>Reset your password</h1>
        <p className="sub">We&apos;ll email you a link to set a new one.</p>

        {sent ? (
          <div className="ok-note">✓ Check your email for a password reset link.</div>
        ) : (
          <form onSubmit={sendReset}>
            <label className="field">
              <span>Email</span>
              <input
                type="email" required autoComplete="email" id="fp-email"
                placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {error ? <div className="error-note" style={{ marginBottom: 12 }}>{error}</div> : null}

            <button className="btn" type="submit" disabled={busy || !email.includes('@')} id="fp-enter">
              {busy ? 'Sending…' : 'Send reset link →'}
            </button>
          </form>
        )}

        <div className="auth-footlink">
          <Link href="/login">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
