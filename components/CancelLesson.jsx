'use client';

import { useState } from 'react';
import { api, money } from '@/lib/api';

/**
 * Cancelling a lesson, for whoever is looking at it (SCRUM-99).
 *
 * The backend decides what a cancellation costs — this only has to make sure
 * the family knows before they commit rather than after. Seeds' policy is
 * that a family cancelling with at least 18 hours' notice isn't charged;
 * inside that, the tutor has almost certainly lost the slot, so the lesson is
 * charged in full and the tutor is paid for it.
 *
 * Telling someone that *after* they've clicked is how you turn a policy into
 * a complaint, so the confirmation says which of the two this is and what it
 * will cost.
 */

// Must match NOTICE_HOURS in the backend's lib/cancellationPolicy.js. The
// server stays authoritative — this figure only decides what warning to show,
// never what actually happens.
const NOTICE_HOURS = 18;

export default function CancelLesson({ booking, role = 'family', onDone, label = 'Cancel' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const startsIn = (new Date(booking.startTime).getTime() - Date.now()) / 3600000;
  const fee = booking.feePence || 0;

  // A tutor withdrawing never charges the family, and a free lesson has
  // nothing to charge, so neither warrants the warning.
  const chargeable = role === 'family' && fee > 0 && startsIn < NOTICE_HOURS;

  async function cancel() {
    const consequence = chargeable
      ? `\n\nIt starts in under ${NOTICE_HOURS} hours, so it will still be charged in full (${money(fee)}) — your tutor has already held the time.`
      : role === 'family'
        ? '\n\nYou won’t be charged.'
        : '\n\nThe family won’t be charged, and any payment is refunded.';

    if (!window.confirm(`Cancel this lesson?${consequence}`)) return;

    setBusy(true);
    setError('');
    try {
      await api('/api/lifecycle?resource=self-cancel-booking', {
        method: 'POST',
        body: { bookingId: booking.id },
      });
      onDone?.();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {error ? <span className="pf-err" style={{ fontSize: '.72rem' }}>{error}</span> : null}
      <button type="button" className="btn-xs danger" disabled={busy} onClick={cancel}>
        {busy ? 'Cancelling…' : label}
      </button>
    </span>
  );
}
