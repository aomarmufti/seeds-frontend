'use client';

import { useState, useCallback } from 'react';
import { api, longDate } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Badge, Button,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Leads, User } from '@/components/icons';

const LEAD_STATUS = {
  new: { label: 'New', tone: 'warn' },
  assigned: { label: 'Assigned', tone: 'good' },
  contacted: { label: 'Contacted', tone: '' },
  converted: { label: 'Converted', tone: 'good' },
  closed: { label: 'Closed', tone: '' },
};

export default function AdminLeadsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    const [leads, accounts, pending] = await Promise.all([
      api('/api/leads'),
      api('/api/analytics?resource=accounts').catch(() => []),
      api('/api/analytics?resource=pending-profiles').catch(() => []),
    ]);
    const tutors = (Array.isArray(accounts) ? accounts : [])
      .filter((a) => a.role === 'tutor')
      .map((t) => t.tutorName || t.fullName)
      .filter(Boolean);
    return {
      leads: Array.isArray(leads) ? leads : [],
      pending: Array.isArray(pending) ? pending : [],
      tutors,
    };
  }, [refreshKey]);

  const { loading, error, data } = useAsync(load, [refreshKey]);
  const leads = data?.leads ?? [];
  const pending = data?.pending ?? [];
  const tutors = data?.tutors ?? [];

  async function assign(lead, tutorName) {
    if (!tutorName) return;
    setBusy(lead.id);
    setActionError('');
    try {
      // Assigning also creates the student record, so the family becomes
      // visible to the tutor and to billing — not just marked on the lead.
      await api('/api/leads', {
        method: 'PATCH',
        body: { id: lead.id, assigned_tutor: tutorName, status: 'assigned' },
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function approve(profile, role) {
    setBusy(profile.id);
    setActionError('');
    try {
      await api('/api/auth', {
        method: 'POST',
        body: { action: 'approve-student', userId: profile.id, role },
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const newLeads = leads.filter((l) => l.status === 'new');

  return (
    <>
      <PageHead title="Leads">
        New enquiries, and people waiting on an account being approved.
      </PageHead>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

      <KpiRow cols={3}>
        <Kpi label="New enquiries" value={newLeads.length} icon={Leads} />
        <Kpi label="Awaiting approval" value={pending.length} icon={User} />
        <Kpi label="Total leads" value={leads.length} />
      </KpiRow>

      {pending.length > 0 && (
        <Card title={`Awaiting approval (${pending.length})`} style={{ borderColor: 'var(--gold)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '.83rem', color: 'var(--ink-3)' }}>
            These people have signed up and can&rsquo;t use anything until you approve them.
          </p>
          <Table head={['Name', 'Email', 'Signed up', '']}>
            {pending.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name || '—'}</td>
                <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{p.email}</td>
                <td>{longDate(p.created_at)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Button disabled={busy === p.id} onClick={() => approve(p, 'student')}>
                    Approve as student
                  </Button>{' '}
                  <Button variant="ghost" disabled={busy === p.id} onClick={() => approve(p, 'tutor')}>
                    As tutor
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card title={loading ? 'Enquiries' : `Enquiries (${leads.length})`}>
        {loading ? (
          <Loading rows={4} />
        ) : leads.length === 0 ? (
          <Empty icon={Leads}>No enquiries yet.</Empty>
        ) : (
          <Table head={['Name', 'Email', 'Subject', 'Received', 'Status', 'Tutor']}>
            {leads.map((l) => {
              const s = LEAD_STATUS[l.status] || { label: l.status, tone: '' };
              return (
                <tr key={l.id}>
                  <td>{l.name || '—'}</td>
                  <td style={{ color: 'var(--ink-3)', fontSize: '.78rem' }}>{l.email}</td>
                  <td>{[l.subject, l.level].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{longDate(l.created_at)}</td>
                  <td><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td>
                    <select
                      defaultValue={l.assigned_tutor || ''}
                      disabled={busy === l.id}
                      onChange={(e) => assign(l, e.target.value)}
                      aria-label={`Assign a tutor to ${l.name || 'this lead'}`}
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
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
