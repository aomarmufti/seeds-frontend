'use client';

import { useState, useCallback } from 'react';
import { api, money } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Avatar, Badge, Button,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Tutors, Earnings } from '@/components/icons';

const TUTOR_SHARE = 0.78;
const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

// Payouts are automatic on an admin-set cadence. There is deliberately no
// "request payout" control — a tutor asking for money they are already owed on
// a schedule was work for both sides that the schedule already does.
const CYCLES = ['weekly', 'monthly'];

export default function AdminTutorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    const [accounts, analytics] = await Promise.all([
      api('/api/analytics?resource=accounts'),
      api('/api/analytics').catch(() => ({ recentBookings: [] })),
    ]);
    return {
      tutors: (Array.isArray(accounts) ? accounts : []).filter((a) => a.role === 'tutor'),
      bookings: analytics?.recentBookings || [],
    };
  }, [refreshKey]);

  const { loading, error, data } = useAsync(load, [refreshKey]);
  const tutors = data?.tutors ?? [];
  const bookings = data?.bookings ?? [];

  async function setCycle(tutorName, payoutCycle) {
    setBusy(tutorName);
    setActionError('');
    try {
      await api('/api/payouts', {
        method: 'POST',
        body: { action: 'set-payout-cycle', tutorName, payoutCycle },
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(null);
    }
  }

  // ── Removing a tutor account (SCRUM-97) ───────────────────────────────────
  // Deactivating keeps everything they taught and were paid; deleting is for
  // an account that never got started. bookings.tutor_name is a plain string
  // with no foreign key, so nothing at the database level would stop a delete
  // orphaning their lessons — the server checks instead, and refuses.
  const [notice, setNotice] = useState(null); // { tone: 'good' | 'bad', text }

  async function runAction(name, userId, body, confirmText, successText) {
    if (!window.confirm(confirmText)) return;
    setBusy(name);
    setNotice(null);
    setActionError('');
    try {
      await api('/api/auth', { method: 'POST', body });
      setNotice({ tone: 'good', text: successText });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setNotice({ tone: 'bad', text: err.message });
    } finally {
      setBusy(null);
    }
  }

  const deactivateTutor = (t, name) => runAction(
    name, t.id,
    { action: 'deactivate-tutor', userId: t.id },
    `Deactivate ${name}?\n\nThey won't be able to sign in. Their lessons, earnings and payout history are all kept.`,
    `${name} deactivated.`,
  );

  const deleteTutor = (t, name) => runAction(
    name, t.id,
    { action: 'delete-tutor', userId: t.id, tutorName: name },
    `Permanently delete ${name}?\n\nThis cannot be undone. It will be refused if they have taught any lessons or been paid — deactivate those instead.`,
    `${name} deleted.`,
  );

  const owedByTutor = (name) => {
    const theirs = bookings.filter(
      (b) => (b.tutorName || b.tutor_name) === name && BILLABLE.includes(b.deliveryStatus),
    );
    return Math.round(theirs.reduce((s, b) => s + (b.feePence || 0), 0) * TUTOR_SHARE);
  };

  const totalOwed = tutors.reduce((s, t) => s + owedByTutor(t.tutorName || t.fullName), 0);

  return (
    <>
      <PageHead title="Tutors &amp; payouts">
        Every tutor account, what they&rsquo;ve earned, and how often they&rsquo;re paid.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {notice ? (
        <div
          className="error-note"
          style={{
            marginBottom: 14,
            ...(notice.tone === 'good' ? { background: 'var(--good-bg)', color: 'var(--good)' } : {}),
          }}
        >
          {notice.text}
        </div>
      ) : null}
      {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

      <KpiRow cols={3}>
        <Kpi label="Tutors" value={tutors.length} icon={Tutors} />
        <Kpi label="Owed to tutors" value={money(totalOwed)} icon={Earnings} />
        <Kpi label="Seeds share" value={money(Math.round(totalOwed / TUTOR_SHARE - totalOwed))} />
      </KpiRow>

      <Card title={loading ? 'Tutors' : `Tutors (${tutors.length})`}>
        {loading ? (
          <Loading rows={3} />
        ) : tutors.length === 0 ? (
          <Empty icon={Tutors}>No tutor accounts yet.</Empty>
        ) : (
          <Table head={['Tutor', 'Email', 'Lessons', 'Earned', 'Payout cycle', 'Stripe', '']}>
            {tutors.map((t) => {
              const name = t.tutorName || t.fullName;
              const theirs = bookings.filter(
                (b) => (b.tutorName || b.tutor_name) === name && BILLABLE.includes(b.deliveryStatus),
              );
              return (
                <tr key={t.id || name}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar name={name} />
                      {name || '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{t.email || '—'}</td>
                  <td className="num">{theirs.length}</td>
                  <td className="num">{money(owedByTutor(name))}</td>
                  <td>
                    <span style={{ display: 'flex', gap: 5 }}>
                      {CYCLES.map((c) => (
                        <Button
                          key={c}
                          data-cycle={c}
                          variant={(t.payoutCycle || 'weekly') === c ? '' : 'ghost'}
                          disabled={busy === name}
                          onClick={() => setCycle(name, c)}
                        >
                          {c === 'weekly' ? 'Weekly' : 'Monthly'}
                        </Button>
                      ))}
                    </span>
                  </td>
                  <td>
                    {t.stripeAccountId
                      ? <Badge tone="good">Connected</Badge>
                      : <Badge tone="warn">Not set up</Badge>}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button" className="btn-xs ghost"
                        disabled={busy === name}
                        onClick={() => deactivateTutor(t, name)}
                      >
                        Deactivate
                      </button>
                      <button
                        type="button" className="btn-xs danger"
                        disabled={busy === name}
                        onClick={() => deleteTutor(t, name)}
                      >
                        {busy === name ? '…' : 'Delete'}
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
