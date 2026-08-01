'use client';

import Link from 'next/link';
import { api, lessonTime, money } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Badge,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Calendar, Lessons, Alert, User, Payments } from '@/components/icons';

// SCRUM-XX23 — the one screen to open with morning coffee.
//
// Running the business from the Leads and Bookings lists means answering
// "what needs me today?" by scanning two tables and doing the date arithmetic
// in your head. Everything here is derived from endpoints the admin portal
// already calls; nothing new is asked of the backend.
//
// The three things that cost money when missed, in order:
//   1. signups waiting on approval — a parent who cannot use what they booked
//   2. finished lessons with no recorded outcome — unbilled, unpayable
//   3. today's lessons — what is actually happening in the next few hours

const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
}

export default function AdminTodayPage() {
  const { loading, error, data } = useAsync(async () => {
    const [analytics, pending, leads] = await Promise.all([
      api('/api/analytics'),
      api('/api/analytics?resource=pending-profiles').catch(() => []),
      api('/api/leads').catch(() => []),
    ]);
    return {
      bookings: analytics?.recentBookings || [],
      pending: Array.isArray(pending) ? pending : [],
      leads: Array.isArray(leads) ? leads : [],
    };
  }, []);

  const bookings = data?.bookings ?? [];
  const pending = data?.pending ?? [];
  const leads = data?.leads ?? [];
  const now = Date.now();

  const today = bookings
    .filter((b) => isToday(b.startTime) && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // Finished, nobody said what happened: invisible to both the billing and
  // the payout sweep until someone answers for it.
  const unrecorded = bookings.filter(
    (b) => b.endTime && new Date(b.endTime).getTime() < now && !b.deliveryStatus
        && b.status !== 'cancelled' && b.status !== 'requested',
  );

  const unpaid = bookings.filter(
    (b) => BILLABLE.includes(b.deliveryStatus) && b.paymentStatus !== 'paid',
  );
  const unpaidPence = unpaid.reduce((sum, b) => sum + (b.feePence || 0), 0);

  const newLeads = leads.filter((l) => !l.status || l.status === 'new');

  return (
    <>
      <PageHead title="Today">
        What needs you, in the order it costs money when it doesn&rsquo;t get done.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <KpiRow cols={4}>
        <Kpi label="Lessons today" value={loading ? '—' : today.length} icon={Calendar} />
        <Kpi label="Awaiting approval" value={loading ? '—' : pending.length} icon={User} />
        <Kpi label="Outcomes not recorded" value={loading ? '—' : unrecorded.length} icon={Alert} />
        <Kpi label="Not yet charged" value={loading ? '—' : money(unpaidPence)} icon={Payments} />
      </KpiRow>

      <Card
        title={loading ? 'Waiting on you' : `Waiting on you (${pending.length})`}
        action={<Link className="btn-xs ghost" href="/admin/leads">Open leads</Link>}
      >
        {loading ? (
          <Loading rows={2} />
        ) : pending.length === 0 ? (
          <Empty icon={User}>Nobody is waiting on an account. Good.</Empty>
        ) : (
          <Table head={['Name', 'Email', '']}>
            {pending.slice(0, 10).map((p) => (
              <tr key={p.id}>
                <td>{p.full_name || '—'}</td>
                <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{p.email}</td>
                <td style={{ textAlign: 'right' }}>
                  <Link className="btn-xs ghost" href="/admin/leads">Approve →</Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title={loading ? 'Unrecorded outcomes' : `Unrecorded outcomes (${unrecorded.length})`}
        action={<Link className="btn-xs ghost" href="/admin/bookings">Open bookings</Link>}
        style={unrecorded.length > 0 ? { borderColor: 'var(--gold)' } : undefined}
      >
        {loading ? (
          <Loading rows={2} />
        ) : unrecorded.length === 0 ? (
          <Empty icon={Alert}>Every finished lesson has been answered for.</Empty>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: '.83rem', color: 'var(--ink-3)' }}>
              Until a tutor records what happened, these can&rsquo;t be billed to the family or
              paid out to the tutor.
            </p>
            <Table head={['Student', 'Tutor', 'Subject', 'When', 'Fee']}>
              {unrecorded.slice(0, 15).map((b) => (
                <tr key={b.id}>
                  <td>{b.studentName || '—'}</td>
                  <td>{b.tutorName || '—'}</td>
                  <td>{b.subject || 'Lesson'}</td>
                  <td>{lessonTime(b.startTime)}</td>
                  <td>{money(b.feePence)}</td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </Card>

      <Card title={loading ? "Today's lessons" : `Today's lessons (${today.length})`}>
        {loading ? (
          <Loading rows={3} />
        ) : today.length === 0 ? (
          <Empty icon={Lessons}>Nothing scheduled today.</Empty>
        ) : (
          <Table head={['Time', 'Student', 'Tutor', 'Subject', 'Status']}>
            {today.map((b) => (
              <tr key={b.id}>
                <td>{lessonTime(b.startTime)}</td>
                <td>{b.studentName || '—'}</td>
                <td>{b.tutorName || '—'}</td>
                <td>{b.subject || 'Lesson'}</td>
                <td>
                  <Badge tone={b.status === 'requested' ? 'warn' : 'good'}>
                    {b.status === 'requested' ? 'Unconfirmed' : 'Confirmed'}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title={loading ? 'New enquiries' : `New enquiries (${newLeads.length})`}
        action={<Link className="btn-xs ghost" href="/admin/leads">Open leads</Link>}
      >
        {loading ? (
          <Loading rows={2} />
        ) : newLeads.length === 0 ? (
          <Empty icon={Lessons}>No new enquiries.</Empty>
        ) : (
          <Table head={['Name', 'Email', 'Wants']}>
            {newLeads.slice(0, 10).map((l) => (
              <tr key={l.id}>
                <td>{l.name || '—'}</td>
                <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{l.email}</td>
                <td>{[l.subject, l.level].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
