'use client';

import { useState, useMemo } from 'react';
import { api, money, lessonTime } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Badge, Button,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Lessons, Alert, Payments } from '@/components/icons';

const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

const OUTCOME = {
  delivered: { label: 'Taught', tone: 'good' },
  partial: { label: 'Cut short', tone: 'good' },
  no_show: { label: 'No-show', tone: 'warn' },
  late_cancelled: { label: 'Late cancellation', tone: 'warn' },
  cancelled_mutual: { label: 'Cancelled', tone: '' },
  tutor_cancelled: { label: 'Tutor cancelled', tone: '' },
  waived: { label: 'Waived', tone: '' },
};

const PAYMENT = {
  paid: { label: 'Paid', tone: 'good' },
  unbilled: { label: 'Unbilled', tone: '' },
  payment_link_sent: { label: 'Awaiting payment', tone: 'warn' },
  failed: { label: 'Failed', tone: 'bad' },
  refunded: { label: 'Refunded', tone: '' },
};

const FILTERS = [
  { key: 'awaiting', label: 'Awaiting outcome' },
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'unpaid', label: 'Unpaid' },
];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState('awaiting');
  const { loading, error, data } = useAsync(() => api('/api/analytics'), []);

  const bookings = useMemo(() => data?.recentBookings || [], [data]);
  const now = Date.now();

  // Lessons that finished with nobody saying what happened. These are stuck:
  // invisible to both the billing and payout sweeps until someone answers, so
  // they are the default view rather than something to go looking for.
  const awaiting = bookings.filter(
    (b) => b.endTime && new Date(b.endTime).getTime() < now && !b.deliveryStatus
        && b.status !== 'cancelled' && b.status !== 'requested',
  );
  const upcoming = bookings.filter((b) => b.startTime && new Date(b.startTime).getTime() >= now);
  const unpaid = bookings.filter(
    (b) => BILLABLE.includes(b.deliveryStatus) && b.paymentStatus !== 'paid',
  );

  const shown = filter === 'awaiting' ? awaiting
    : filter === 'upcoming' ? upcoming
    : filter === 'unpaid' ? unpaid
    : bookings;

  const unpaidPence = unpaid.reduce((s, b) => s + (b.feePence || 0), 0);

  return (
    <>
      <PageHead title="Bookings">
        Every lesson on the platform. Anything without a recorded outcome is stuck — it can&rsquo;t be
        billed or paid out until someone answers for it.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <KpiRow cols={4}>
        <Kpi label="Awaiting outcome" value={awaiting.length} icon={Alert} />
        <Kpi label="Upcoming" value={upcoming.length} icon={Lessons} />
        <Kpi label="Billable, unpaid" value={unpaid.length} icon={Payments} />
        <Kpi label="Value unpaid" value={money(unpaidPence)} />
      </KpiRow>

      <Card
        title={`${FILTERS.find((f) => f.key === filter)?.label} (${shown.length})`}
        action={
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? '' : 'ghost'}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </span>
        }
      >
        {loading ? (
          <Loading rows={5} />
        ) : shown.length === 0 ? (
          <Empty icon={Lessons}>
            {filter === 'awaiting'
              ? 'Nothing outstanding — every finished lesson has been answered for.'
              : 'Nothing here.'}
          </Empty>
        ) : (
          <Table head={['Student', 'Tutor', 'Subject', 'When', 'Fee', 'Outcome', 'Payment']}>
            {shown.slice(0, 60).map((b) => {
              const o = b.deliveryStatus ? OUTCOME[b.deliveryStatus] : null;
              const p = PAYMENT[b.paymentStatus] || { label: b.paymentStatus || '—', tone: '' };
              return (
                <tr key={b.id}>
                  <td>{b.studentName || '—'}</td>
                  <td>{b.tutorName || '—'}</td>
                  <td>{b.subject || '—'}</td>
                  <td>{lessonTime(b.startTime)}</td>
                  <td className="num">{money(b.feePence)}</td>
                  <td>
                    {o ? <Badge tone={o.tone}>{o.label}</Badge> : <Badge tone="warn">Awaiting</Badge>}
                  </td>
                  <td><Badge tone={p.tone}>{p.label}</Badge></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
