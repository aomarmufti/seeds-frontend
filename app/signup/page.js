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

/**
 * Turn a Supabase auth failure into something the person can act on.
 *
 * Written against a real incident (2026-08-02): a parent booked a
 * consultation, came here to create their account, and got a red box. The
 * cause was Supabase's SMTP provider refusing to send the confirmation email
 * — the project's sending domain is unverified, so the provider only allows
 * mail to the account owner's own address — and `/signup` answered 500. Two
 * things were wrong with what she saw. It told her nothing about what to do
 * next, and because supabase-js surfaces the upstream text, the red box on a
 * public page could print the owner's personal email address back at a
 * stranger. Neither the raw message nor the status code belongs on screen.
 */
function signupErrorMessage(err) {
  const raw = String(err?.message || '');
  const status = err?.status || 0;

  if (/already registered|already exists|user_already_exists/i.test(raw)) {
    return 'There is already an account with that email address. Try signing in instead, or use “Forgot password?” to set a new password.';
  }
  // The confirmation email could not be sent. The account is NOT created when
  // this happens — Supabase rolls the user back — so "try again" is wrong
  // advice and would just fail identically.
  if (status >= 500 || /send.*email|smtp|gomail|confirmation/i.test(raw)) {
    return "We couldn't send your confirmation email, so the account wasn't created. This one is at our end, not yours — please use “Continue with Google” on the sign-in page, or email us and we'll set it up for you.";
  }
  if (/rate limit|too many/i.test(raw)) {
    return 'Too many attempts in a short time. Please wait a few minutes and try again, or sign in with Google instead.';
  }
  if (/password/i.test(raw)) return raw;
  return 'We couldn’t create the account just now. Please try “Continue with Google” on the sign-in page, or email us and we’ll sort it out.';
}

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

      // Everything below is secondary. The account either exists now or it
      // doesn't; a failure here must not tell someone their signup failed
      // when it didn't, because their next move is to try again — and the
      // second attempt fails with "already registered", which is how a family
      // ends up locked out of an account they successfully created.
      if (data.user) {
        // handle_new_user already inserts the profile row from the signUp
        // metadata; this adds subject and level. It is also expected to fail
        // when email confirmation is on, because there is no session yet and
        // the RLS insert policy is scoped to authenticated callers — which is
        // exactly why its result was being discarded. Discarding it silently
        // was wrong; ignoring it deliberately is fine.
        const { error: profileErr } = await supabase().from('profiles').upsert({
          id: data.user.id, email: email.trim(), full_name: name.trim(),
          role: 'pending', subject, level,
        });
        if (profileErr) console.warn('Profile details not saved at signup:', profileErr.message);
      }
      // A leads row so the signup shows up in the admin review queue. The
      // backend links consultation bookings to this account later by matching
      // students.parent_email to this same email address.
      try {
        await api('/api/leads', {
          method: 'POST',
          auth: false,
          body: { name: name.trim(), email: email.trim(), subject, level, goal: 'Student signup', availability: [] },
        });
      } catch (leadErr) {
        // Rate limits live here (5/15min per IP, 3/hour per email), so a
        // family who retried once already can trip this on an otherwise
        // perfect signup. The account is real either way.
        console.warn('Signup lead not recorded:', leadErr.message);
      }
      setSent(true);
    } catch (err) {
      setError(signupErrorMessage(err));
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
              {/* Bookings are linked to an account by email address and
                  nothing else, so a parent who books with one address and
                  signs up with another gets an empty portal and no
                  explanation. That happened on 2026-08-02. */}
              {prefilledEmail ? (
                <em style={{ display: 'block', marginTop: 5, fontSize: '.74rem', fontStyle: 'normal', color: 'var(--ink-3)', lineHeight: 1.45 }}>
                  This is the address you booked with. Keep it the same, or your
                  consultation won&rsquo;t appear in your portal.
                </em>
              ) : null}
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

            {error ? (
              <div className="error-note" style={{ marginBottom: 12 }}>
                {error}
                {/* A dead end in a red box is what turned one failed signup
                    into a family who gave up. Every message above has a next
                    step; this is the way to take it. */}
                <div style={{ marginTop: 8 }}>
                  <Link href="/login" style={{ color: 'inherit', fontWeight: 700 }}>
                    Go to sign in →
                  </Link>
                </div>
              </div>
            ) : null}

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
