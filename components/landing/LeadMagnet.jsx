'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { CONTACT_EMAIL } from '@/lib/site';

// SCRUM-XX14 — email capture for the ~95% who will not book today.
//
// The site had exactly two ways to leave a trace: book a consultation, or
// finish the five-step wizard. Both ask a parent who is still deciding to
// commit to being contacted. This asks for one field in exchange for
// something they actually want, and it stores as an ordinary lead so it lands
// in the same /admin/leads screen the team already works from.
//
// The pack itself is fulfilled by email, so nothing here promises an instant
// download the backend cannot deliver.

const BOARDS = ['AQA', 'Edexcel', 'OCR', 'Not sure'];

export default function LeadMagnet() {
  const [email, setEmail] = useState('');
  const [board, setBoard] = useState(BOARDS[0]);
  const [state, setState] = useState({ status: 'idle', message: '' });

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(e) {
    e.preventDefault();
    if (!valid || state.status === 'sending') return;
    setState({ status: 'sending', message: '' });
    try {
      await api('/api/leads', {
        method: 'POST',
        auth: false,
        body: {
          name: '',
          email: email.trim(),
          subject: 'Past paper pack',
          level: board,
          goal: 'Past paper pack request',
        },
      });
      setState({ status: 'done', message: '' });
    } catch (err) {
      // A swallowed failure here would look like success and quietly lose the
      // lead, so the parent gets a way through either way.
      setState({
        status: 'error',
        message: `We couldn't save that (${err.message}). Email ${CONTACT_EMAIL} and we'll send the pack over.`,
      });
    }
  }

  if (state.status === 'done') {
    return (
      <div className="magnet-card magnet-done">
        <div className="magnet-tick" aria-hidden="true">✦</div>
        <div>
          <div className="magnet-title">On its way.</div>
          <p className="magnet-body">
            We&apos;ll email your {board === 'Not sure' ? '' : `${board} `}past-paper pack shortly.
            No spam, and you can unsubscribe from the first email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="magnet-card" onSubmit={submit}>
      <div>
        <div className="magnet-title">Free past-paper pack</div>
        <p className="magnet-body">
          Real GCSE and A-Level past papers by exam board, with mark schemes and the examiner
          notes we use in lessons. Sent by email — no account needed.
        </p>
      </div>

      <div className="magnet-row">
        <label className="magnet-field">
          <span className="magnet-label">Exam board</span>
          <select value={board} onChange={(e) => setBoard(e.target.value)} className="magnet-select">
            {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="magnet-field magnet-grow">
          <span className="magnet-label">Your email</span>
          <input
            type="email"
            className="magnet-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          className="magnet-btn"
          disabled={!valid || state.status === 'sending'}
        >
          {state.status === 'sending' ? 'Sending…' : 'Send it to me'}
        </button>
      </div>

      {state.status === 'error' ? <div className="magnet-error">{state.message}</div> : null}
    </form>
  );
}
