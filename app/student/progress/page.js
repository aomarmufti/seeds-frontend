'use client';

import { useState } from 'react';
import { api, longDate } from '@/lib/api';
import {
  PageHead, Card, Badge, Button, Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Progress, Homework, Note } from '@/components/icons';

export default function StudentProgressPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(null);

  const { loading, error, data } = useAsync(async () => {
    // Each of these is independently useful, so one failing shouldn't blank
    // the whole page — a student with feedback but no homework yet should
    // still see their feedback.
    const [progress, homework, notes] = await Promise.all([
      api('/api/lifecycle?resource=progress').catch(() => []),
      api('/api/lifecycle?resource=homework').catch(() => []),
      api('/api/lifecycle?resource=notes').catch(() => []),
    ]);
    return {
      progress: Array.isArray(progress) ? progress : [],
      homework: Array.isArray(homework) ? homework : [],
      notes: Array.isArray(notes) ? notes : [],
    };
  }, [refreshKey]);

  const progress = data?.progress ?? [];
  const homework = data?.homework ?? [];
  const notes = data?.notes ?? [];

  async function toggleHomework(item) {
    setSaving(item.id);
    try {
      await api('/api/lifecycle?resource=homework', {
        method: 'PATCH',
        body: { id: item.id, completed: !item.completed },
      });
      setRefreshKey((k) => k + 1);
    } catch {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHead title="Progress">
        What your tutor has recorded, and anything set for you to do.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card title="Homework">
        {loading ? (
          <Loading rows={2} />
        ) : homework.length === 0 ? (
          <Empty icon={Homework}>Nothing set at the moment.</Empty>
        ) : (
          homework.map((h) => (
            <div
              key={h.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 0', borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '.86rem', fontWeight: 600,
                    textDecoration: h.completed ? 'line-through' : 'none',
                    color: h.completed ? 'var(--ink-3)' : 'var(--ink)',
                  }}
                >
                  {h.title}
                </div>
                {h.due_date ? (
                  <div style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>
                    Due {longDate(h.due_date)}
                  </div>
                ) : null}
              </div>
              <Button
                variant={h.completed ? 'ghost' : ''}
                disabled={saving === h.id}
                onClick={() => toggleHomework(h)}
              >
                {saving === h.id ? '…' : h.completed ? 'Done' : 'Mark done'}
              </Button>
            </div>
          ))
        )}
      </Card>

      <Card title="Progress by subject">
        {loading ? (
          <Loading rows={2} />
        ) : progress.length === 0 ? (
          <Empty icon={Progress}>
            Nothing recorded yet. Your tutor adds this after your lessons.
          </Empty>
        ) : (
          progress.map((p) => (
            <div key={p.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: '.87rem' }}>{p.subject || 'General'}</strong>
                {p.grade ? <Badge tone="good">{p.grade}</Badge> : null}
                <span style={{ marginLeft: 'auto', fontSize: '.74rem', color: 'var(--ink-3)' }}>
                  {longDate(p.created_at)}
                </span>
              </div>
              {p.notes ? (
                <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--ink-2)' }}>{p.notes}</p>
              ) : null}
            </div>
          ))
        )}
      </Card>

      <Card title="Lesson feedback">
        {loading ? (
          <Loading rows={2} />
        ) : notes.length === 0 ? (
          <Empty icon={Note}>No feedback yet.</Empty>
        ) : (
          notes.slice(0, 15).map((n) => (
            <div key={n.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', marginBottom: 3 }}>
                {longDate(n.created_at)}{n.tutor_name ? ` · ${n.tutor_name}` : ''}
              </div>
              <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--ink-2)' }}>{n.note || n.content}</p>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
