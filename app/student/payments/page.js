'use client';

import { useEffect, useRef, useState } from 'react';
import { api, money, longDate, lessonTime } from '@/lib/api';
import {
  PageHead, Card, KpiRow, Kpi, Table, Badge,
  Empty, Loading, ErrorNote, useAsync,
} from '@/components/ui';
import { Payments, Lessons } from '@/components/icons';

// A publishable key belongs in the browser — it isn't a secret. It does
// decide whether cards are real, though, so it comes from the environment
// rather than the source: baking it in meant test and production could never
// differ, and going live would be a code change (SCRUM-95).
//
// The legacy test key stays as the local-development fallback so nothing has
// to be configured to work on this page. A deployed build without the
// variable set says so, rather than rendering a card field that can't work.
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  || (process.env.NODE_ENV === 'development'
    ? 'pk_test_51JCVAfK7JOHHGmfJ3soySmouzVwdHLSPwFZKKz7ZsHmrpN8A9x9to207NqshfThICO0QOQKSmQhAO02n2wZ3fnZa00DGO1eals'
    : '');

// Stripe.js is only ever needed on this page, so it loads on demand rather
// than in <head> for every visitor. One shared promise — a second "Add
// card" click reuses the script tag from the first.
let stripePromise;
function loadStripe() {
  if (!STRIPE_PK) {
    return Promise.reject(new Error(
      'Card payments aren’t configured for this environment. Please let us know at hello@seedsinstitute.co.uk.',
    ));
  }
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      if (window.Stripe) { resolve(window.Stripe(STRIPE_PK)); return; }
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3';
      s.onload = () => resolve(window.Stripe(STRIPE_PK));
      s.onerror = () => reject(new Error('Could not load Stripe — check your connection and try again.'));
      document.head.appendChild(s);
    });
  }
  return stripePromise;
}

// How a billing batch reads to the person paying it. "payment_link_sent"
// tells a parent nothing; "awaiting payment" tells them what to do.
const BATCH_STATUS = {
  paid: { label: 'Paid', tone: 'good' },
  payment_link_sent: { label: 'Awaiting payment', tone: 'warn' },
  failed: { label: 'Payment failed', tone: 'bad' },
  refunded: { label: 'Refunded', tone: '' },
  pending: { label: 'Pending', tone: '' },
};

// Only these outcomes are billed — must match BILLABLE_OUTCOMES in the
// backend's lib/cancellationPolicy.js.
const BILLABLE = ['delivered', 'partial', 'no_show', 'late_cancelled'];

