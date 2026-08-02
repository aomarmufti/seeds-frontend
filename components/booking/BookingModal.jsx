'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, BACKEND } from '@/lib/api';
import { OPEN_BOOKING_EVENT } from '@/components/landing/BookButton';

// The public free-consultation booking wizard — a React port of legacy
// module 06 (bk-overlay / bkGoStep / loadCalWidget / completeBooking).
// Behaviour is carried over deliberately, including two quirks the backend
// depends on:
//   - the scheduling-link request uses lessonType=trial&context=consultation,
//     while the confirm payload says lessonType:'consultation'
//   - the Cal.com iframe sandbox deliberately omits allow-top-navigation
//     (SCRUM-79) so a redirect-after-booking on Cal.com's side can never
//     replace the whole site and wipe the wizard's state.
//
// These endpoints are public — no Authorization header, matching legacy.

const TUTORS = [
  { name: 'Azeem Omar-Mufti', subject: 'Mathematics', line: 'GCSE & A-Level Mathematics', av: 'AO', rating: '★ 4.9' },
  { name: 'Suleiman', subject: 'History & Arabic', line: 'GCSE & A-Level History, Arabic', av: 'S', rating: '★ 4.9' },
  { name: 'Abdul-Moez', subject: 'Chemistry & Biology', line: 'GCSE & A-Level Chemistry, Biology', av: 'AM', rating: '★ 4.9' },
  { name: 'Best available match', subject: 'Any subject', displayName: 'No preference', line: "We'll match the best specialist for you", av: '?', gold: true },
];

const TITLES = { 1: 'Choose your tutor', 2: 'Pick a date & time', 3: 'Your details', 4: 'Review & confirm' };

// Cal.com's embedded booking page posts a window message once a visitor
// finishes scheduling. Payload shape copied from the legacy parser — it was
// written to Cal.com's documented shape and tolerates the nesting variants.
function calParseBookingSuccess(eventData) {
  if (!eventData || typeof eventData !== 'object') return null;
  const type = eventData.type || (eventData.data && eventData.data.type);
  if (typeof type !== 'string' || !/bookingSuccessful/i.test(type)) return null;
  const data = eventData.data || eventData;
  const booking = data.booking || data;
  const startTime = booking.startTime || booking.start_time;
  const endTime = booking.endTime || booking.end_time;
  if (!startTime) return null;
  return { startTime, endTime };
}

const EMPTY_FORM = { studentName: '', yearGroup: '', parentName: '', phone: '', email: '', notes: '' };

