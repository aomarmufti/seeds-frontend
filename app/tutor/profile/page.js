'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { loadOwnProfile, saveOwnProfile } from '@/lib/profile';
import { PageHead, Card, Badge, Loading, ErrorNote, useAsync } from '@/components/ui';
import { Field, TextInput, ReadOnly, SaveBar } from '@/components/profile/fields';

/**
 * /tutor/profile (SCRUM-XX40) — a tutor maintaining their own profile.
 *
 * Bio and subjects save for real: they are `profiles` columns, and the
 * browser may update its own row.
 *
 * Display name is the one field a tutor would most expect to edit and the
 * one that must stay locked. The backend authorises a tutor against a
 * booking by string-matching `profiles.tutor_name` to `bookings.tutor_name`,
 * so renaming yourself here would lock you out of every lesson you already
 * have — which is SCRUM-XX35's "Unauthorized", self-inflicted. The legacy
 * tutor modal offered exactly this field. Not restoring it is deliberate,
 * and the reason is on the page rather than only in this comment.
 *
 * The public /tutors/[slug] pages still read the hardcoded roster in
 * lib/tutors.jsx. Feeding them from here is the rest of XX40 and needs a
 * public read endpoint — no other tutor's profile row is readable from the
 * browser, by design.
 */
export default function TutorProfilePage() {
  // Bumped when a tutor comes back from Stripe onboarding, so the payout
  // badge reflects what they just did rather than what was true on load.
  const [reloadKey, setReloadKey] = useState(0);

  const { loading, error, data } = useAsync(async () => {
    const profile = await loadOwnProfile();
    const name = profile?.tutor_name || profile?.full_name || '';
    // Payout state is the backend's to change, so it reads as status rather
    // than a form — but starting the setup is the tutor's to do, hence the
    // action alongside it (SCRUM-92).
    const connect = name
      ? await api(`/api/payouts?resource=connect-status&tutor=${encodeURIComponent(name)}`).catch(() => null)
      : null;
    return { profile, connect };
  }, [reloadKey]);

  const profile = data?.profile;
  const connect = data?.connect;

  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!profile) return;
    const initial = {
      full_name: profile.full_name || '',
      subjects: profile.subjects || '',
      bio: profile.bio || '',
      whatsapp_number: profile.whatsapp_number || '',
      whatsapp_opted_in: !!profile.whatsapp_opted_in,
    };
    setForm(initial);
    setBaseline(initial);
  }, [profile]);

  const dirty = !!form && !!baseline
    && Object.keys(baseline).some((k) => form[k] !== baseline[k]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setSaveError('');
  }

  async function save() {
    setBusy(true);
    setSaveError('');
    const optedIn = form.whatsapp_opted_in && !!form.whatsapp_number.trim();
    const next = {
      full_name: form.full_name.trim(),
      subjects: form.subjects.trim(),
      bio: form.bio.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      whatsapp_opted_in: optedIn,
    };
    try {
      await saveOwnProfile('tutor', {
        full_name: next.full_name,
        subjects: next.subjects || null,
        bio: next.bio || null,
        whatsapp_number: next.whatsapp_number || null,
        whatsapp_opted_in: optedIn,
      });
      setForm(next);
      setBaseline(next);
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Payout onboarding (SCRUM-92) ──────────────────────────────────────────
  // Stripe owns the whole bank-details journey; our part is opening the door
  // and noticing when they come back through it.
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectNotice, setConnectNotice] = useState('');

  // Stripe returns to ?connect=done (finished) or ?connect=refresh (the link
  // expired or they backed out). Either way the stored status may have moved,
  // so re-read it — and drop the query string so a later reload isn't still
  // announcing a journey that ended.
  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get('connect');
    if (!outcome) return;
    window.history.replaceState({}, '', window.location.pathname);
    setConnectNotice(
      outcome === 'done'
        ? 'Thanks — checking with Stripe that your details went through.'
        : 'Payout setup was interrupted. You can pick up where you left off below.',
    );
    setReloadKey((k) => k + 1);
  }, []);

  async function startConnect() {
    setConnectBusy(true);
    setConnectError('');
    try {
      const res = await api('/api/payouts', {
        method: 'POST',
        body: {
          action: 'create-connect-account',
          tutorName: profile?.tutor_name,
          tutorEmail: profile?.email || undefined,
          returnOrigin: window.location.origin,
        },
      });
      if (!res?.url) throw new Error('Stripe didn’t return a setup link. Try again, or email us.');
      window.location.href = res.url;
    } catch (e) {
      // Left on the page rather than redirected, so the message has to say
      // enough to act on — the backend's Connect-not-enabled error does.
      setConnectError(e.message);
      setConnectBusy(false);
    }
  }

  const payoutState = !connect
    ? ''
    : connect.connected && connect.onboardingComplete
      ? 'Connected — payouts enabled'
      : connect.connected
        ? 'Connected — setup not finished'
        : 'Not connected yet';

  // Shown until Stripe says onboarding is finished. "Connected but not
  // complete" is the commonest state — Stripe often needs a second visit for
  // ID or bank details — and it needs a louder prompt than a badge.
  const needsPayoutSetup = !!connect && !connect.onboardingComplete;

  return (
    <>
      <PageHead title="Your profile">
        What families see, and what we hold about your account.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card title="About you">
        {loading || !form ? (
          <Loading rows={4} />
        ) : (
          <>
            <Field label="Full name" hint="Your legal name, for our records. Families see your display name below.">
              <TextInput value={form.full_name} onChange={(v) => set('full_name', v)} />
            </Field>

            <Field
              label="Subjects and levels you teach"
              hint="Free text for now — one subject per student is still all the system can hold (SCRUM-XX38)."
            >
              <TextInput
                value={form.subjects}
                onChange={(v) => set('subjects', v)}
                placeholder="GCSE & A-Level Mathematics, GCSE Physics"
              />
            </Field>

            <Field label="Bio" hint="A few sentences for families — how you teach, and what you've taught.">
              <textarea
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="I've taught GCSE and A-Level Maths for six years…"
              />
            </Field>

            <Field label="WhatsApp number" hint="Optional. Shared with a family only once you have a lesson with them.">
              <TextInput
                value={form.whatsapp_number}
                onChange={(v) => set('whatsapp_number', v)}
                placeholder="+44…"
                inputMode="tel"
              />
            </Field>

            <label className="pf-checkbox">
              <input
                type="checkbox"
                checked={form.whatsapp_opted_in}
                onChange={(e) => set('whatsapp_opted_in', e.target.checked)}
              />
              <span>Let families I teach contact me on WhatsApp.</span>
            </label>

            <SaveBar busy={busy} dirty={dirty} saved={saved} error={saveError} onSave={save} />
          </>
        )}
      </Card>

      <Card title="Your account">
        {loading ? (
          <Loading rows={3} />
        ) : (
          <>
            <ReadOnly
              label="Display name"
              value={profile?.tutor_name}
              why="This is the name your lessons and Cal.com calendar are filed under, so changing it here would disconnect you from your own bookings. Email hello@seedsinstitute.co.uk and we'll change it everywhere at once."
            />
            <ReadOnly
              label="Email"
              value={profile?.email}
              why="The address you sign in with. Changing it needs verification — ask us."
            />
            <ReadOnly
              label="Payouts"
              value={payoutState ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Badge tone={connect?.onboardingComplete ? 'good' : 'warn'}>{payoutState}</Badge>
                  {needsPayoutSetup ? (
                    <button type="button" className="btn-xs" disabled={connectBusy} onClick={startConnect}>
                      {connectBusy
                        ? 'Opening…'
                        : connect.connected ? 'Finish payout setup →' : 'Set up payouts →'}
                    </button>
                  ) : null}
                </span>
              ) : ''}
              why={connect?.onboardingComplete && connect?.payoutCycle
                ? `Paid ${connect.payoutCycle}, automatically. Your bank details live with Stripe, never with us.`
                : needsPayoutSetup
                  ? 'Until this is finished we can’t send you money. Stripe collects your bank details directly — they never reach us.'
                  : 'Your bank details live with Stripe, never with us.'}
            />

            {connectNotice ? <p className="pf-hint" style={{ marginTop: 8 }}>{connectNotice}</p> : null}
            {connectError ? <p className="pf-err" style={{ marginTop: 8 }}>{connectError}</p> : null}
          </>
        )}
      </Card>

      <Card title="Not here yet">
        <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          Your photo, DBS status and expiry, exam boards and Cal.com links
          aren&rsquo;t editable from the portal yet — they&rsquo;re held outside your
          profile record and need endpoints that don&rsquo;t exist. Your public
          tutor page still uses the details we hold for you rather than what
          you set here. Email{' '}
          <a href="mailto:hello@seedsinstitute.co.uk">hello@seedsinstitute.co.uk</a> to
          change any of them.
        </p>
      </Card>
    </>
  );
}
