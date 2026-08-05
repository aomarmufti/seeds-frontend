'use client';

import { useState } from 'react';
import { api, money } from '@/lib/api';
import { Card, Badge, Empty, Loading, useAsync } from '@/components/ui';
import { Lessons } from '@/components/icons';

/**
 * What a family is actually enrolled for (SCRUM-100).
 *
 * This replaces two read-only fields that showed "—" for most families. They
 * read `profiles.subject` and `profiles.level`, which are empty for anyone
 * who didn't come through the old admin-create path and are, since the
 * enrolments migration, no longer where any of this lives.
 *
 * A student can hold several enrolments — Maths with one tutor, Arabic with
 * another — so this is a list rather than a pair of fields. That was the
 * whole point of the model change; the screen was the last thing still
 * insisting a family studies one subject.
 *
 * What a family may do here follows the rule in docs/MULTI-SUBJECT-DESIGN.md:
 * the student asks, the tutor teaches, the admin decides. So: ask for a
 * subject, pause one, end one. Not: pick a tutor, set a rate, or make a
 * request active. Ending is theirs deliberately — nobody should have to send
 * an email to stop being billed.
 */

const STATUS = {
  active: { label: 'Active', tone: 'good' },
  pending: { label: 'Waiting to be arranged', tone: 'warn' },
  paused: { label: 'Paused', tone: '' },
  ended: { label: 'Ended', tone: '' },
};

const LEVELS = ['KS3', 'GCSE', 'A-Level'];

export default function Enrolments() {
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null); // { tone: 'good' | 'bad', text }
  const [busyId, setBusyId] = useState(null);

  const { loading, error, data } = useAsync(
    () => api('/api/enrolments').catch(() => []),
    [reloadKey],
  );

  const enrolments = Array.isArray(data) ? data : [];
  // An ended enrolment is history, not a current arrangement — kept out of
  // the main list so a family's screen reflects what they're studying now.
  const current = enrolments.filter((e) => e.status !== 'ended');
  const ended = enrolments.filter((e) => e.status === 'ended');

  const refresh = () => setReloadKey((k) => k + 1);

  async function setStatus(enrolment, status, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(enrolment.id);
    setNotice(null);
    try {
      await api('/api/enrolments', { method: 'PATCH', body: { id: enrolment.id, status } });
      setNotice({ tone: 'good', text: status === 'ended' ? 'Ended. You won\'t be billed for it again.' : 'Paused.' });
      refresh();
    } catch (e) {
      setNotice({ tone: 'bad', text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  // ── Requesting another subject ────────────────────────────────────────────
  const [ask, setAsk] = useState({ open: false, subject: '', level: 'GCSE', busy: false, error: '' });

  async function requestSubject() {
    if (!ask.subject.trim()) {
      setAsk((a) => ({ ...a, error: 'Which subject would you like?' }));
      return;
    }
    setAsk((a) => ({ ...a, busy: true, error: '' }));
    try {
      await api('/api/enrolments', {
        method: 'POST',
        body: { subject: ask.subject.trim(), level: ask.level },
      });
      setAsk({ open: false, subject: '', level: 'GCSE', busy: false, error: '' });
      setNotice({ tone: 'good', text: 'Thanks — we\'ll find the right tutor and confirm the details with you.' });
      refresh();
    } catch (e) {
      setAsk((a) => ({ ...a, busy: false, error: e.message }));
    }
  }

  return (
    <Card
      title="What you're studying"
      action={
        <button type="button" className="card-link" onClick={() => setAsk((a) => ({ ...a, open: !a.open, error: '' }))}>
          {ask.open ? 'Cancel' : '+ Add a subject'}
        </button>
      }
    >
      {notice ? (
        <div
          className="error-note"
          style={{
            marginBottom: 12,
            ...(notice.tone === 'good' ? { background: 'var(--good-bg)', color: 'var(--good)' } : {}),
          }}
        >
          {notice.text}
        </div>
      ) : null}

      {loading ? (
        <Loading rows={2} />
      ) : error ? (
        <Empty>Couldn&rsquo;t load what you&rsquo;re studying.</Empty>
      ) : current.length === 0 ? (
        <Empty icon={Lessons}>
          Nothing set up yet. Once we&rsquo;ve arranged your first subject it appears here.
        </Empty>
      ) : (
        current.map((e) => {
          const s = STATUS[e.status] || { label: e.status, tone: '' };
          const tutorName = e.tutors?.name;
          return (
            <div key={e.id} className="sx-card-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                  {e.subject} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· {e.level}</span>
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', marginTop: 3 }}>
                  {tutorName
                    ? `with ${tutorName}`
                    : e.status === 'pending'
                      ? 'We’re finding you a tutor'
                      : 'No tutor assigned'}
                  {e.rate_pence ? ` · ${money(e.rate_pence)} per lesson` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone={s.tone}>{s.label}</Badge>
                {e.status === 'active' ? (
                  <button
                    type="button" className="btn-xs ghost" disabled={busyId === e.id}
                    onClick={() => setStatus(e, 'paused', `Pause ${e.subject}?\n\nWe'll keep your tutor and your history. You won't be billed for it while it's paused.`)}
                  >
                    Pause
                  </button>
                ) : e.status === 'paused' ? (
                  <span style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>Email us to restart</span>
                ) : null}
                {e.status !== 'ended' ? (
                  <button
                    type="button" className="btn-xs danger" disabled={busyId === e.id}
                    onClick={() => setStatus(e, 'ended', `End ${e.subject} for good?\n\nYour lessons and payment history are kept, but you won't be billed for it again. Starting it up later means asking us to set it up afresh.`)}
                  >
                    End
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      {ask.open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0EDE8' }}>
          {ask.error ? <div className="sx-error">{ask.error}</div> : null}
          <p style={{ margin: '0 0 10px', fontSize: '.8rem', color: 'var(--ink-3)' }}>
            Tell us what you&rsquo;d like to study and we&rsquo;ll match a tutor and confirm the
            rate before anything starts.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text" value={ask.subject}
              onChange={(ev) => setAsk((a) => ({ ...a, subject: ev.target.value }))}
              placeholder="Chemistry"
              style={{ flex: '1 1 180px', minWidth: 0 }}
              aria-label="Subject"
            />
            <select
              value={ask.level}
              onChange={(ev) => setAsk((a) => ({ ...a, level: ev.target.value }))}
              aria-label="Level"
              style={{
                padding: '9px 8px', border: '1.5px solid var(--line)', borderRadius: 7,
                fontSize: '.82rem', fontFamily: 'inherit', background: 'var(--surface)',
              }}
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <button
              type="button" className="sx-enter" style={{ width: 'auto', padding: '9px 20px' }}
              disabled={ask.busy} onClick={requestSubject}
            >
              {ask.busy ? 'Sending…' : 'Ask us'}
            </button>
          </div>
        </div>
      )}

      {ended.length > 0 && (
        <p style={{ margin: '14px 0 0', fontSize: '.76rem', color: 'var(--ink-3)' }}>
          {ended.length === 1 ? '1 subject you’ve finished' : `${ended.length} subjects you’ve finished`}
          {' — '}{ended.map((e) => e.subject).join(', ')}.
        </p>
      )}
    </Card>
  );
}
