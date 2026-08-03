'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  loadOwnProfile, saveOwnProfile, formatTargetGrades, parseTargetGrades,
} from '@/lib/profile';
import { PageHead, Card, Loading, ErrorNote, useAsync } from '@/components/ui';
import { Field, TextInput, ReadOnly, SaveBar } from '@/components/profile/fields';
import Enrolments from '@/components/student/Enrolments';

/**
 * /student/profile (SCRUM-XX39) — the screen a parent needed and did not
 * have: somewhere to correct their own details without emailing.
 *
 * Split deliberately in two. "Your details" saves for real — those columns
 * live on `profiles`, which the browser may update for its own row. "Your
 * tuition" does not, and says why: subject, level and assigned tutor are
 * commercial facts admin owns, and the rest (parent phone, school,
 * safeguarding contact) lives on tables with no browser-facing write and no
 * endpoint yet. Showing those as greyed-out inputs would have been the
 * dishonest version.
 */
export default function StudentProfilePage() {
  const { loading, error, data } = useAsync(async () => {
    const profile = await loadOwnProfile();
    // Enriches the read-only half from what the family's own bookings
    // already say — the tutors they actually see, not just the one field.
    const bookings = await api('/api/analytics?resource=my-bookings').catch(() => null);
    const cycle = await api('/api/billing?resource=billing-cycle').catch(() => null);
    return {
      profile,
      bookings: bookings?.recentBookings ?? [],
      billingCycle: cycle?.billingCycle || '',
    };
  }, []);

  const profile = data?.profile;
  const bookings = data?.bookings ?? [];

  const [form, setForm] = useState(null);
  // What is currently stored, as far as we know. Compared against `form` to
  // decide whether there is anything to save, and moved forward on a
  // successful save so the button settles without a refetch.
  const [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!profile) return;
    const initial = {
      full_name: profile.full_name || '',
      school_year: profile.school_year || '',
      subjects: profile.subjects || '',
      targetGrades: formatTargetGrades(profile.target_grades),
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
    // Opting in without a number is not consent to anything reachable, so
    // the two travel together.
    const optedIn = form.whatsapp_opted_in && !!form.whatsapp_number.trim();
    const next = {
      full_name: form.full_name.trim(),
      school_year: form.school_year.trim(),
      subjects: form.subjects.trim(),
      targetGrades: form.targetGrades.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      whatsapp_opted_in: optedIn,
    };
    try {
      await saveOwnProfile('student', {
        full_name: next.full_name,
        school_year: next.school_year || null,
        subjects: next.subjects || null,
        target_grades: parseTargetGrades(next.targetGrades),
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

  // The tutors this family has actually seen, which is more useful than the
  // single assigned_tutor field when the two disagree.
  const taughtBy = [...new Set(bookings.map((b) => b.tutorName).filter(Boolean))];

  return (
    <>
      <PageHead title="Your profile">
        Your details, and what we hold about your tuition.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card title="Your details">
        {loading || !form ? (
          <Loading rows={4} />
        ) : (
          <>
            <Field label="Student name" hint="The name your tutor sees on the lesson.">
              <TextInput value={form.full_name} onChange={(v) => set('full_name', v)} />
            </Field>

            <Field label="School year" hint="e.g. Year 11, Year 13.">
              <TextInput
                value={form.school_year}
                onChange={(v) => set('school_year', v)}
                placeholder="Year 11"
              />
            </Field>

            <Field
              label="Subjects at school"
              hint="What they're studying. This is for your tutor's context — it doesn't change what you're enrolled for."
            >
              <TextInput
                value={form.subjects}
                onChange={(v) => set('subjects', v)}
                placeholder="Maths, Biology, Chemistry"
              />
            </Field>

            <Field label="Target grades" hint="One per subject, like “Maths: A*, Biology: A”.">
              <TextInput
                value={form.targetGrades}
                onChange={(v) => set('targetGrades', v)}
                placeholder="Maths: A*, Biology: A"
              />
            </Field>

            <Field label="WhatsApp number" hint="Optional. Only used for lesson reminders and changes.">
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
              <span>Send me lesson reminders on WhatsApp.</span>
            </label>

            <SaveBar busy={busy} dirty={dirty} saved={saved} error={saveError} onSave={save} />
          </>
        )}
      </Card>

      <Card title="Your tuition">
        {loading ? (
          <Loading rows={3} />
        ) : (
          <>
            <ReadOnly
              label="Email"
              value={profile?.email}
              why="Changing the address you sign in with needs verification — email hello@seedsinstitute.co.uk and we'll move it."
            />
            {/* Subject, level and tutor used to sit here as three read-only
                fields sourced from profiles.subject / .level, which are empty
                for most families and — since the enrolments migration — are
                not where any of this lives. They're a list of their own now,
                below, because a family can study more than one thing. */}
            <ReadOnly
              label="Your tutors"
              value={taughtBy.join(', ')}
              why="Tutors are matched by us, so we can keep an eye on capacity and fit. Tell us if it isn't working and we'll move you."
            />
            <ReadOnly
              label="Billing cycle"
              value={data?.billingCycle ? `Billed ${data.billingCycle}` : ''}
              why={<>Change this on the <Link href="/student/payments">Payments</Link> page.</>}
            />
          </>
        )}
      </Card>

      <Enrolments />

      <Card title="Not here yet">
        <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          Parent name and phone, school, exam board per subject and your
          safeguarding contact are held against your family record, which the
          portal can read but not yet write. Email{' '}
          <a href="mailto:hello@seedsinstitute.co.uk">hello@seedsinstitute.co.uk</a> to
          change any of those and we&rsquo;ll do it the same day.
        </p>
      </Card>
    </>
  );
}
