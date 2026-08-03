'use client';

import { useState, useCallback } from 'react';
import { api, longDate } from '@/lib/api';
import {
  PageHead, Card, Table, Avatar, Badge,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Students } from '@/components/icons';

/**
 * Every student on the platform — including the ones with no login yet.
 *
 * The old page read the accounts roster alone, so a family assigned from a
 * lead was invisible here even though admin was actively managing them: they
 * have a students row but no auth user. Both sources are merged, keyed on
 * email, and rows without an account are marked as such rather than being
 * silently dropped or shown actions that can't work on them.
 */
export default function AdminStudentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    const [accounts, records] = await Promise.all([
      api('/api/analytics?resource=accounts'),
      api('/api/analytics?resource=students'),
    ]);

    const accountRows = (Array.isArray(accounts) ? accounts : [])
      .filter((a) => a.role === 'student')
      .map((a) => ({
        id: a.id,
        studentName: a.studentName || a.fullName,
        parentName: a.parentName,
        email: a.email,
        assignedTutor: a.assignedTutor || '',
        lessonCount: a.lessonCount ?? 0,
        createdAt: a.createdAt,
        hasAccount: true,
      }));

    const known = new Set(accountRows.map((a) => (a.email || '').toLowerCase()));

    const leadRows = (Array.isArray(records) ? records : [])
      .filter((r) => r.parent_email && !known.has(r.parent_email.toLowerCase()))
      .map((r) => ({
        id: r.id,
        studentName: r.student_name,
        parentName: r.parent_name,
        email: r.parent_email,
        assignedTutor: r.assigned_tutor || '',
        lessonCount: (r.bookings || []).length,
        createdAt: r.created_at,
        hasAccount: false,
      }));

    const tutors = (Array.isArray(accounts) ? accounts : [])
      .filter((a) => a.role === 'tutor')
      .map((t) => t.tutorName || t.fullName)
      .filter(Boolean);

    return { rows: [...accountRows, ...leadRows], tutors };
  }, [refreshKey]);

  const { loading, error, data } = useAsync(load, [refreshKey]);
  const rows = data?.rows ?? [];
  const tutors = data?.tutors ?? [];

  async function assign(row, tutorName) {
    // A student created from a lead has no auth user to key on, so the
    // backend is told which identifier it's getting.
    const body = row.hasAccount
      ? { action: 'assign-tutor', userId: row.id, tutorName }
      : { action: 'assign-tutor', studentId: row.id, tutorName };
    await api('/api/auth', { method: 'POST', body });
    setRefreshKey((k) => k + 1);
  }

  // ── Removing an account (SCRUM-97) ────────────────────────────────────────
  // Two operations, deliberately not one button. Deactivating keeps the
  // family's lessons and billing and can be undone; deleting is permanent and
  // the server refuses it wherever there is history, so the dangerous one is
  // also the one that usually says no.
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null); // { tone: 'good' | 'bad', text }

  const nameOf = (r) => r.studentName || r.parentName || r.email || 'this account';

  async function runAction(row, body, confirmText, successText) {
    if (!window.confirm(confirmText)) return;
    setBusyId(row.id);
    setNotice(null);
    try {
      await api('/api/auth', { method: 'POST', body });
      setNotice({ tone: 'good', text: successText });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      // A refused delete arrives here with the server's explanation of what
      // history is blocking it, which is the useful part — don't flatten it.
      setNotice({ tone: 'bad', text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  const deactivate = (row) => runAction(
    row,
    { action: 'deactivate-account', userId: row.id },
    `Deactivate ${nameOf(row)}?\n\nThey won't be able to sign in. Their lessons, billing and history are all kept, and you can reactivate them later.`,
    `${nameOf(row)} deactivated.`,
  );

  const remove = (row) => runAction(
    row,
    { action: 'delete-account', userId: row.id },
    `Permanently delete ${nameOf(row)}?\n\nThis cannot be undone. It will be refused if they have any lessons or billing history — deactivate those instead.`,
    `${nameOf(row)} deleted.`,
  );

  return (
    <>
      <PageHead title="Students">
        Everyone on the platform, including families assigned from a lead who haven&rsquo;t signed up yet.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {notice ? (
        <div
          className="error-note"
          style={{
            marginBottom: 14,
            ...(notice.tone === 'good' ? { background: 'var(--good-bg)', color: 'var(--good)' } : {}),
          }}
        >
          {notice.text}
        </div>
      ) : null}

      <Card title={loading ? 'Students' : `Students (${rows.length})`}>
        {loading ? (
          <Loading rows={4} />
        ) : rows.length === 0 ? (
          <Empty icon={Students}>No students yet.</Empty>
        ) : (
          <Table head={['Student', 'Parent', 'Email', 'Tutor', 'Lessons', 'Joined', '']}>
            {rows.map((r) => (
              <tr key={`${r.hasAccount ? 'a' : 's'}-${r.id}`}>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <Avatar name={r.studentName} />
                    {r.studentName || '—'}
                    {!r.hasAccount && <Badge>No account yet</Badge>}
                  </span>
                </td>
                <td>{r.parentName || '—'}</td>
                <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{r.email || '—'}</td>
                <td>
                  <select
                    defaultValue={r.assignedTutor}
                    onChange={(e) => assign(r, e.target.value)}
                    aria-label={`Assign a tutor to ${r.studentName || 'this student'}`}
                    style={{
                      padding: '4px 6px', border: '1.5px solid var(--line)',
                      borderRadius: 7, fontSize: '.74rem', fontFamily: 'inherit',
                      maxWidth: 150, cursor: 'pointer', background: 'var(--surface)',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {tutors.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="num">{r.lessonCount}</td>
                <td style={{ color: 'var(--ink-3)' }}>{longDate(r.createdAt)}</td>
                <td>
                  {/* Account-scoped actions are hidden for lead-created rows —
                      there is no account for them to act on. */}
                  {r.hasAccount ? (
                    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button" className="btn-xs ghost"
                        disabled={busyId === r.id}
                        onClick={() => deactivate(r)}
                      >
                        Deactivate
                      </button>
                      <button
                        type="button" className="btn-xs danger"
                        disabled={busyId === r.id}
                        onClick={() => remove(r)}
                      >
                        {busyId === r.id ? '…' : 'Delete'}
                      </button>
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