export default function StudentPaymentsPage() {
  const { loading, error, data } = useAsync(async () => {
    const [billing, bookings, cycle] = await Promise.all([
      api('/api/billing?resource=billing-history'),
      api('/api/analytics?resource=my-bookings').catch(() => ({ recentBookings: [] })),
      // Cycle and cards are secondary: if either fails, history still shows.
      api('/api/billing?resource=billing-cycle').catch(() => ({ billingCycle: 'weekly' })),
    ]);
    return {
      batches: billing?.batches || [],
      bookings: bookings?.recentBookings || [],
      cycle: cycle?.billingCycle || 'weekly',
    };
  }, []);

  const batches = data?.batches ?? [];
  const bookings = data?.bookings ?? [];

  // The billing endpoints resolve the family's Stripe customer from the
  // logged-in account itself, so this page no longer has to find it. It used
  // to be dug out of the student's bookings, which meant a card saved before
  // the first lesson was billed vanished on reload (SCRUM-93).
  const [cycle, setCycle] = useState(null);
  useEffect(() => {
    if (!data) return;
    setCycle(data.cycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // One-line status for the billing controls (card saved, cycle changed…) —
  // the new app has no toast system, and a full error block is wrong for
  // good news.
  const [notice, setNotice] = useState(null); // { tone: 'good' | 'bad', text }

  async function pickCycle(next) {
    const prev = cycle;
    setCycle(next); // optimistic — revert below if the POST fails
    try {
      await api('/api/billing', {
        method: 'POST',
        body: { resource: 'billing-cycle', billingCycle: next },
      });
      setNotice({ tone: 'good', text: `Billing cycle set to ${next} ✓` });
    } catch (e) {
      setCycle(prev);
      setNotice({ tone: 'bad', text: `Failed to update billing cycle: ${e.message}` });
    }
  }

  // ── Saved cards ──────────────────────────────────────────────────────────
  const [cards, setCards] = useState({ status: 'loading', list: [] });
  // Bumped after saving a card, to re-read the list from Stripe rather than
  // guess at what it now contains.
  const [cardsKey, setCardsKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setCards((c) => ({ ...c, status: 'loading' }));
    api('/api/billing?resource=payment-methods')
      .then((list) => { if (alive) setCards({ status: 'ready', list: Array.isArray(list) ? list : [] }); })
      .catch(() => { if (alive) setCards({ status: 'error', list: [] }); });
    return () => { alive = false; };
  }, [cardsKey]);

  // ── Add card (Stripe Elements) ───────────────────────────────────────────
  const [cardForm, setCardForm] = useState({ open: false, busy: false, error: '' });
  const cardMountRef = useRef(null);
  const cardElementRef = useRef(null);

  // Mount the Elements card field when (and only while) the form is open.
  useEffect(() => {
    if (!cardForm.open || !cardMountRef.current || cardElementRef.current) return;
    let dead = false;
    loadStripe()
      .then((stripe) => {
        if (dead || cardElementRef.current) return;
        const el = stripe.elements().create('card', {
          style: {
            base: {
              fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#0D1B2A',
              '::placeholder': { color: '#A7A7A7' },
            },
            invalid: { color: '#c0392b' },
          },
          hidePostalCode: true,
        });
        el.mount(cardMountRef.current);
        cardElementRef.current = el;
      })
      .catch((e) => { if (!dead) setCardForm((f) => ({ ...f, error: e.message })); });
    return () => { dead = true; };
  }, [cardForm.open]);

  function toggleCardForm() {
    if (cardForm.open && cardElementRef.current) {
      cardElementRef.current.unmount();
      cardElementRef.current = null;
    }
    setCardForm({ open: !cardForm.open, busy: false, error: '' });
  }

  async function submitCard() {
    setCardForm((f) => ({ ...f, busy: true, error: '' }));
    try {
      const stripe = await loadStripe();
      const data2 = await api('/api/billing', {
        method: 'POST',
        body: { resource: 'setup-intent' },
      });
      const { error: stripeError } = await stripe.confirmCardSetup(
        data2.clientSecret, { payment_method: { card: cardElementRef.current } },
      );
      if (stripeError) throw new Error(stripeError.message);
      setCardsKey((k) => k + 1);
      cardElementRef.current?.clear();
      setCardForm({ open: false, busy: false, error: '' });
      setNotice({ tone: 'good', text: 'Card saved ✓' });
    } catch (e) {
      setCardForm((f) => ({ ...f, busy: false, error: e.message }));
    }
  }

  async function removeCard(paymentMethodId) {
    if (!window.confirm('Remove this saved card?')) return;
    try {
      await api('/api/billing', {
        method: 'POST',
        body: { resource: 'payment-methods', action: 'detach', paymentMethodId },
      });
      setCards((c) => ({ ...c, list: c.list.filter((m) => m.id !== paymentMethodId) }));
    } catch (e) {
      setNotice({ tone: 'bad', text: `Failed to remove card: ${e.message}` });
    }
  }

  // ── Stripe customer portal ───────────────────────────────────────────────
  async function openBillingPortal() {
    try {
      // No customerId: the server resolves the family's billing account from
      // the login, and says so plainly if there isn't one yet.
      const data2 = await api('/api/billing', {
        method: 'POST',
        body: { resource: 'customer-portal', returnUrl: window.location.href },
      });
      window.location.href = data2.url;
    } catch (e) {
      setNotice({ tone: 'bad', text: `Failed to open billing portal: ${e.message}` });
    }
  }

  const paid = batches.filter((b) => b.status === 'paid');
  const outstanding = batches.filter((b) => b.status === 'payment_link_sent' || b.status === 'failed');

  const paidTotal = paid.reduce((s, b) => s + (b.totalPence || 0), 0);
  const owedTotal = outstanding.reduce((s, b) => s + (b.totalPence || 0), 0);

  // Lesson-by-lesson, so a charge can always be traced to what it paid for.
  const charged = bookings
    .filter((b) => BILLABLE.includes(b.deliveryStatus))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <PageHead title="Payments">
          What you&rsquo;ve been charged, and which lesson each charge was for.
        </PageHead>
        <button type="button" className="btn-xs ghost" style={{ padding: '8px 16px' }} onClick={openBillingPortal}>
          Manage billing →
        </button>
      </div>

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

      <KpiRow cols={3}>
        <Kpi label="Paid so far" value={money(paidTotal)} icon={Payments} />
        <Kpi label="Outstanding" value={money(owedTotal)} />
        <Kpi label="Lessons charged" value={charged.length} icon={Lessons} />
      </KpiRow>

      <Card title="Billing cycle">
        <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', margin: '0 0 12px' }}>
          Lessons are billed automatically for everything completed since your last bill — choose how often.
        </p>
        <div className="sx-cycle">
          {['weekly', 'monthly'].map((c) => (
            <button
              key={c} type="button"
              className={`sx-cycle-btn${cycle === c ? ' on' : ''}`}
              onClick={() => pickCycle(c)}
            >
              {c === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </Card>

      <Card
        title="Saved cards"
        action={
          <button type="button" className="card-link" onClick={toggleCardForm}>
            {cardForm.open ? 'Cancel' : '+ Add card'}
          </button>
        }
      >
        {cards.status === 'loading' ? (
          <Loading rows={1} />
        ) : cards.status === 'error' ? (
          <Empty>Couldn&rsquo;t load saved cards.</Empty>
        ) : cards.list.length === 0 ? (
          <Empty icon={Payments}>No saved cards yet.</Empty>
        ) : (
          cards.list.map((c) => (
            <div key={c.id} className="sx-card-row">
              <div style={{ fontWeight: 600, fontSize: '.85rem', textTransform: 'capitalize' }}>
                {c.brand || 'Card'} •••• {c.last4}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '.75rem', color: 'var(--ink-3)' }}>
                  Exp {String(c.expMonth).padStart(2, '0')}/{c.expYear}
                </span>
                <button type="button" className="btn-xs danger" onClick={() => removeCard(c.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}

        {cardForm.open && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0EDE8' }}>
            {cardForm.error ? <div className="sx-error">{cardForm.error}</div> : null}
            <div className="sx-card-mount" ref={cardMountRef} />
            <button
              type="button" className="sx-enter"
              style={{ width: 'auto', padding: '9px 20px' }}
              disabled={cardForm.busy}
              onClick={submitCard}
            >
              {cardForm.busy ? 'Saving…' : 'Save card'}
            </button>
          </div>
        )}
      </Card>

      <Card title="Billing periods">
        {loading ? (
          <Loading rows={3} />
        ) : batches.length === 0 ? (
          <Empty icon={Payments}>
            Nothing billed yet. Lessons are charged on a regular cycle, not one at a time.
          </Empty>
        ) : (
          <Table head={['Period', 'Amount', 'Status']}>
            {batches.map((b, i) => {
              const s = BATCH_STATUS[b.status] || { label: b.status, tone: '' };
              return (
                <tr key={b.id || i}>
                  <td>
                    {b.periodStart && b.periodEnd
                      ? `${longDate(b.periodStart)} — ${longDate(b.periodEnd)}`
                      : longDate(b.created_at)}
                  </td>
                  <td className="num">{money(b.totalPence)}</td>
                  <td><Badge tone={s.tone}>{s.label}</Badge></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Card title="Lesson by lesson">
        {loading ? (
          <Loading rows={3} />
        ) : charged.length === 0 ? (
          <Empty icon={Lessons}>No charged lessons yet.</Empty>
        ) : (
          <Table head={['Lesson', 'When', 'Tutor', 'Fee']}>
            {charged.slice(0, 30).map((b) => (
              <tr key={b.id}>
                <td>
                  {b.subject || 'Lesson'}
                  {b.deliveryStatus !== 'delivered' && (
                    <>
                      {' '}
                      <Badge tone="warn">
                        {b.deliveryStatus === 'no_show' ? 'Missed'
                          : b.deliveryStatus === 'partial' ? 'Cut short'
                          : 'Late cancellation'}
                      </Badge>
                    </>
                  )}
                </td>
                <td>{lessonTime(b.startTime)}</td>
                <td>{b.tutorName || '—'}</td>
                <td className="num">{money(b.feePence)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
