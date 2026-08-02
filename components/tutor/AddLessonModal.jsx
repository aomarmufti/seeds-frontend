'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { currentSession, currentProfile } from '@/lib/supabase';

// The tutor-side lesson types and their prices — the platform's pricing
// constants (rebuild spec §5), shown in the label as legacy did.
const TYPES = [
  { value: 'gcse', label: 'GCSE 1:1 — £40' },
  { value: 'alevel', label: 'A-Level 1:1 — £45' },
  { value: 'group', label: 'Group session — £20' },
  { value: 'trial', label: 'Free trial — £0' },
];

const FREE_TYPES = new Set(['trial']);

// Cal.com's embedded booking page posts a window message once a visitor
// finishes scheduling. Same best-effort parser the student booking modal
// uses — if the payload shape ever changes this returns null and the tutor
// picks the time and confirms manually instead of the modal hanging on a
// booking that went through on Cal.com's own calendar.
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
 * The tutor portal's "+ Add lesson" modal, restored from the legacy
 * #tp-add-lesson-modal (module 13): student + subject + type, then the
 * tutor's OWN real Cal.com availability in a sandboxed iframe — previously
 * a raw datetime-local the tutor could set to anything, with no check
 * against their own schedule — then confirm → POST /api/lifecycle.
 *
 * Students come from two places, and it has to be both: the roster of
 * families admin has assigned to this tutor, and anyone already in the
 * tutor's bookings. Deriving the list from bookings alone — as this modal
 * originally did — created a deadlock: a newly assigned student appeared on
 * "My students" but could never be given their first lesson, because they
 * had no booking yet and so were never offered in the select.
 *
 * Both sources must carry the student's *id*, not just their name. The
 * backend requires `studentId` from a tutor caller (api/lifecycle.js) —
 * only a family booking for themselves may omit it, because there the
 * record is resolved from their own verified email. A name-only submission
 * failed with "studentId required" for exactly the roster students the
 * fix above made bookable.
 */
