'use client';

import { lessonTime } from '@/lib/api';
import { Video, Calendar } from '@/components/icons';
import { isConsultation, googleCalendarUrl, icsDataUrl } from '@/lib/calendar';

/**
 * The answer, stated before anything else.
 *
 * A parent opening the portal wants one thing: when is the next lesson, and
 * can I join it. The first version of this page opened with a row of metric
 * tiles — "Upcoming 3", "Lessons taught 12" — which is a dashboard idiom
 * borrowed from the admin view and imposed on someone who is not operating
 * anything. A count of three is not an answer; "Maths, Tuesday 4pm, with
 * Suleiman" is.
 *
 * So this leads, in a sentence, at a size you can read across a kitchen.
 * Numbers move below, where someone who wants them can find them.
 */
export default function NextUp({ booking, emptyTitle, emptyBody, action }) {
  if (!booking) {
    return (
      <section
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', padding: '26px 28px', marginBottom: 16,
        }}
      >
        <h2 style={{ margin: '0 0 5px', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600 }}>
          {emptyTitle}
        </h2>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '.92rem', maxWidth: '52ch' }}>
          {emptyBody}
        </p>
        {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
      </section>
    );
  }

  const when = lessonTime(booking.startTime);
  const who = booking.tutorName || booking.studentName;
  // A brand-new family's first booking is a consultation, not a lesson.
  // Calling it "Next lesson" undersold the thing they had already done
  // (SCRUM-XX18).
  const consultation = isConsultation(booking);
  const gcal = googleCalendarUrl(booking);
  const ics = icsDataUrl(booking);

  return (
    <section
      style={{
        background: 'var(--navy)', color: '#fff',
        borderRadius: 'var(--r-lg)', padding: '26px 28px', marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.1em',
          color: 'var(--gold)', fontWeight: 700, marginBottom: 9,
        }}
      >
        {consultation ? 'Your free consultation' : 'Next lesson'}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)',
          lineHeight: 1.2, fontWeight: 600, letterSpacing: '-.015em', textWrap: 'balance',
        }}
      >
        {consultation ? 'Free consultation call' : booking.subject || 'Lesson'}, {when}
      </div>

      {who ? (
        <div style={{ marginTop: 4, fontSize: '.92rem', color: 'rgba(255,255,255,.68)' }}>
          with {who}
        </div>
      ) : null}

      {consultation ? (
        <p style={{ margin: '10px 0 0', fontSize: '.88rem', color: 'rgba(255,255,255,.6)', maxWidth: '52ch' }}>
          A 15-minute call to talk through your child&rsquo;s goals. Afterwards your tutor books
          you a free 60-minute trial lesson from here.
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 18 }}>
        {booking.meetLink ? (
          <a
            href={booking.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--gold)', color: 'var(--navy)', fontWeight: 700,
              fontSize: '.85rem', padding: '10px 18px', borderRadius: 'var(--r-md)',
            }}
          >
            <Video size={16} /> {consultation ? 'Join the call' : 'Join the lesson'}
          </a>
        ) : null}

        {/* A booking that lives only in a portal is a booking a parent can
            miss. Both links are generated in the browser from what is
            already on screen. */}
        {gcal ? (
          <a
            href={gcal}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              border: '1px solid rgba(255,255,255,.28)', color: 'rgba(255,255,255,.85)',
              fontWeight: 600, fontSize: '.82rem', padding: '9px 15px', borderRadius: 'var(--r-md)',
            }}
          >
            <Calendar size={15} /> Add to Google Calendar
          </a>
        ) : null}
        {ics ? (
          <a
            href={ics}
            download="seeds-lesson.ics"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              color: 'rgba(255,255,255,.6)', fontWeight: 600, fontSize: '.82rem',
              padding: '9px 4px',
            }}
          >
            Apple / Outlook (.ics)
          </a>
        ) : null}
      </div>
    </section>
  );
}