export default function BookingModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1–4, then 'success'
  const [tutor, setTutor] = useState(TUTORS[0]);
  const [slot, setSlot] = useState(null); // { iso, day, time } chosen inside the Cal.com embed
  const [cal, setCal] = useState({ status: 'idle', url: '', message: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [step3Error, setStep3Error] = useState('');
  const [step4Error, setStep4Error] = useState('');
  const [confirming, setConfirming] = useState(false);

  const modalRef = useRef(null);
  const calLoadedFor = useRef(null);
  // The message listener is registered once; refs let it read live state.
  const openRef = useRef(open);
  openRef.current = open;

  const goStep = useCallback((n) => {
    setStep(n);
    if (modalRef.current) modalRef.current.scrollTop = 0;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
  }, []);

  // ── open/close wiring ──────────────────────────────────────────────────
  useEffect(() => {
    const onOpen = (e) => {
      const { tutor: tutorName, subject } = e.detail || {};
      if (tutorName) {
        const found = TUTORS.find((t) => t.name === tutorName);
        setTutor(found || { name: tutorName, subject: subject || 'Any subject', line: '', av: '?', gold: true });
      }
      // Clear any previously-picked slot so a fresh attempt never inherits
      // one from an earlier booking in the same page session (as legacy did).
      setSlot(null);
      calLoadedFor.current = null;
      setCal({ status: 'idle', url: '', message: '' });
      setStep3Error('');
      setStep4Error('');
      setConfirming(false);
      setOpen(true);
      document.body.style.overflow = 'hidden';
      goStep(1);
    };
    window.addEventListener(OPEN_BOOKING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BOOKING_EVENT, onOpen);
  }, [goStep]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // ── step 2: load the tutor's real availability in the Cal.com embed ────
  useEffect(() => {
    if (!open || step !== 2) return;
    // The cache key includes the lesson type alongside the tutor — switching
    // tutor on step 1 must reload the embed.
    const cacheKey = `${tutor.name}|trial`;
    if (calLoadedFor.current === cacheKey) return;

    let cancelled = false;
    setCal({ status: 'loading', url: '', message: `Loading ${tutor.name}'s availability…` });

    // api() rather than a bare fetch: its 15s AbortController is what keeps a
    // hung availability call from leaving the wizard on "Loading…" forever
    // (the SCRUM-60 failure mode lib/api.js was written to fix).
    api(
      `/api/bookings?action=scheduling-link&tutorName=${encodeURIComponent(tutor.name)}&lessonType=trial&context=consultation`,
      { auth: false }
    )
      .then((data) => {
        if (cancelled) return;
        calLoadedFor.current = cacheKey;
        // ?embed=true renders Cal.com's iframe-friendly layout (no site chrome).
        const sep = data.url.includes('?') ? '&' : '?';
        setCal({ status: 'ready', url: data.url + sep + 'embed=true', message: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        setCal({
          status: 'error',
          url: '',
          message: err.message || "We couldn't load real-time availability for this tutor. Please email hello@seedsinstitute.co.uk to arrange a time.",
        });
      });

    return () => { cancelled = true; };
  }, [open, step, tutor]);

  // ── Cal.com postMessage → auto-advance to details ──────────────────────
  useEffect(() => {
    const onMessage = (e) => {
      const booking = calParseBookingSuccess(e.data);
      if (!booking || !openRef.current) return;
      const d = new Date(booking.startTime);
      setSlot({
        iso: booking.startTime,
        day: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        time: d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
      });
      goStep(3);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [goStep]);

  // ── step 3 validation — student name, parent name and a valid email are
  // mandatory (we can't confirm a booking or send a calendar invite without
  // them). Messages are verbatim from the legacy validator.
  function validateStep3() {
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!form.studentName.trim() || !form.parentName.trim() || !form.email.trim()) {
      setStep3Error("Please fill in the student's name, your name, and your email address — these are required to confirm the booking.");
      return false;
    }
    if (!emailLooksValid) {
      setStep3Error("That email address doesn't look right — please double-check it.");
      return false;
    }
    setStep3Error('');
    return true;
  }

  // ── step 4: confirm ────────────────────────────────────────────────────
  async function completeBooking() {
    // Defence in depth — step 3 already gates on this.
    if (!validateStep3()) { goStep(3); return; }
    if (!slot) {
      setStep4Error('Something went wrong finding your chosen time — please go back and pick a slot again.');
      goStep(2);
      return;
    }

    // Raw fetch rather than lib/api's api() helper: the flow below needs the
    // HTTP status (409 = slot just gone → bounce back to step 2), which the
    // helper discards. Public endpoint, no auth header — as in legacy.
    setConfirming(true);
    setStep4Error('');
    try {
      const res = await fetch(`${BACKEND}/api/bookings?action=confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: form.studentName.trim(),
          parentName: form.parentName.trim(),
          parentEmail: form.email.trim(),
          parentPhone: form.phone.trim(),
          tutorName: tutor.name,
          subject: tutor.subject,
          lessonType: 'consultation',
          studentLevel: null,
          startTime: new Date(slot.iso).toISOString(),
          paymentIntentId: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setStep4Error((data.error || 'That slot was just taken.') + ' Please go back and choose a different time.');
          goStep(2);
          return;
        }
        throw new Error(data.error || 'Booking failed');
      }
      goStep('success');
    } catch (err) {
      setStep4Error(err.message);
    } finally {
      setConfirming(false);
    }
  }

  if (!open) return null;

  const confirmed = step === 'success';
  const segCount = confirmed ? 4 : step;

  return (
    <div
      className="bk-overlay"
      id="bk-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="bk-modal" role="dialog" aria-modal="true" ref={modalRef}>
        <div className="bk-header">
          <button type="button" className="bk-close" onClick={close} aria-label="Close">✕</button>
          <div className="bk-eyebrow">{confirmed ? 'Confirmed' : `Step ${step} of 4`}</div>
          <div className="bk-title">{confirmed ? '' : TITLES[step]}</div>
          <div className="bk-steps-track">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`bk-step-seg${i <= segCount ? ' bk-seg-active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="bk-body">
          {step === 1 && (
            <div id="bk-step-1">
              <span className="bk-label">Select a tutor</span>
              {TUTORS.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={`bk-tutor-opt${tutor.name === t.name ? ' bk-selected' : ''}`}
                  onClick={() => setTutor(t)}
                >
                  <div className={`bk-tutor-av${t.gold ? ' bk-av-gold' : ''}`}>{t.av}</div>
                  <div className="bk-tutor-info">
                    <div className="bk-tutor-name">{t.displayName || t.name}</div>
                    <div className="bk-tutor-subj">{t.line}</div>
                  </div>
                  {t.rating ? <div className="bk-tutor-rating">{t.rating}</div> : null}
                  <div className="bk-radio"><div className="bk-radio-dot" /></div>
                </button>
              ))}

              <span className="bk-label bk-label-gap">Get started — free, no card required</span>
              <div className="bk-type-card bk-selected">
                <div>
                  <div className="bk-type-name">Free consultation <span className="bk-type-tag">Popular</span></div>
                  <div className="bk-type-desc">15-min call · Tell us about your child&apos;s goals and we&apos;ll recommend a plan</div>
                </div>
                <div className="bk-type-price bk-free">Free</div>
              </div>
              <p className="bk-explainer">
                After your consultation, your tutor will book you a free 30-minute trial lesson
                from the Student Portal — no payment needed for either. Paid 1:1 and group lessons only
                start after that, billed automatically on a weekly or monthly cycle, never charged here.
              </p>

              <div className="bk-actions">
                <button type="button" className="bk-next-btn" onClick={() => goStep(2)}>Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div id="bk-step-2">
              <span className="bk-label">Pick a date &amp; time</span>
              {cal.status !== 'ready' && (
                <div className="bk-cal-status" id="bk-cal-status">{cal.message}</div>
              )}
              {cal.status === 'ready' && (
                <div id="bk-cal-wrap">
                  <iframe
                    title={`${tutor.name} availability`}
                    src={cal.url}
                    // SCRUM-79: allow-top-navigation is deliberately omitted so
                    // Cal.com can never redirect the whole page mid-wizard.
                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    style={{ width: '100%', minWidth: 280, height: 630, border: 'none' }}
                  />
                </div>
              )}
              <div className="bk-tz-note">🌍 Times shown in your local timezone · Lesson runs live on Google Meet</div>
              <div className="bk-actions">
                <button type="button" className="bk-back-btn" onClick={() => goStep(1)}>← Back</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div id="bk-step-3">
              <span className="bk-label">Student details</span>
              <div className="bk-input-row">
                <input
                  className="bk-input" type="text" placeholder="Student's first name *" required
                  id="bk-student-name"
                  value={form.studentName}
                  onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                />
                <input
                  className="bk-input" type="text" placeholder="Year group (e.g. Year 11)"
                  id="bk-year"
                  value={form.yearGroup}
                  onChange={(e) => setForm({ ...form, yearGroup: e.target.value })}
                />
              </div>
              <span className="bk-label">Parent / guardian contact</span>
              <div className="bk-input-row">
                <input
                  className="bk-input" type="text" placeholder="Full name *" required
                  id="bk-parent-name"
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                />
                <input
                  className="bk-input" type="tel" placeholder="Phone number"
                  id="bk-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <input
                className="bk-input" type="email" placeholder="Email address *" required
                id="bk-email"
                style={{ marginBottom: 4 }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <p className="bk-required-note">* Required — we need these to confirm your booking and send your calendar invite.</p>
              <span className="bk-label">Anything your tutor should know? <span className="bk-label-note">(optional)</span></span>
              <textarea
                className="bk-textarea" placeholder="E.g. exam board, specific topics, learning needs..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              {step3Error ? <div className="bk-error" id="bk-step3-error">{step3Error}</div> : null}
              <div className="bk-actions">
                <button type="button" className="bk-back-btn" onClick={() => goStep(2)}>← Back</button>
                <button type="button" className="bk-next-btn" onClick={() => { if (validateStep3()) goStep(4); }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div id="bk-step-4">
              <div className="bk-summary">
                <div className="bk-summary-row"><span className="bk-summary-label">Tutor</span><span className="bk-summary-value" id="bk-sum-tutor">{tutor.name}</span></div>
                <div className="bk-summary-row"><span className="bk-summary-label">Lesson type</span><span className="bk-summary-value" id="bk-sum-type">Free consultation (15-min call)</span></div>
                <div className="bk-summary-row"><span className="bk-summary-label">Date &amp; time</span><span className="bk-summary-value" id="bk-sum-time">{slot ? `${slot.day} · ${slot.time}` : '—'}</span></div>
                <div className="bk-summary-row"><span className="bk-summary-label">Student</span><span className="bk-summary-value" id="bk-sum-student">{form.studentName.trim() || 'Student'}</span></div>
                <div className="bk-summary-row bk-summary-total"><span>Total due today</span><span id="bk-sum-price">Free</span></div>
              </div>

              {step4Error ? <div className="bk-error bk-error-before" id="bk-step4-error">{step4Error}</div> : null}
              <button
                type="button"
                className="bk-next-btn bk-confirm-btn"
                id="bk-free-btn"
                disabled={confirming}
                onClick={completeBooking}
              >
                {confirming ? 'Confirming…' : 'Confirm Free Consultation →'}
              </button>
              <div className="bk-secure-note">No payment required · You can cancel or reschedule anytime</div>

              <div className="bk-actions bk-actions-gap">
                <button type="button" className="bk-back-btn" onClick={() => goStep(3)}>← Back</button>
              </div>
            </div>
          )}

          {confirmed && (
            <div className="bk-success" id="bk-step-success">
              <div className="bk-success-icon">🌱</div>
              <div className="bk-success-title">Consultation booked!</div>
              <div className="bk-success-body">
                A confirmation has been sent to your email with the call link. After we speak,
                your tutor will book you a free 30-minute trial lesson from your Student
                Portal — no payment needed for either session.
              </div>
              <div className="bk-success-card">
                <div className="bk-success-row"><span>Tutor</span><span id="bk-final-tutor">{tutor.name}</span></div>
                <div className="bk-success-row"><span>Date &amp; time</span><span id="bk-final-time">{slot ? `${slot.day} · ${slot.time}` : '—'}</span></div>
                <div className="bk-success-row"><span>Lesson</span><span id="bk-final-type">Free consultation (15-min call)</span></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="bk-back-btn" style={{ flex: 1 }} onClick={close}>Close</button>
                <button
                  type="button"
                  className="bk-next-btn"
                  onClick={() => {
                    close();
                    // Send the parent to signup prefilled with the same email
                    // they booked with — the backend links the consultation to
                    // their account by matching students.parent_email, so this
                    // is what makes the booking appear in their portal.
                    const q = `email=${encodeURIComponent(form.email.trim())}&name=${encodeURIComponent(form.parentName.trim())}`;
                    router.push(`/signup?${q}`);
                  }}
                >
                  View in Student Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