export default function AddLessonModal({ open, onClose, bookings = [], onAdded }) {
  const [roster, setRoster] = useState([]);

  // Assigned families first (that is the deliberate act), then anyone else
  // this tutor has taught. Keyed by name because that is the only key the
  // two sources always share; the id is filled in from whichever source
  // has one, so a student known from both is still a single option.
  const students = (() => {
    const byName = new Map();
    const add = (id, name) => {
      if (!name) return;
      const existing = byName.get(name);
      if (existing) { if (!existing.id && id) existing.id = id; return; }
      byName.set(name, { id: id || '', name });
    };
    roster.forEach((st) => add(st.id, st.name));
    bookings.forEach((b) => add(b.studentId, b.studentName));
    return [...byName.values()];
  })();

  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('gcse');
  const [weeks, setWeeks] = useState(1);
  const [tutorName, setTutorName] = useState('');
  const [embed, setEmbed] = useState({ status: 'loading', url: '', message: '' });
  const [startTime, setStartTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const isFree = FREE_TYPES.has(type);

  // Reset for each opening, pre-fill the subject from existing bookings as
  // legacy did, and resolve the tutor's own name — profiles.tutor_name is
  // the display name Cal.com knows them by, full_name the fallback. Body
  // scroll is locked while the modal is up.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError('');
    setDone('');
    setBusy(false);
    setStartTime(null);
    setWeeks(1);
    setRoster([]);
    const subjects = [...new Set(bookings.map((b) => b.subject).filter(Boolean))];
    setSubject((s) => s || subjects[0] || '');
    setTutorName('');
    currentSession()
      .then((session) => currentProfile(session))
      .then(async (profile) => {
        const me = profile?.tutor_name || profile?.full_name || '';
        if (alive) setTutorName(me);
        if (!me) return;
        // Same source and same filter as the "My students" page, so the two
        // screens can never disagree about who this tutor teaches.
        const all = await api('/api/analytics?resource=students').catch(() => []);
        if (!alive) return;
        setRoster(
          (Array.isArray(all) ? all : [])
            .filter((st) => st.assigned_tutor === me
                         || (st.bookings || []).some((b) => b.tutor_name === me))
            .map((st) => ({ id: st.id, name: st.student_name }))
            .filter((st) => st.name),
        );
      })
      .catch(() => {});
    document.body.style.overflow = 'hidden';
    return () => { alive = false; document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!students.some((st) => st.name === studentName)) {
      setStudentName(students[0]?.name || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.map((st) => st.name).join('|')]);

  // Load the tutor's real availability whenever type changes or the name
  // resolves. A trial and a paid lesson are different Cal.com event types,
  // so type is part of what must trigger a reload (the legacy cache key was
  // tutor|type too).
  useEffect(() => {
    if (!open || done || !tutorName) return;
    let alive = true;
    setStartTime(null);
    setEmbed({ status: 'loading', url: '', message: 'Loading your availability…' });
    api(`/api/bookings?action=scheduling-link&tutorName=${encodeURIComponent(tutorName)}&lessonType=${encodeURIComponent(type)}`)
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
          message: e.message || "We couldn't load your real-time availability. Please email hello@seedsinstitute.co.uk to arrange this instead.",
        });
      });
    return () => { alive = false; };
  }, [open, done, type, tutorName]);

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
    if (!studentName) { setError('Please select a student'); return; }
    const student = students.find((st) => st.name === studentName);
    if (!student?.id) {
      // Better than letting the backend answer "studentId required", which
      // tells the tutor nothing they can act on.
      setError("We couldn't identify that student's record. Please refresh and try again, or email hello@seedsinstitute.co.uk.");
      return;
    }
    if (!subject.trim()) { setError('Please enter a subject'); return; }
    if (!startTime) { setError('Please pick a time in the calendar above'); return; }
    setBusy(true);
    try {
      // No per-lesson charge here — the lesson is billed automatically on
      // the family's next billing date, as in legacy tpCreateLesson.
      const data = await api('/api/lifecycle?resource=lessons', {
        method: 'POST',
        body: {
          studentId: student.id,
          studentName,
          tutorName,
          subject: subject.trim(),
          lessonType: type,
          startTime: new Date(startTime).toISOString(),
          recurringWeeks: isFree ? 1 : weeks,
        },
      });
      const payMsg = isFree ? ' Free lesson.' : " It'll be included in the family's next billing cycle.";
      setDone(`✓ ${data?.created || (isFree ? 1 : weeks)} lesson(s) added.${payMsg}`);
      onAdded?.();
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
    <div className="tx-overlay" onClick={onClose}>
      <div
        className="tx-modal" role="dialog" aria-modal="true" aria-label="Add lesson"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3>{done ? 'Added' : 'Add lesson'}</h3>
          <button type="button" className="tx-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {done ? (
          <>
            <div className="tx-success" style={{ marginTop: 12 }}>{done}</div>
            <button type="button" className="tx-enter" style={{ marginTop: 14 }} onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <p className="tx-sub">
              Schedule a lesson against your real availability — the family is billed
              automatically on their next billing date, not right now.
            </p>

            {error ? <div className="tx-error">{error}</div> : null}

            <span className="tx-label">Student</span>
            {students.length === 0 ? (
              <div className="tx-note" style={{ margin: '0 0 4px' }}>
                No students yet — they appear here as soon as admin assigns a family to you.
              </div>
            ) : (
              <select className="tx-input" value={studentName} onChange={(e) => setStudentName(e.target.value)}>
                {students.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            )}

            <span className="tx-label">Subject</span>
            <input
              className="tx-input" type="text" value={subject}
              placeholder="e.g. Mathematics"
              onChange={(e) => setSubject(e.target.value)}
            />

            <span className="tx-label">Lesson type</span>
            <select className="tx-input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {/* Paid lessons only — repeating a free trial weekly makes no
                sense. First-class control here; the equivalent in the
                student flow was a DOM-injected monkey-patch in legacy. */}
            {!isFree && (
              <>
                <span className="tx-label">Repeat weekly for</span>
                <select className="tx-input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                  {[1, 4, 8, 12].map((w) => (
                    <option key={w} value={w}>{w === 1 ? 'Just this once' : `${w} weeks`}</option>
                  ))}
                </select>
              </>
            )}

            <span className="tx-label">Pick a real available time</span>
            {startTime ? (
              <div className="tx-chosen">
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
                title="Your availability"
                src={embed.url}
                // Deliberately no allow-top-navigation (SCRUM-79): Cal.com's
                // post-booking redirect must not be able to navigate the
                // portal itself out from under the tutor. 480px as the
                // legacy tutor modal had it — narrower than the student's
                // 630px because this modal is slimmer.
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                style={{ width: '100%', minWidth: 280, height: 480, border: 'none' }}
              />
            ) : (
              <div className="tx-cal-status">{embed.message}</div>
            )}

            <div className="tx-note">
              {isFree
                ? '🌱 Completely free — the family is never charged for a trial.'
                : '💳 No payment is taken now — this lesson is included in the family\'s next billing cycle.'}
            </div>

            <button type="button" className="tx-enter" disabled={busy || students.length === 0} onClick={submit}>
              {busy ? 'Adding…' : 'Add to calendar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
