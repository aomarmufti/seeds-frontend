'use client';

import { currentSession } from './supabase';

// The one place the frontend knows the backend's address. The legacy build had
// this constant declared three separate times (BACKEND, AD_BACKEND,
// SP_BACKEND), which is exactly the kind of duplication a module system exists
// to prevent.
export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://seeds-backend-six.vercel.app';

const DEFAULT_TIMEOUT = 15000;

/**
 * Authenticated fetch against the Seeds backend.
 *
 * Every call is time-boxed. The legacy build had ~70 bare fetch() calls with
 * no timeout, so a hanging request left a portal stuck on "Loading…" forever
 * with nothing to tell the user why — the failure mode that made SCRUM-60
 * necessary. An AbortController here means a hang surfaces as an error the UI
 * can actually render.
 */
export async function api(path, { method = 'GET', body, timeout = DEFAULT_TIMEOUT, auth = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const session = await currentSession();
      // A missing session used to fall through and send the request with no
      // Authorization header at all. The backend answered "Unauthorized",
      // which the UI showed verbatim — so an expired session looked like a
      // permissions bug in the product rather than "sign in again". Say what
      // actually happened, before spending a round trip on it.
      if (!session) {
        throw new Error('Your session has expired. Please sign in again to save this.');
      }
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${BACKEND}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? safeParse(text) : null;

    if (!res.ok) {
      // 401 with a live token means the backend rejected *this caller* for
      // *this record* — most often a tutor acting on a booking the backend
      // does not consider theirs. "Unauthorized" alone gives the person no
      // idea whether to retry, re-login, or call someone.
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          (data && data.error && data.error !== 'Unauthorized' ? `${data.error} — ` : '') +
          "You're signed in, but the server didn't accept this action for your account. " +
          'If this is your lesson, ask an admin to check it is assigned to you.',
        );
      }
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("That took too long to respond. Check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** Pence to a readable £ figure. Money is integer pence everywhere. */
export function money(pence) {
  if (pence == null || Number.isNaN(pence)) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}

/** "Tue 4:00pm" — the format the portals already used. */
export function lessonTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(':00', '').replace(' ', '');
  return `${day} ${time}`;
}

export function longDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
