'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Seedling } from '@/components/icons';

// Legacy field set (lgSignup): name, email, password (min 8), subject, level.
const SUBJECTS = ['Mathematics', 'History', 'Arabic', 'Chemistry', 'Biology'];
const LEVELS = ['GCSE', 'A-Level'];

function SignupForm() {
  const params = useSearchParams();
  const prefilledEmail = params.get('email') || '';
  const prefilledName = params.get('name') || '';

  const [name, setName] = useState(prefilledName);
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = name.trim() && email.includes('@') && password.length >= 8 && subject && level;

  async function signUp(e) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      // Role 'pending' — an admin approves the account before any portal opens.
      const { data, error: authErr } = await supabase().auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), role: 'pending' } },
      });
      if (authErr) throw authErr;
      if (data.user) {
        await supabase().from('profiles').upsert({
          id: data.user.id, email: email.trim(), full_name: name.trim(),
          role: 'pending', subject, level,
        });
      }
      // A leads row so the signup shows up in the admin review queue. The
      // backend links consultation bookings to this account later by matching
      // students.parent_email to this same email address.
      await api('/api/leads', {
        method: 'POST',
        auth: false,
        body: { name: name.trim(), email: email.trim(), subject, level, goal: 'Student signup', availability: [] },
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Signup failed — please try again.');
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

        <h1>Create account</h1>
        <p className="sub">Request student access — we approve every account by hand.</p>

        {sent ? (
          <>
            <div className="ok-note">
              ✓ Request sent — we&apos;ll email you once your account is approved.
            </div>
            <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', margin: '14px 0 0' }}>
              If you booked a free consultation, it will appear in your Student
              Portal once your account is approved — it&apos;s linked to the
              email address you signed up with.
            </p>
            <div className="auth-links">
              <Link href="/login">Back to sign in</Link>
            </div>
          </>
        ) : (
          <form onSubmit={signUp}>
            <label className="field">
              <span>Your full name</span>
              <input
                type="text" required autoComplete="name" id="su-name"
                placeholder="e.g. Fatima Hussain"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email" required autoComplete="email" id="su-email"
                placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password" required autoComplete="new-password" id="su-password"
                placeholder="At least 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Subject</span>
              <select id="su-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required>
                <option value="">Select a subject…</option>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Level</span>
              <select id="su-level" value={level} onChange={(e) => setLevel(e.target.value)} required>
                <option value="">Select a level…</option>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>

            {error ? <div className="error-note" style={{ marginBottom: 12 }}>{error}</div> : null}

            <button className="btn" type="submit" disabled={busy || !valid} id="su-enter">
              {busy ? 'Sending…' : 'Request access →'}
            </button>
          </form>
        )}

        {!sent ? (
          <div className="auth-links">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="auth-wrap"><div className="auth-card"><div className="skeleton" style={{ height: 20 }} /></div></div>}>
      <SignupForm />
    </Suspense>
  );
}
