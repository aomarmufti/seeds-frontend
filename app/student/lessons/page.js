'use client';

import { api, lessonTime, money } from '@/lib/api';
import {
  PageHead, Card, Badge, Lesson,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import NextUp from '@/components/NextUp';
import { Calendar, Lessons, Video, Alert } from '@/components/icons';

// A batch the family still owes money on. The old portal surfaced this as a
// banner above everything else, which is the right instinct — an unpaid
// balance is the first thing a parent needs to see.
const UNPAID = ['payment_link_sent', 'failed'];

export default function StudentLessonsPage() {
  const { loading, error, data } = useAsync(async () => {
    const [bookings, billing] = await Promise.all([
      api('/api/analytics?resource=my-bookings'),
      // Billing is secondary here: if it fails the lesson list is still worth
      // showing, so it degrades to "no known balance" rather than an error.
      api('/api/billing?resource=billing-history').catch(() => ({ batches: [] })),
    ]);
    return {
      bookings: (bookings?.recentBookings || []).filter((b) => b.status !== 'cancelled'),
      unpaid: (billing?.batches || []).filter((b) => UNPAID.includes(b.status)),
    };
  }, []);

  const bookings = data?.bookings ?? [];
  const unpaid = data?.unpaid ?? [];
  const now = Date.now();

  const upcoming = bookings
    .filter((b) => b.startTime && new Date(b.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const past = bookings
    .filter((b) => b.startTime && new Date(b.startTime).getTime() < now)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const owed = unpaid.reduce((sum, b) => sum + (b.totalPence || 0), 0);

  return (
    <>
      <PageHead title="My lessons">Everything booked, and everything already taught.</PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {unpaid.length > 0 && (
        <Card style={{ borderColor: 'var(--gold)', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--gold-ink)', marginTop: 2, display: 'flex' }}><Alert size={19} /></span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>Payment due — {money(owed)}</div>
              <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--ink-2)' }}>
                We&rsquo;ve emailed a secure payment link. Lessons carry on as normal in the meantime.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* The answer first. A count of upcoming lessons is not what a parent
          came here to find out; the date and time of the next one is. */}
      <NextUp
        booking={upcoming[0]}
        emptyTitle="No lesson booked yet"
        emptyBody="Your tutor will be in touch to arrange the next one. Anything already taught is listed below."
      />

      <Card title="Coming up">
        {loading ? (
          <Loading />
        ) : upcoming.length <= 1 ? (
          <Empty icon={Calendar}>Nothing else booked after the lesson above.</Empty>
        ) : (
          upcoming.slice(1).map((b) => (
            <Lesson
              key={b.id}
              subject={b.subject || 'Lesson'}
              meta={`${lessonTime(b.startTime)}${b.tutorName ? ` · with ${b.tutorName}` : ''}`}
              tone={b.status === 'requested' ? 'is-cancelled' : ''}
              action={
                b.status === 'requested' ? (
                  <Badge tone="warn">Awaiting confirmation</Badge>
                ) : b.meetLink ? (
                  <a
                    className="btn-xs ghost" href={b.meetLink}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Video size={13} /> Join
                  </a>
                ) : null
              }
            />
          ))
        )}
      </Card>

      <Card title="Past lessons">
        {loading ? (
          <Loading rows={2} />
        ) : past.length === 0 ? (
          <Empty icon={Lessons}>No lessons yet.</Empty>
        ) : (
          past.slice(0, 20).map((b) => (
            <Lesson
              key={b.id}
              subject={b.subject || 'Lesson'}
              meta={`${lessonTime(b.startTime)}${b.tutorName ? ` · with ${b.tutorName}` : ''}`}
              tone="is-done"
              action={<span style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{money(b.feePence)}</span>}
            />
          ))
        )}
      </Card>
    </>
  );
}
