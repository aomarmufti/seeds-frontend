'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { isFreeLesson, lessonLabel } from '@/lib/lessons';

// Every outcome a real week of teaching produces, and what each does to the
// money. The tutor used to get two buttons — "Taught" and "No-show" — both of
// which bill the family in full, so anything that wasn't a clean lesson had to
// be forced into one of them or left unanswered forever.
//
// Whether an option charges is stated on the option itself, because that is
// the actual decision being made. It belongs next to the choice, not in a
// policy document nobody opens.
const OUTCOMES = [
  { key: 'delivered',        label: 'Taught as planned',            bills: true,
    detail: 'Charged as normal. You get paid for it.' },
  { key: 'partial',          label: 'Cut short by the student',     bills: true,
    detail: 'Charged in full — you held and delivered the slot.' },
  { key: 'no_show',          label: 'Student didn’t turn up',       bills: true,
    detail: 'Charged in full — you held the slot. You still get paid.' },
  { key: 'cancelled_mutual', label: 'Cancelled by agreement',       bills: false,
    detail: 'Nobody is charged and nobody is paid.' },
  { key: 'tutor_cancelled',  label: 'I cancelled / couldn’t make it', bills: false,
    detail: 'Nobody is charged and nobody is paid.' },
  { key: 'waived',           label: 'Waive this one (goodwill)',    bills: false,
    detail: 'Nobody is charged and nobody is paid.' },
];

// A consultation or trial lesson is free, so none of the money copy above is
// true for it: telling a tutor that a free consultation will be "charged in
// full" is alarming and wrong, and it is the reason a tutor hesitates to
// record the outcome at all. The outcome keys stay identical — the backend's
// meaning of "delivered" does not change — only what the tutor is told.
const FREE_DETAIL = {
  delivered:         'Free lesson — nobody is charged. Recorded so it counts as used.',
  partial:           'Free lesson — nobody is charged.',
  no_show:           'Free lesson — nobody is charged. Recorded so you can follow up.',
  cancelled_mutual:  'Nobody is charged and nobody is paid.',
  tutor_cancelled:   'Nobody is charged and nobody is paid.',
  waived:            'Nobody is charged and nobody is paid.',
};

// 'late_cancelled' is deliberately absent. It is written only by the
// cancellation path, the one place that can measure notice against the
// lesson's start time — otherwise "they cancelled late" becomes a claim
// anyone can make after the fact.

export default function OutcomeDialog({ booking, onClose, onSaved }) {
  const free = isFreeLesson(booking);
  const options = OUTCOMES.map((o) => (
    free ? { ...o, bills: false, detail: FREE_DETAIL[o.key] } : o
  ));

  const [outcome, setOutcome] = useState('delivered');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true);
    setError('');
    try {
      await api('/api/lifecycle?resource=mark-delivered', {
        method: 'POST',
        body: { bookingId: booking.id, outcome, note: note.trim() || null },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,27,42,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 9000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-title"
        tabIndex={-1}
        style={{
          background: 'var(--surface)', borderRadius: 16, padding: '24px 26px',
          width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h2 id="outcome-title" style={{ margin: '0 0 2px', fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
          What happened?
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '.8rem', color: 'var(--ink-3)' }}>
          {booking.studentName || 'This lesson'} ·{' '}
          {free
            ? `${lessonLabel(booking)} — free, so nobody is charged whichever you pick`
            : 'this decides whether the family is charged'}
        </p>

        <div role="radiogroup" aria-labelledby="outcome-title" style={{ display: 'grid', gap: 7 }}>
          {options.map((o) => {
            const selected = outcome === o.key;
            return (
              <label
                key={o.key}
                style={{
                  display: 'flex', gap: 11, alignItems: 'flex-start',
                  padding: '11px 13px', cursor: 'pointer',
                  border: `1.5px solid ${selected ? 'var(--navy)' : 'var(--line)'}`,
                  borderRadius: 10,
                  background: selected ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <input
                  type="radio" name="outcome" value={o.key} checked={selected}
                  onChange={() => setOutcome(o.key)}
                  style={{ marginTop: 3, accentColor: 'var(--navy)' }}
                />
                <span>
                  <span style={{ display: 'block', fontWeight: 650, fontSize: '.85rem' }}>{o.label}</span>
                  <span style={{ display: 'block', fontSize: '.75rem', marginTop: 1,
                                 color: o.bills ? 'var(--gold-ink)' : 'var(--ink-3)' }}>
                    {o.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <label className="field" style={{ marginTop: 14 }}>
          <span>Note (optional)</span>
          <input
            type="text" maxLength={500} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything worth recording"
          />
        </label>

        {error ? <div className="error-note" style={{ marginTop: 10 }}>{error}</div> : null}

        <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
          <Button size="lg" onClick={save} disabled={busy} style={{ flex: 1 }}>
            {busy ? 'Saving…' : 'Save outcome'}
          </Button>
          <Button size="lg" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
