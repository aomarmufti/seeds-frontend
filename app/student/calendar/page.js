'use client';

import { useState } from 'react';
import { api, BACKEND, lessonTime } from '@/lib/api';
import {
  PageHead, Card, Badge, Lesson,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import MonthCal, { lessonColour, TYPE_LABEL } from '@/components/MonthCal';
import BookLessonModal from '@/components/student/BookLessonModal';
import { Calendar, Video } from '@/components/icons';

// Same type→colour map the cells use, so the legend can never drift from
// what the grid actually shows.
const LEGEND = ['gcse', 'alevel', 'group', 'trial', 'consultation'];

export default function StudentCalendarPage() {
  const [refresh, setRefresh] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  // Clicking a day with lessons narrows the list below to that day — the
  // legacy calShowDay behaviour. Null means "show upcoming".
  const [selected, setSelected] = useState(null);

  const { loading, error, data } = useAsync(async () => {
    const res = await api('/api/analytics?resource=my-bookings');
    return (res?.recentBookings || []).filter((b) => b.status !== 'cancelled');
  }, [refresh]);

  const bookings = data ?? [];

  // Upcoming = anything from the last 24h onwards (a lesson that's live
  // right now still counts as upcoming, as in legacy spRenderCalendar).
  const upcoming = bookings
    .filter((b) => b.startTime && new Date(b.startTime).getTime() > Date.now() - 86400000)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 8);

  const list = selected ? selected.lessons : upcoming;

  function onDayClick(dayLessons, date) {
    const sorted = [...dayLessons].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    setSelected({
      label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      lessons: sorted,
    });
  }

  function renderRow(b) {
    const icsUrl = `${BACKEND}/api/bookings?action=ics&tutorName=${encodeURIComponent(b.tutorName || '')}&subject=${encodeURIComponent(b.subject || '')}&lessonType=${encodeURIComponent(b.lessonType || '')}&startTime=${encodeURIComponent(b.startTime)}`;
    return (
      <Lesson
        key={b.id}
        subject={`${b.subject || 'Lesson'}${b.lessonType ? ` — ${TYPE_LABEL[b.lessonType] || b.lessonType}` : ''}`}
        meta={`${lessonTime(b.startTime)}${b.tutorName ? ` · with ${b.tutorName}` : ''}`}
        tone={b.status === 'requested' ? 'is-cancelled' : ''}
        action={
          <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
            {b.status === 'requested' ? (
              <Badge tone="warn">Awaiting confirmation</Badge>
            ) : b.meetLink ? (
              <a
                className="btn-xs ghost" href={b.meetLink}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Video size={13} /> Join
              </a>
            ) : null}
            <a className="btn-xs ghost" href={icsUrl}>+ iCal</a>
          </span>
        }
      />
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <PageHead title="Calendar">Every lesson, month by month. Click a day to see what&rsquo;s on it.</PageHead>
        <button type="button" className="btn" onClick={() => setBookingOpen(true)}>+ Book lesson</button>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card>
        {loading ? (
          <Loading rows={4} />
        ) : (
          <>
            <MonthCal lessons={bookings} onDayClick={onDayClick} />
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

      <Card
        title={selected ? selected.label : 'Upcoming lessons'}
        action={selected ? (
          <button type="button" className="card-link" onClick={() => setSelected(null)}>
            Show upcoming →
          </button>
        ) : null}
      >
        {loading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty icon={Calendar}>
            {selected ? 'No lessons that day.' : 'No upcoming lessons — book one above.'}
          </Empty>
        ) : (
          list.map(renderRow)
        )}
      </Card>

      <BookLessonModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        bookings={bookings}
        onBooked={() => { setSelected(null); setRefresh((r) => r + 1); }}
      />
    </>
  );
}
