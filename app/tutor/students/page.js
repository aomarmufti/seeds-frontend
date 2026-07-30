'use client';

import { api, lessonTime } from '@/lib/api';
import {
  PageHead, Card, Table, Avatar, Badge, Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Students } from '@/components/icons';
import { currentProfile, currentSession } from '@/lib/supabase';

/**
 * The families this tutor teaches.
 *
 * "Mine" is deliberately two things: students assigned to me, and students I
 * have actually taught. The old portal used only the second, so a student
 * admin had just assigned was invisible in my own portal until they booked
 * something — exactly backwards, since the point of the assignment is that I
 * reach out to them first.
 */
export default function TutorStudentsPage() {
  const { loading, error, data } = useAsync(async () => {
    const session = await currentSession();
    const profile = await currentProfile(session);
    const me = profile?.tutor_name || profile?.full_name || '';

    const students = await api('/api/analytics?resource=students');
    const list = Array.isArray(students) ? students : [];

    const mine = list.filter((s) => {
      if (s.assigned_tutor && s.assigned_tutor === me) return true;
      return (s.bookings || []).some((b) => b.tutor_name === me);
    });

    return { me, students: mine };
  }, []);

  const me = data?.me ?? '';
  const students = data?.students ?? [];

  return (
    <>
      <PageHead title="My students">
        Everyone assigned to you, including families you haven&rsquo;t taught yet.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card title={loading ? 'Students' : `Students (${students.length})`}>
        {loading ? (
          <Loading rows={4} />
        ) : students.length === 0 ? (
          <Empty icon={Students}>
            No students yet. Once admin assigns a family to you, they appear here.
          </Empty>
        ) : (
          <Table head={['Student', 'Subject', 'Lessons', 'Last lesson', '']}>
            {students.map((s) => {
              const mine = (s.bookings || []).filter((b) => b.tutor_name === me);
              const last = mine
                .slice()
                .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0];
              const isNew = mine.length === 0;
              return (
                <tr key={s.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <Avatar name={s.student_name} />
                      {s.student_name || '—'}
                      {isNew ? <Badge tone="warn">Not taught yet</Badge> : null}
                    </span>
                  </td>
                  <td>{last?.subject || s.subject || '—'}</td>
                  <td className="num">{mine.length}</td>
                  <td>{last ? lessonTime(last.start_time) : '—'}</td>
                  <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{s.parent_email || ''}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
