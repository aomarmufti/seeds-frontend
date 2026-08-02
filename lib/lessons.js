// What kind of lesson is this, and does money move?
//
// The portal had no shared answer to that question, so each screen guessed.
// The visible symptom was the outcome dialog telling a tutor that a *free*
// consultation would be "charged in full" — copy written for paid lessons,
// shown on a lesson nobody pays for.

export const FREE_LESSON_TYPES = new Set(['consultation', 'trial']);

/** Normalised lesson type, tolerant of the field names in older rows. */
export function lessonType(booking) {
  if (!booking) return '';
  return String(booking.lessonType || booking.type || '').toLowerCase();
}

export function isConsultation(booking) {
  if (!booking) return false;
  if (lessonType(booking).includes('consultation')) return true;
  return /consultation/i.test(booking.subject || '');
}

export function isTrial(booking) {
  if (!booking) return false;
  if (lessonType(booking).includes('trial')) return true;
  return /trial/i.test(booking.subject || '');
}

/**
 * A lesson nobody pays for.
 *
 * Type is the primary signal. A zero fee is treated as free too, because a
 * £0 booking cannot bill anyone whatever it is called — but only when the fee
 * is actually present, so a row that simply omits feePence is not silently
 * reclassified as free.
 */
export function isFreeLesson(booking) {
  if (!booking) return false;
  if (isConsultation(booking) || isTrial(booking)) return true;
  return booking.feePence === 0;
}

/**
 * Has this family already used their one free consultation / trial?
 * (SCRUM-XX41.)
 *
 * "Used" is not the same as "booked". The modal's own rule counted any
 * booking of that type, cancelled or not; it happened to behave correctly
 * because the calendar page filters cancelled bookings out before passing
 * them in. That is a display filter carrying a commercial rule, which is
 * one refactor away from silently charging a family for a lesson that never
 * happened — so the rule now lives here, where it is stated rather than
 * inherited. It matches what the database has always allowed:
 * `bookings_one_trial_per_student` is a partial unique index `WHERE
 * lesson_type = 'trial' AND status <> 'cancelled'`.
 *
 * **The no-show case is still wrong and cannot be fixed here.** Marking a
 * trial as a student no-show sets `status = 'completed'`, which keeps it
 * inside that unique index, so the family has burned a lesson they never
 * received. Distinguishing it needs two backend changes: `delivery_status`
 * exposed on `/api/analytics?resource=my-bookings` (it isn't in the select
 * list today, so the student portal cannot see an outcome at all), and the
 * index narrowed to exclude no-showed free lessons. Until then this
 * function is deliberately as generous as the database permits and no more.
 */
export function hasUsedFreeLesson(bookings, type) {
  const matches = type === 'consultation' ? isConsultation : isTrial;
  return (bookings || []).some((b) => matches(b) && b.status !== 'cancelled');
}

/** Human label for the lesson itself. */
export function lessonLabel(booking) {
  if (isConsultation(booking)) return 'Free consultation call';
  if (isTrial(booking)) return 'Free trial lesson';
  return booking?.subject || 'Lesson';
}
