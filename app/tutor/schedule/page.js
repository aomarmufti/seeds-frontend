'use client';

import { useState, useCallback } from 'react';
import { api, lessonTime, money } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Avatar, Badge, Button,
  Lesson, Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Calendar, Students, Earnings, Check, Video } from '@/components/icons';
import MonthCal, { lessonColour, TYPE_LABEL } from '@/components/MonthCal';
import AddLessonModal from '@/components/tutor/AddLessonModal';
import CancelLesson from '@/components/CancelLesson';
import OutcomeDialog from './OutcomeDialog';

// Same type→colour map the calendar cells use, so the legend can never
// drift from what the grid actually shows.
const LEGEND = ['gcse', 'alevel', 'group', 'trial', 'consultation'];

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
  const [addOpen, setAddOpen] = useState(false);
  // Clicking a calendar day with lessons narrows a compact list to that
  // day — the legacy tpCalShowDay behaviour. Null means no day selected.
  const [selected, setSelected] = useState(null);

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

  // The calendar shows every non-cancelled lesson the endpoint returns —
  // past and future alike, as the legacy tpCalRender did.
  const calBookings = bookings.filter((b) => b.status !== 'cancelled');

  function onDayClick(dayLessons, date) {
    const sorted = [...dayLessons].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    setSelected({
      label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      lessons: sorted,
    });
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <PageHead title="Schedule">
          Your lessons, and anything still waiting on an answer from you.
        </PageHead>
        <button type="button" className="btn" onClick={() => setAddOpen(true)}>+ Add lesson</button>
      </div>

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

      <KpiRow cols={4}>
        <Kpi label="Upcoming" value={upcoming.length} icon={Calendar} />
        <Kpi label="Awaiting outcome" value={finished.length} icon={Check} />
        <Kpi label="Students" value={new Set(bookings.map((b) => b.studentId)).size} icon={Students} />
        <Kpi label="You'll be paid for" value={money(paidPence)} icon={Earnings} />
      </KpiRow>

      <Card>
        {loading ? (
          <Loading rows={4} />
        ) : (
          <>
            <MonthCal lessons={calBookings} onDayClick={onDayClick} />
            <div className="cal-legend">
              {LEGEND.map((t) => (
                <span key={t} className="cal-legend-item">
                  <span className="cal-legend-dot" style={{ background: lessonColour(t) }} />
                  {TYPE_LABEL[t]}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* The compact day list the calendar click narrows to — sits directly
          under the calendar so the "click a day → see its lessons" flow
          reads top to bottom. */}
      {selected && (
        <Card
          title={selected.label}
          action={
            <button type="button" className="card-link" onClick={() => setSelected(null)}>
              Close day ✕
            </button>
          }
        >
          {selected.lessons.map((b) => (
            <Lesson
              key={b.id}
              subject={`${b.subject || 'Lesson'} · ${b.studentName || 'Student'}`}
              meta={`${lessonTime(b.startTime)} · ${TYPE_LABEL[b.lessonType] || b.lessonType || 'Lesson'} · ${money(b.feePence)}`}
              action={
                <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
                  {b.deliveryStatus ? (
                    <Badge tone={BILLABLE.includes(b.deliveryStatus) ? 'good' : 'mute'}>
                      {OUTCOME_LABEL[b.deliveryStatus] || b.deliveryStatus}
                    </Badge>
                  ) : b.status === 'requested' ? (
                    <Badge tone="warn">Awaiting your confirmation</Badge>
                  ) : null}
                  {!b.deliveryStatus && b.meetLink ? (
                    <a className="btn-xs ghost" href={b.meetLink} target="_blank" rel="noopener noreferrer"
                       style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Video size={13} /> Join
                    </a>
                  ) : null}
                </span>
              }
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    {b.meetLink ? (
                      <a className="btn-xs ghost" href={b.meetLink} target="_blank" rel="noopener noreferrer"
                         style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Video size={13} /> Join
                      </a>
                    ) : null}
                    {/* A tutor withdrawing never charges the family, whatever
                        the notice — SCRUM-99. */}
                    <CancelLesson
                      booking={b} role="tutor"
                      onDone={() => setRefreshKey((k) => k + 1)}
                    />
                  </span>
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

      <AddLessonModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        bookings={calBookings}
        onAdded={() => { setSelected(null); setRefreshKey((k) => k + 1); }}
      />
    </>
  );
}
