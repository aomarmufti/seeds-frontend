'use client';

import { supabase, currentSession } from '@/lib/supabase';

/**
 * The profile read/write path (SCRUM-XX39 / XX40).
 *
 * These pages talk to Supabase directly rather than to the backend, because
 * that is where the write actually exists. `profiles` carries RLS policies
 * for select and update scoped to `id = auth.uid()` — the caller's own row
 * and nobody else's — so a parent correcting their child's year group is a
 * real save with no backend change. Every other table the profile screens
 * touch (`students`, `tutors`, `tutor_accounts`) had its browser-facing
 * policies dropped in the same migration, which is why the fields sourced
 * from those are shown read-only and say so rather than pretending.
 *
 * `role` is deliberately not writable here and could not be anyway: a
 * BEFORE UPDATE trigger rejects any change to it from a non-service-role
 * caller. It is listed in neither whitelist below so the product never even
 * offers what the database would refuse.
 */

// Everything the two profile screens read. Kept in one place so a column
// added for one screen can't quietly go missing on the other.
const COLUMNS = [
  'id', 'role', 'email', 'full_name', 'tutor_name',
  'subject', 'level', 'assigned_tutor',
  'school_year', 'target_grades', 'subjects', 'bio',
  'whatsapp_number', 'whatsapp_opted_in', 'created_at',
].join(', ');

/**
 * What each role may change about themselves.
 *
 * The omissions are the point, and they are product decisions rather than
 * database ones — RLS would allow all of these:
 *
 * - `subject`, `level`, `assigned_tutor` — commercial facts. Rate hangs off
 *   level and capacity hangs off assignment; a family setting their own
 *   would be deciding what they pay and who teaches them. Admin's call
 *   (docs/MULTI-SUBJECT-DESIGN.md §3).
 * - `tutor_name` — the identity key. The backend authorises a tutor against
 *   a booking by string-matching `profiles.tutor_name` to
 *   `bookings.tutor_name`, so a tutor who renamed themselves here would be
 *   locked out of every lesson they already have (this is SCRUM-XX35's
 *   "Unauthorized", self-inflicted). The legacy tutor modal offered exactly
 *   this field; not restoring it is deliberate.
 */
const WRITABLE = {
  student: ['full_name', 'school_year', 'target_grades', 'subjects', 'whatsapp_number', 'whatsapp_opted_in'],
  tutor: ['full_name', 'bio', 'subjects', 'whatsapp_number', 'whatsapp_opted_in'],
};

export async function loadOwnProfile() {
  const session = await currentSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  const { data, error } = await supabase()
    .from('profiles')
    .select(COLUMNS)
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // email lives on the auth user as well as the profile row, and the auth
  // one is the address that actually receives mail.
  return { ...(data || {}), email: session.user.email || data?.email || '' };
}

/**
 * Save the caller's own profile. `patch` is filtered to the role's writable
 * set before it leaves the browser — a field the screen doesn't offer can't
 * be smuggled in by a stale piece of state.
 */
export async function saveOwnProfile(role, patch) {
  const allowed = WRITABLE[role] || [];
  const clean = {};
  for (const key of allowed) {
    if (key in patch) clean[key] = patch[key];
  }
  if (Object.keys(clean).length === 0) return;

  const session = await currentSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  const { error } = await supabase()
    .from('profiles')
    .update(clean)
    .eq('id', session.user.id);
  if (error) throw new Error(error.message);
}

/** `{ Maths: 'A*', Biology: 'A' }` → `Maths: A*, Biology: A`. */
export function formatTargetGrades(grades) {
  if (!grades || typeof grades !== 'object') return '';
  return Object.entries(grades).map(([subject, grade]) => `${subject}: ${grade}`).join(', ');
}

/** The inverse, matching what the legacy profile modal wrote. */
export function parseTargetGrades(text) {
  const out = {};
  for (const pair of String(text || '').split(',')) {
    const [subject, grade] = pair.split(':');
    if (subject?.trim() && grade?.trim()) out[subject.trim()] = grade.trim();
  }
  return out;
}
