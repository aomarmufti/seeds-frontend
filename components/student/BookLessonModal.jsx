'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { currentSession, currentProfile } from '@/lib/supabase';
import { hasUsedFreeLesson } from '@/lib/lessons';

// The full platform roster, used only as the fallback label source and for
// families who have not been assigned anyone yet. Which tutors a given
// student can actually book is derived per-student below — a hardcoded list
// meant a newly assigned tutor was invisible to the family assigned to them.
const ROSTER = [
  { name: 'Azeem Omar-Mufti', subject: 'Mathematics' },
  { name: 'Suleiman', subject: 'History & Arabic' },
  { name: 'Abdul-Moez', subject: 'Chemistry & Biology' },
];

function tutorLabel(name) {
  const known = ROSTER.find((t) => t.name === name);
  return known ? `${known.name} — ${known.subject}` : name;
}

/**
 * The tutors this family may book with: whoever admin assigned them, plus
 * anyone they have already had a lesson with. Falls back to the whole roster
 * only when neither exists, so a brand-new account can still reach someone.
 *
 * Assignment is a single field on the student record today, so this returns
 * at most one assigned tutor — multi-tutor support is backend work, see
 * docs/MULTI-SUBJECT-DESIGN.md.
 */
function bookableTutors(bookings, assignedTutor) {
  const names = [];
  if (assignedTutor) names.push(assignedTutor);
  for (const b of bookings) {
    if (b.tutorName && !names.includes(b.tutorName)) names.push(b.tutorName);
  }
  if (names.length === 0) return ROSTER.map((t) => t.name);
  return names;
}

// Prices are part of the label, as in legacy — GCSE £40 / A-Level £45 are
// the platform's pricing constants, not per-tutor data.
//
// Group sessions are deliberately absent (SCRUM-XX42a). A booking holds one
// student_id, so a session with N attendees needs N rows at the same time
// for the same tutor — and `bookings_no_tutor_overlap` is a gist exclusion
// constraint over exactly (tutor_name, start..end) for every non-cancelled
// booking, so the second attendee is refused. Offering it here sold a group
// session and created a 1:1 lesson at the group price. Withdrawn until the
// backend has a session attendees can join; existing group bookings still
// render everywhere (MonthCal legends, TYPE_LABEL) — this removes the way to
// create one, not the way to see one.
const PAID_TYPES = [
  { value: 'gcse', label: 'GCSE 1:1 — £40' },
  { value: 'alevel', label: 'A-Level 1:1 — £45' },
];

const FREE_TYPES = new Set(['trial', 'consultation']);

// Cal.com's embedded booking page posts a window message once a visitor
// finishes scheduling. Payload shape is best-effort (never verified against
// a live embed in the legacy environment either — see legacy
// src/modules/06-config.js); if it ever changes this returns null and the
// student simply picks the time and confirms manually instead of the modal
// hanging on a booking that went through on Cal.com's own calendar.
function calParseBookingSuccess(eventData) {
  if (!eventData || typeof eventData !== 'object') return null;
  const type = eventData.type || (eventData.data && eventData.data.type);
  if (typeof type !== 'string' || !/bookingSuccessful/i.test(type)) return null;
  const data = eventData.data || eventData;
  const booking = data.booking || data;
  const startTime = booking.startTime || booking.start_time;
  if (!startTime) return null;
  return { startTime };
}

/**
 * The student portal's "Book a lesson" modal, restored from the legacy
 * #sp-book-modal: tutor + subject + type, then the tutor's real Cal.com
 * availability in a sandboxed iframe, then confirm → POST /api/lifecycle.
 *
 * Eligibility rules are the legacy ones (SCRUM-69 / SCRUM-87), computed
 * from the student's own bookings rather than /api/leads: a free
 * consultation is offered only before they've had one, and a free trial
 * only after the consultation and before any trial. "Had one" excludes
 * cancelled bookings (SCRUM-XX41) — a lesson that never happened cannot
 * have been used up, and the database's own one-per-student index says the
 * same thing.
 */
