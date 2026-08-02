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

/** Human label for the lesson itself. */
export function lessonLabel(booking) {
  if (isConsultation(booking)) return 'Free consultation call';
  if (isTrial(booking)) return 'Free trial lesson';
  return booking?.subject || 'Lesson';
}
