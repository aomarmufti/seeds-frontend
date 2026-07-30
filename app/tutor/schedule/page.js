'use client';

import { useState, useCallback } from 'react';
import { api, lessonTime, money } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Avatar, Badge, Button,
  Lesson, Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Calendar, Students, Earnings, Check, Video } from '@/components/icons';
import OutcomeDialog from './OutcomeDialog';

// Which outcomes bill the family. Must match BILLABLE_OUTCOMES in the
// backend's lib/cancellationPolicy.js — the single answer to "does this move
// money" lives there; this is only for labelling what already happened.
const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

const OUTCOME_LABEL = {
  delivered: 'Taught',
  partial: 'Cut short',
  no_show: 'No-show',
  late_cancelled: 'Late cancellation',
  cancelled_mutual: 'Cancelled',
  tutor_cancelled: 'You cancelled',
  waived: 'Waived',
};

export default function SchedulePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(null);

  const load = useCallback(
    () => api('/api/analytics?resource=my-tutor-bookings'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  );
  const { loading, error, data } = useAsync(load, [refreshKey]);

  const bookings = data?.recentBookings ?? [];
  const now = Date.now();

  const finished = bookings.filter(
    (b) => b.endTime && new Date(b.endTime).getTime() < now && !b.deliveryStatus
         && b.status !== 'requested' && b.status !== 'cancelled',
  );
  const upcoming = bookings
    .filter((b) => b.startTime && new Date(b.startTime).getTime() >= now && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const paidPence = bookings
    .filter((b) => BILLABLE.includes(b.deliveryStatus))
    .reduce((sum, b) => sum + (b.feePence || 0), 0);

  return (
    <>
      <PageHead title="Schedule">
        Your lessons, and anything still waiting on an answer from you.
      </PageHead>

      <KpiRow cols={4}>
        <Kpi label="Upcoming" value={upcoming.length} icon={Calendar} />
        <Kpi label="Awaiting outcome" value={finished.length} icon={Check} />
        <Kpi label="Students" value={new Set(bookings.map((b) => b.studentId)).size} icon={Students} />
        <Kpi label="Billable so far" value={money(paidPence)} icon={Earnings} />
      </KpiRow>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* Lessons with no recorded outcome are the ones that matter most: until
          someone says what happened, the family isn't billed and the tutor
          isn't paid. They go first, not buried in the calendar. */}
      {finished.length > 0 && (
        <Card title={`Confirm what happened (${finished.length})`} style={{ borderColor: 'var(--gold)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '.83rem', color: 'var(--ink-3)' }}>
            These have finished but nobody has said how they went. You won&rsquo;t be paid for them until one of you does.
          </p>
          {finished.map((b) => (
            <Lesson
              key={b.id}
              subject={`${b.subject || 'Lesson'} · ${b.studentName || 'Student'}`}
              meta={`${lessonTime(b.startTime)} · ${money(b.feePence)}`}
              action={<Button onClick={() => setPending(b)}>What happened? →</Button>}
            />
          ))}
        </Card>
      )}

      <Card title="Upcoming lessons">
        {loading ? (
          <Loading />
        ) : upcoming.length === 0 ? (
          <Empty icon={Calendar}>Nothing booked yet. New bookings will appear here.</Empty>
        ) : (
          <Table head={['Student', 'Subject', 'When', 'Fee', 'Status', '']}>
            {upcoming.map((b) => (
              <tr key={b.id}>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar name={b.studentName} />
                    {b.studentName || '—'}
                  </span>
                </td>
                <td>{b.subject || '—'}</td>
                <td>{lessonTime(b.startTime)}</td>
                <td className="num">{money(b.feePence)}</td>
                <td>
                  {b.status === 'requested'
                    ? <Badge tone="warn">Awaiting your confirmation</Badge>
                    : <Badge tone="good">Confirmed</Badge>}
                </td>
                <td>
                  {b.meetLink ? (
                    <a className="btn-xs ghost" href={b.meetLink} target="_blank" rel="noopener noreferrer"
                       style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Video size={13} /> Join
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Recorded outcomes">
        {loading ? (
          <Loading rows={2} />
        ) : bookings.filter((b) => b.deliveryStatus).length === 0 ? (
          <Empty icon={Check}>Nothing recorded yet.</Empty>
        ) : (
          <Table head={['Student', 'When', 'Outcome', 'Charged', 'Fee']}>
            {bookings.filter((b) => b.deliveryStatus).slice(0, 25).map((b) => {
              const billable = BILLABLE.includes(b.deliveryStatus);
              return (
                <tr key={b.id}>
                  <td>{b.studentName || '—'}</td>
                  <td>{lessonTime(b.startTime)}</td>
                  <td>{OUTCOME_LABEL[b.deliveryStatus] || b.deliveryStatus}</td>
                  <td>
                    {billable
                      ? <Badge tone="good">Charged</Badge>
                      : <Badge>Not charged</Badge>}
                  </td>
                  <td className="num">{billable ? money(b.feePence) : '—'}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {pending ? (
        <OutcomeDialog
          booking={pending}
          onClose={() => setPending(null)}
          onSaved={() => { setPending(null); setRefreshKey((k) => k + 1); }}
        />
      ) : null}
    </>
  );
}