export default function BookLessonModal({ open, onClose, bookings = [], onBooked }) {
  const [assignedTutor, setAssignedTutor] = useState('');
  const tutors = bookableTutors(bookings, assignedTutor);
  const [tutor, setTutor] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [weeks, setWeeks] = useState(1);
  const [embed, setEmbed] = useState({ status: 'loading', url: '', message: '' });
  const [startTime, setStartTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // A cancelled free lesson was never had, so it must not count against the
  // family's one consultation and one trial — see hasUsedFreeLesson for what
  // this still gets wrong (a no-show) and why that half is backend work.
  const hadConsultation = hasUsedFreeLesson(bookings, 'consultation');
  const hadTrial = hasUsedFreeLesson(bookings, 'trial');
  const types = [
    ...(!hadConsultation
      ? [{ value: 'consultation', label: 'Free initial consultation (15 min)' }] : []),
    ...(hadConsultation && !hadTrial
      ? [{ value: 'trial', label: 'Free trial lesson — £0' }] : []),
    ...PAID_TYPES,
  ];
  // Whatever is selected must always be a currently-offered type — e.g. the
  // consultation option disappears once one exists on the calendar.
  const effectiveType = types.some((t) => t.value === type) ? type : types[0].value;
  const isFree = FREE_TYPES.has(effectiveType);

  // Reset for each opening, and pre-fill the subject from existing bookings
  // as legacy did. Body scroll is locked while the modal is up.
  useEffect(() => {
    if (!open) return;
    setError('');
    setDone(false);
    setBusy(false);
    setStartTime(null);
    setWeeks(1);
    const subjects = [...new Set(bookings.map((b) => b.subject).filter(Boolean))];
    setSubject((s) => s || subjects[0] || '');

    // Who this family may book with comes from their own record, not a
    // hardcoded list: a tutor assigned by admin has to be reachable even
    // before the first lesson exists.
    let alive = true;
    (async () => {
      const profile = await currentProfile(await currentSession());
      if (alive) setAssignedTutor(profile?.assigned_tutor || '');
    })();

    document.body.style.overflow = 'hidden';
    return () => { alive = false; document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the selection valid as the bookable set resolves.
  useEffect(() => {
    if (!tutors.includes(tutor)) setTutor(tutors[0] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutors.join('|')]);

  // Load the tutor's real availability whenever tutor/type changes. A trial
  // and a paid lesson are different Cal.com event types, so type is part of
  // what must trigger a reload (the legacy cache key was tutor|type too).
  useEffect(() => {
    if (!open || done || !tutor) return;
    let alive = true;
    setStartTime(null);
    setEmbed({ status: 'loading', url: '', message: `Loading ${tutor}'s availability…` });
    api(`/api/bookings?action=scheduling-link&tutorName=${encodeURIComponent(tutor)}&lessonType=${encodeURIComponent(effectiveType)}`)
      .then((data) => {
        if (!alive) return;
        // ?embed=true renders Cal.com's iframe-friendly layout (no site
        // chrome around the booking calendar).
        const url = data.url + (data.url.includes('?') ? '&' : '?') + 'embed=true';
        setEmbed({ status: 'ready', url, message: '' });
      })
      .catch((e) => {
        if (!alive) return;
        setEmbed({
          status: 'error', url: '',
          message: e.message || "We couldn't load real-time availability for this tutor. Please email hello@seedsinstitute.co.uk to arrange a time.",
        });
      });
    return () => { alive = false; };
  }, [open, done, tutor, effectiveType]);

  // Listen for Cal.com's bookingSuccessful postMessage while open — this is
  // how the chosen slot gets back out of the sandboxed iframe.
  useEffect(() => {
    if (!open) return;
    const onMessage = (e) => {
      const booking = calParseBookingSuccess(e.data);
      if (booking) setStartTime(booking.startTime);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open]);

  if (!open) return null;

  async function submit() {
    setError('');
    if (!subject.trim()) { setError('Please enter a subject'); return; }
    if (!startTime) { setError('Please pick a time in the calendar above'); return; }
    setBusy(true);
    try {
      const session = await currentSession();
      const profile = await currentProfile(session);
      const studentName = profile?.full_name || session?.user?.email || '';

      // No studentId sent — the backend resolves (and self-heals, if this is
      // the family's first-ever lesson) the caller's own student record from
      // their verified session, rather than trusting a client-supplied id.
      await api('/api/lifecycle?resource=lessons', {
        method: 'POST',
        body: {
          studentName,
          tutorName: tutor,
          subject: subject.trim(),
          lessonType: effectiveType,
          startTime: new Date(startTime).toISOString(),
          recurringWeeks: weeks,
        },
      });
      setDone(true);
      onBooked?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const chosenLabel = startTime
    ? `✓ ${new Date(startTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(startTime).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`
    : '';

  return (
    <div className="sx-overlay" onClick={onClose}>
      <div
        className="sx-modal" role="dialog" aria-modal="true" aria-label="Book a lesson"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3>{done ? 'Requested' : 'Book a lesson'}</h3>
          <button type="button" className="sx-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {done ? (
          <>
            <div className="sx-success" style={{ marginTop: 12 }}>
              {isFree
                ? "✓ Requested! It's in your calendar now — your tutor will confirm shortly."
                : "✓ Lesson booked! It'll be included in your next billing cycle."}
            </div>
            <button type="button" className="sx-enter" style={{ marginTop: 14 }} onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <p className="sx-sub">
              Book a lesson with one of your tutors — it&rsquo;s billed automatically on your
              next billing date, not right now.
            </p>

            {error ? <div className="sx-error">{error}</div> : null}

            <span className="sx-label">Tutor</span>
            <select className="sx-input" value={tutor} onChange={(e) => setTutor(e.target.value)}>
              {tutors.map((name) => <option key={name} value={name}>{tutorLabel(name)}</option>)}
            </select>

            <span className="sx-label">Subject</span>
            <input
              className="sx-input" type="text" value={subject}
              placeholder="e.g. Mathematics"
              onChange={(e) => setSubject(e.target.value)}
            />

            <span className="sx-label">Lesson type</span>
            <select className="sx-input" value={effectiveType} onChange={(e) => setType(e.target.value)}>
              {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {/* Recurring was a DOM-injected monkey-patch in legacy (module
                19); here it's a first-class control. Paid lessons only —
                repeating a free consultation weekly makes no sense. */}
            {!isFree && (
              <>
                <span className="sx-label">Repeat weekly for</span>
                <select className="sx-input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                  {[1, 4, 8, 12].map((w) => (
                    <option key={w} value={w}>{w === 1 ? 'Just this once' : `${w} weeks`}</option>
                  ))}
                </select>
              </>
            )}

            <span className="sx-label">Pick a real available time</span>
            {startTime ? (
              <div className="sx-chosen">
                {chosenLabel}{' '}
                <button
                  type="button" className="card-link" style={{ marginLeft: 6 }}
                  onClick={() => setStartTime(null)}
                >
                  pick a different time
                </button>
              </div>
            ) : embed.status === 'ready' ? (
              <iframe
                title={`${tutor} availability`}
                src={embed.url}
                // Deliberately no allow-top-navigation (SCRUM-79): Cal.com's
                // post-booking redirect must not be able to navigate the
                // portal itself out from under the student.
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                style={{ width: '100%', minWidth: 280, height: 630, border: 'none' }}
              />
            ) : (
              <div className="sx-cal-status">{embed.message}</div>
            )}

            <div className="sx-note">
              {isFree
                ? '🌱 Completely free — no payment now or later. Your tutor confirms the time, and you\'ll see it in your calendar straight away as pending.'
                : '💳 No payment needed now — this lesson will be included in your next billing cycle (see Payments in your portal).'}
            </div>

            <button type="button" className="sx-enter" disabled={busy} onClick={submit}>
              {busy ? 'Requesting…' : isFree ? 'Request this time →' : 'Book lesson →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
