'use client';

import { api, money, longDate, lessonTime } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Badge,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Earnings, Lessons, Calendar } from '@/components/icons';
import { currentProfile, currentSession } from '@/lib/supabase';

// The tutor's share of a lesson fee. Kept as one named constant rather than
// inlined at each use — it is a commercial term, and a number like 0.78
// scattered through the file is impossible to change safely.
const TUTOR_SHARE = 0.78;

// Only these outcomes are payable — must match BILLABLE_OUTCOMES in the
// backend's lib/cancellationPolicy.js. A lesson with no recorded outcome is
// deliberately absent: nobody has said it happened, so nobody is paid for it.
const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

const PAYOUT_STATUS = {
  paid: { label: 'Paid', tone: 'good' },
  pending: { label: 'Pending', tone: 'warn' },
  processing: { label: 'Processing', tone: 'warn' },
  failed: { label: 'Failed', tone: 'bad' },
};

export default function TutorEarningsPage() {
  const { loading, error, data } = useAsync(async () => {
    const session = await currentSession();
    const profile = await currentProfile(session);
    const me = profile?.tutor_name || profile?.full_name || '';

    const [bookingsRes, payouts] = await Promise.all([
      api('/api/analytics?resource=my-tutor-bookings'),
      api(`/api/payouts?tutor=${encodeURIComponent(me)}`).catch(() => []),
    ]);

    return {
      bookings: bookingsRes?.recentBookings || [],
      payouts: Array.isArray(payouts) ? payouts : [],
    };
  }, []);

  const bookings = data?.bookings ?? [];
  const payouts = data?.payouts ?? [];

  const earned = bookings.filter((b) => BILLABLE.includes(b.deliveryStatus));
  const grossPence = earned.reduce((s, b) => s + (b.feePence || 0), 0);
  const yoursPence = Math.round(grossPence * TUTOR_SHARE);

  const paidOutPence = payouts
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + (p.amount_pence || 0), 0);

  // What's been earned but not yet transferred.
  const awaitingPence = Math.max(0, yoursPence - paidOutPence);

  // Lessons that finished but nobody has said what happened to — invisible to
  // the payout sweep, so worth naming rather than leaving as a silent gap
  // between "lessons taught" and "lessons paid".
  const unanswered = bookings.filter(
    (b) => b.endTime && new Date(b.endTime).getTime() < Date.now()
        && !b.deliveryStatus && b.status !== 'cancelled' && b.status !== 'requested',
  );

  return (
    <>
      <PageHead title="Earnings">
        What you&rsquo;ve earned, what&rsquo;s been paid out, and anything still waiting on an answer.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <KpiRow cols={4}>
        <Kpi label="Earned to date" value={money(yoursPence)} icon={Earnings} />
        <Kpi label="Paid out" value={money(paidOutPence)} />
        <Kpi label="Awaiting payout" value={money(awaitingPence)} />
        <Kpi label="Lessons counted" value={earned.length} icon={Lessons} />
      </KpiRow>

      {unanswered.length > 0 && (
        <Card style={{ borderColor: 'var(--gold)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {unanswered.length} lesson{unanswered.length === 1 ? '' : 's'} not yet accounted for
          </div>
          <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--ink-2)' }}>
            These finished but nobody has recorded what happened, so they aren&rsquo;t counted above and
            won&rsquo;t be paid out. You can answer them on your <a href="/tutor/schedule" style={{ color: 'var(--gold-ink)', fontWeight: 600 }}>schedule</a>.
          </p>
        </Card>
      )}

      <Card title="Payouts">
        {loading ? (
          <Loading rows={3} />
        ) : payouts.length === 0 ? (
          <Empty icon={Earnings}>
            No payouts yet. These are sent automatically on your agreed cycle — there&rsquo;s nothing to request.
          </Empty>
        ) : (
          <Table head={['Date', 'Amount', 'Status']}>
            {payouts.map((p, i) => {
              const s = PAYOUT_STATUS[p.status] || { label: p.status, tone: '' };
              return (
                <tr key={p.id || i}>
                  <td>{longDate(p.paid_at || p.created_at)}</td>
                  <td className="num">{money(p.amount_pence)}</td>
                  <td><Badge tone={s.tone}>{s.label}</Badge></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Card title="Lessons counted toward earnings">
        {loading ? (
          <Loading rows={3} />
        ) : earned.length === 0 ? (
          <Empty icon={Calendar}>Nothing payable yet.</Empty>
        ) : (
          <Table head={['Student', 'When', 'Outcome', 'Lesson fee', 'Your share']}>
            {earned.slice(0, 30).map((b) => (
              <tr key={b.id}>
                <td>{b.studentName || '—'}</td>
                <td>{lessonTime(b.startTime)}</td>
                <td>
                  {b.deliveryStatus === 'delivered' ? 'Taught'
                    : b.deliveryStatus === 'partial' ? 'Cut short'
                    : b.deliveryStatus === 'no_show' ? 'No-show'
                    : 'Late cancellation'}
                </td>
                <td className="num">{money(b.feePence)}</td>
                <td className="num">{money(Math.round((b.feePence || 0) * TUTOR_SHARE))}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
