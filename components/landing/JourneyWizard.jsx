'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// The 5-step "Start your journey" wizard from the legacy landing page
// (goStep/selectChip/toggleChip/submitJourney in legacy/src/modules/00).
// Progress percentages match the legacy bar exactly: 20/40/60/80/95/100.
//
// One deliberate behaviour change from legacy: a failed POST to /api/leads is
// surfaced to the visitor instead of being swallowed while the success panel
// shows anyway (flagged in the rebuild spec as a legacy bug, not a feature).

const SUBJECTS = ['Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Arabic'];
const LEVELS = ['KS3 (Yr 7–9)', 'GCSE (Yr 10–11)', 'A-Level (Yr 12–13)'];
const GOALS = [
  'Improve my grade',
  'Exam preparation',
  'Build confidence',
  'University application',
  'Catch up on gaps',
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PROGRESS = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 95, success: 100 };

export default function JourneyWizard() {
  const [step, setStep] = useState(1); // 1–5, then 'success'
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const progress = PROGRESS[step] ?? 20;
  const contactReady = name.trim() && email.trim().includes('@');

  function toggleDay(day) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function submit() {
    setSending(true);
    setError('');
    try {
      // Public endpoint — no auth, exactly as the legacy site called it.
      await api('/api/leads', {
        method: 'POST',
        auth: false,
        body: {
          name: name.trim(),
          email: email.trim(),
          subject,
          level,
          goal,
          availability: days,
        },
      });
      setStep('success');
    } catch (err) {
      setError(
        `Something went wrong sending your request (${err.message}). Please try again — or email hello@seedstuition.co.uk and we'll set everything up for you.`
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="journey-form-card">
      <div className="jf-progress">
        <div className="jf-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {step === 1 && (
        <div>
          <div className="jf-q">Which subject?</div>
          <div className="jf-hint">Select the subject you need help with</div>
          <div className="jf-chips">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`jf-chip${subject === s ? ' selected' : ''}`}
                onClick={() => setSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="jf-actions">
            <button type="button" className="jf-next" disabled={!subject} onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="jf-q">Which level?</div>
          <div className="jf-hint">What year / stage is the student at?</div>
          <div className="jf-chips">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={`jf-chip${level === l ? ' selected' : ''}`}
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="jf-actions">
            <button type="button" className="jf-back" onClick={() => setStep(1)}>← Back</button>
            <button type="button" className="jf-next" disabled={!level} onClick={() => setStep(3)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="jf-q">What&apos;s the main goal?</div>
          <div className="jf-hint">Pick the one that fits best</div>
          <div className="jf-chips">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                className={`jf-chip${goal === g ? ' selected' : ''}`}
                onClick={() => setGoal(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="jf-actions">
            <button type="button" className="jf-back" onClick={() => setStep(2)}>← Back</button>
            <button type="button" className="jf-next" disabled={!goal} onClick={() => setStep(4)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="jf-q">Best days for lessons?</div>
          <div className="jf-hint">Select all that could work — your tutor will confirm</div>
          <div className="jf-chips">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`jf-chip${days.includes(d) ? ' selected' : ''}`}
                onClick={() => toggleDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="jf-actions">
            <button type="button" className="jf-back" onClick={() => setStep(3)}>← Back</button>
            <button type="button" className="jf-next" disabled={days.length === 0} onClick={() => setStep(5)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <div className="jf-q">Almost there.</div>
          <div className="jf-hint">Where should your tutor reach out?</div>
          <input
            className="jf-input"
            type="text"
            placeholder="Parent / student name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="jf-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="jf-input"
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error ? <div className="jf-error">{error}</div> : null}
          <div className="jf-actions">
            <button type="button" className="jf-back" onClick={() => setStep(4)}>← Back</button>
            <button
              type="button"
              className="jf-next"
              disabled={!contactReady || sending}
              onClick={submit}
            >
              {sending ? 'Sending…' : 'Send my request →'}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="jf-success">
          <div className="jf-success-icon">🌱</div>
          <div className="jf-success-title">Your seed is planted.</div>
          <div className="jf-success-body">
            We&apos;ve received your request. A Seeds tutor will reach out within 24 hours to
            introduce themselves, confirm your schedule, and arrange your free first lesson.
            <br /><br />
            Check your inbox — a confirmation is on its way.
          </div>
        </div>
      )}
    </div>
  );
}
