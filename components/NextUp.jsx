'use client';

import { lessonTime } from '@/lib/api';
import { Video } from '@/components/icons';

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
        Next lesson
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)',
          lineHeight: 1.2, fontWeight: 600, letterSpacing: '-.015em', textWrap: 'balance',
        }}
      >
        {booking.subject || 'Lesson'}, {when}
      </div>

      {who ? (
        <div style={{ marginTop: 4, fontSize: '.92rem', color: 'rgba(255,255,255,.68)' }}>
          with {who}
        </div>
      ) : null}

      {booking.meetLink ? (
        <a
          href={booking.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18,
            background: 'var(--gold)', color: 'var(--navy)', fontWeight: 700,
            fontSize: '.85rem', padding: '10px 18px', borderRadius: 'var(--r-md)',
          }}
        >
          <Video size={16} /> Join the lesson
        </a>
      ) : null}
    </section>
  );
}
