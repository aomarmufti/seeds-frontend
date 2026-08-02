// Add-to-calendar links (SCRUM-XX18).
//
// A booking confirmation that lives only in a portal is a booking a parent can
// miss. Both of these are generated in the browser from data the portal
// already has — no backend change, and nothing new to keep in sync.

import { isConsultation } from '@/lib/lessons';

// Lessons are an hour, which is what the Cal.com event types are configured
// for. Used only when a booking arrives without an end time.
const DEFAULT_MINUTES = 60;

function toUtcStamp(date) {
  // iCal and Google both want YYYYMMDDTHHMMSSZ.
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function windowFor(booking) {
  const start = new Date(booking.startTime);
  if (Number.isNaN(start.getTime())) return null;
  const end = booking.endTime && !Number.isNaN(new Date(booking.endTime).getTime())
    ? new Date(booking.endTime)
    : new Date(start.getTime() + DEFAULT_MINUTES * 60000);
  return { start, end };
}

/** Human title for a booking — consultations are not "lessons". */
export { isConsultation };

export function calendarTitle(booking) {
  if (isConsultation(booking)) return 'Seeds — free consultation call';
  const subject = booking.subject || 'Lesson';
  return `Seeds — ${subject}`;
}

function calendarDetails(booking) {
  const who = booking.tutorName || booking.studentName;
  const lines = [];
  if (who) lines.push(`With ${who}.`);
  if (booking.meetLink) lines.push(`Join: ${booking.meetLink}`);
  lines.push('Booked through Seeds Tuition — seedsinstitute.co.uk');
  return lines.join('\n');
}

export function googleCalendarUrl(booking) {
  const w = windowFor(booking);
  if (!w) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarTitle(booking),
    dates: `${toUtcStamp(w.start)}/${toUtcStamp(w.end)}`,
    details: calendarDetails(booking),
  });
  if (booking.meetLink) params.set('location', booking.meetLink);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * An .ics as a data: URL — covers Apple Calendar, Outlook and everything else
 * that is not Google, without needing a route to serve it.
 */
export function icsDataUrl(booking) {
  const w = windowFor(booking);
  if (!w) return null;
  const escape = (v) => String(v).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seeds Tuition//Portal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id || toUtcStamp(w.start)}@seedsinstitute.co.uk`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(w.start)}`,
    `DTEND:${toUtcStamp(w.end)}`,
    `SUMMARY:${escape(calendarTitle(booking))}`,
    `DESCRIPTION:${escape(calendarDetails(booking))}`,
    booking.meetLink ? `LOCATION:${escape(booking.meetLink)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}
