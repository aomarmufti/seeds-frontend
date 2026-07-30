'use client';

import { api, money, longDate, lessonTime } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Badge,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Payments, Lessons } from '@/components/icons';

// How a billing batch reads to the person paying it. "payment_link_sent"
// tells a parent nothing; "awaiting payment" tells them what to do.
const BATCH_STATUS = {
  paid: { label: 'Paid', tone: 'good' },
  payment_link_sent: { label: 'Awaiting payment', tone: 'warn' },
  failed: { label: 'Payment failed', tone: 'bad' },
  refunded: { label: 'Refunded', tone: '' },
  pending: { label: 'Pending', tone: '' },
};

// Only these outcomes are billed — must match BILLABLE_OUTCOMES in the
// backend's lib/cancellationPolicy.js.
const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

export default function StudentPaymentsPage() {
  const { loading, error, data } = useAsync(async () => {
    const [billing, bookings] = await Promise.all([
      api('/api/billing?resource=billing-history'),
      api('/api/analytics?resource=my-bookings').catch(() => ({ recentBookings: [] })),
    ]);
    return {
      batches: billing?.batches || [],
      bookings: bookings?.recentBookings || [],
    };
  }, []);

  const batches = data?.batches ?? [];
  const bookings = data?.bookings ?? [];

  const paid = batches.filter((b) => b.status === 'paid');
  const outstanding = batches.filter((b) => b.status === 'payment_link_sent' || b.status === 'failed');

  const paidTotal = paid.reduce((s, b) => s + (b.totalPence || 0), 0);
  const owedTotal = outstanding.reduce((s, b) => s + (b.totalPence || 0), 0);

  // Lesson-by-lesson, so a charge can always be traced to what it paid for.
  const charged = bookings
    .filter((b) => BILLABLE.includes(b.deliveryStatus))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  return (
    <>
      <PageHead title="Payments">
        What you&rsquo;ve been charged, and which lesson each charge was for.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <KpiRow cols={3}>
        <Kpi label="Paid so far" value={money(paidTotal)} icon={Payments} />
        <Kpi label="Outstanding" value={money(owedTotal)} />
        <Kpi label="Lessons charged" value={charged.length} icon={Lessons} />
      </KpiRow>

      <Card title="Billing periods">
        {loading ? (
          <Loading rows={3} />
        ) : batches.length === 0 ? (
          <Empty icon={Payments}>
            Nothing billed yet. Lessons are charged on a regular cycle, not one at a time.
          </Empty>
        ) : (
          <Table head={['Period', 'Amount', 'Status']}>
            {batches.map((b, i) => {
              const s = BATCH_STATUS[b.status] || { label: b.status, tone: '' };
              return (
                <tr key={b.id || i}>
                  <td>
                    {b.periodStart && b.periodEnd
                      ? `${longDate(b.periodStart)} — ${longDate(b.periodEnd)}`
                      : longDate(b.created_at)}
                  </td>
                  <td className="num">{money(b.totalPence)}</td>
                  <td><Badge tone={s.tone}>{s.label}</Badge></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Card title="Lesson by lesson">
        {loading ? (
          <Loading rows={3} />
        ) : charged.length === 0 ? (
          <Empty icon={Lessons}>No charged lessons yet.</Empty>
        ) : (
          <Table head={['Lesson', 'When', 'Tutor', 'Fee']}>
            {charged.slice(0, 30).map((b) => (
              <tr key={b.id}>
                <td>
                  {b.subject || 'Lesson'}
                  {b.deliveryStatus !== 'delivered' && (
                    <>
                      {' '}
                      <Badge tone="warn">
                        {b.deliveryStatus === 'no_show' ? 'Missed'
                          : b.deliveryStatus === 'partial' ? 'Cut short'
                          : 'Late cancellation'}
                      </Badge>
                    </>
                  )}
                </td>
                <td>{lessonTime(b.startTime)}</td>
                <td>{b.tutorName || '—'}</td>
                <td className="num">{money(b.feePence)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
