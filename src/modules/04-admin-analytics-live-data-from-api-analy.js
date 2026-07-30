// Extracted from index.html by the SCRUM-32 migration (block 4).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── ADMIN ANALYTICS — live data from /api/analytics ─────────────────────
const AD_BACKEND = 'https://seeds-backend-six.vercel.app';
let adData = null; // cached after first load

// Admin-only backend calls need the caller's Supabase session token so the
// backend can verify they're actually an admin.
async function adAuthHeaders() {
  const { data: { session } } = await sbClient.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function adOpenHealthCheck() {
  const modal = document.getElementById('ad-health-modal');
  const body = document.getElementById('ad-health-body');
  body.innerHTML = '<div style="color:#A7A7A7;font-size:.85rem;padding:20px;text-align:center">Loading…</div>';
  modal.classList.add('open');
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/health', { headers: await adAuthHeaders() });
    const report = await r.json();
    if (!r.ok) throw new Error(report.error || 'Failed to load');

    const row = (label, value, ok) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F8F6F2;font-size:.82rem">
      <span style="color:#718096">${escapeHtml(label)}</span>
      <span style="font-weight:600;color:${ok === false ? '#c0392b' : '#0D1B2A'}">${escapeHtml(String(value))}</span>
    </div>`;

    const stats = report.stats || {};
    let html = `<div style="background:${String(report.summary).startsWith('✓') ? '#f0faf4' : '#fef2f2'};border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:.85rem;font-weight:600;color:${String(report.summary).startsWith('✓') ? '#2D7A4F' : '#c0392b'}">${escapeHtml(report.summary || '')}</div>`;

    html += `<div class="tp-card-hdr" style="margin-bottom:8px"><span class="tp-card-title">Business activity</span></div>`;
    if (stats.error) {
      html += `<div style="color:#c0392b;font-size:.82rem">${escapeHtml(stats.error)}</div>`;
    } else {
      html += row('Bookings today', stats.bookingsToday);
      html += row('Payment failures (7 days)', stats.paymentFailuresLast7Days, stats.paymentFailuresLast7Days === 0);
      html += row('Pending payouts', `${stats.pendingPayoutsCount} · £${((stats.pendingPayoutsPence||0)/100).toFixed(2)}`);
      html += row('Stripe webhooks (7 days)', stats.stripeWebhooksReceivedLast7Days, !String(stats.stripeWebhooksReceivedLast7Days).startsWith('⚠'));
    }

    html += `<div class="tp-card-hdr" style="margin:16px 0 8px"><span class="tp-card-title">Environment</span></div>`;
    Object.entries(report.env || {}).forEach(([k,v]) => html += row(k, v, !String(v).startsWith('✗')));

    html += `<div class="tp-card-hdr" style="margin:16px 0 8px"><span class="tp-card-title">Database</span></div>`;
    Object.entries(report.database || {}).forEach(([k,v]) => html += row(k, v, !String(v).startsWith('✗')));

    html += `<div class="tp-card-hdr" style="margin:16px 0 8px"><span class="tp-card-title">Stripe</span></div>`;
    Object.entries(report.stripe || {}).forEach(([k,v]) => html += row(k, v, !String(v).startsWith('✗')));

    html += `<div style="font-size:.72rem;color:#A7A7A7;margin-top:14px">${escapeHtml(report.email?.note || '')}</div>`;
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<div style="color:#c0392b;font-size:.85rem;padding:20px;text-align:center">Failed to load: ${escapeHtml(e.message)}</div>`;
  }
}

async function adLoadAnalytics() {
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/analytics`, { headers: await adAuthHeaders() });
    adData = await r.json();
    adRenderDashboard();
    adRenderBookings();
    adRenderPayments();
    adRenderTutorPayouts();
    adRenderAttention();
    // Also update tutor home KPIs if tutor portal is open
    if (earnCurrentTutor) tpUpdateHomeKPIs(earnCurrentTutor);
  } catch(e) {
    console.error('Analytics load failed:', e.message);
    seedsToast('Dashboard failed to load — is the backend deployed? Check /api/health for diagnostics.');
    const paymentsPanel = document.getElementById('ad-payments');
    if (paymentsPanel) {
      paymentsPanel.innerHTML = `
        <h2 style="font-family:'DM Serif Display',serif;font-size:1.45rem;color:#0D1B2A;margin-bottom:16px">Payments &amp; Finance</h2>
        <div style="background:#fef2f2;border:1px solid #f5c2c2;border-radius:10px;padding:16px 18px;font-size:.85rem;color:#7a2020">
          Couldn't load payments data — figures below may be out of date or missing.
          <button onclick="adData=null;adLoadAnalytics();" style="margin-left:10px;padding:5px 12px;background:#fff;border:1px solid #f5c2c2;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">Retry</button>
        </div>`;
    }
  }
}

function adFmt(pence) {
  return '£' + (pence / 100).toLocaleString('en-GB', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function adDateFmt(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
}
const TYPE_LABEL = {gcse:'GCSE 1:1', alevel:'A-Level 1:1', group:'Group', trial:'Free trial',consultation:'Initial Consultation'};

// ── DASHBOARD KPIs & CHART ───────────────────────────────────────────────
function adRenderDashboard() {
  if (!adData) return;
  const { revenue, studentCount, bookingCount, byType, monthly, tutors, recentBookings } = adData;

  // Retention metrics — how many students had 2+, 3+ lessons
  const lessonCounts = {};
  recentBookings.forEach(b => {
    if (b.status === 'cancelled') return;
    lessonCounts[b.studentName] = (lessonCounts[b.studentName] || 0) + 1;
  });
  const totalStudents = Object.keys(lessonCounts).length || 1;
  const had2Plus = Object.values(lessonCounts).filter(n => n >= 2).length;
  const had3Plus = Object.values(lessonCounts).filter(n => n >= 3).length;
  const retention2 = Math.round((had2Plus / totalStudents) * 100);
  const retention3 = Math.round((had3Plus / totalStudents) * 100);
  const trialToBook = byType.gcse + byType.alevel + byType.group > 0
    ? Math.round(((byType.gcse + byType.alevel + byType.group) / Math.max(byType.trial || 1, 1)) * 100)
    : 0;

  // KPIs
  const trend = revenue.lastMonth > 0
    ? ((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth * 100).toFixed(0)
    : 0;
  const trendSign = trend >= 0 ? '↑' : '↓';
  const trendClass = trend >= 0 ? '' : 'ad-trend-down';

  document.querySelector('#ad-home .ad-kpi-row').innerHTML = `
    <div class="ad-kpi" style="border-left-color:#2D7A4F">
      <div class="ad-kpi-num">£<em id="ad-kpi-month">${(revenue.thisMonth/100).toLocaleString('en-GB',{minimumFractionDigits:0})}</em></div>
      <div class="ad-kpi-lbl">Revenue this month</div>
      <div class="ad-kpi-trend ${trendClass}">${trendSign} ${Math.abs(trend)}% vs last month</div>
    </div>
    <div class="ad-kpi" style="border-left-color:#4A90D9">
      <div class="ad-kpi-num">${studentCount}</div>
      <div class="ad-kpi-lbl">Total students</div>
      <div class="ad-kpi-trend">On platform</div>
    </div>
    <div class="ad-kpi" style="border-left-color:#C8A15A">
      <div class="ad-kpi-num">${bookingCount}</div>
      <div class="ad-kpi-lbl">Total bookings</div>
      <div class="ad-kpi-trend">${byType.trial||0} trials · ${byType.gcse||0} GCSE · ${byType.alevel||0} A-Level</div>
    </div>
    <div class="ad-kpi" style="border-left-color:#7B5EA7">
      <div class="ad-kpi-num">£<em>${(revenue.total/100).toLocaleString('en-GB',{minimumFractionDigits:0})}</em></div>
      <div class="ad-kpi-lbl">All-time revenue</div>
      <div class="ad-kpi-trend">Since launch</div>
    </div>
    <div class="ad-kpi" style="border-left-color:#c0392b">
      <div class="ad-kpi-num">${Object.values(tutors).reduce((s,t)=>s+(t.unpaid>0?1:0),0)}</div>
      <div class="ad-kpi-lbl">Pending payouts</div>
      <div class="ad-kpi-trend ad-trend-down">Awaiting approval</div>
    </div>`;

  // Retention row
  let retEl = document.getElementById('ad-retention-row');
  if (!retEl) {
    retEl = document.createElement('div');
    retEl.id = 'ad-retention-row';
    retEl.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:18px';
    const kpiRow = document.querySelector('#ad-home .ad-kpi-row');
    if (kpiRow?.parentNode) kpiRow.parentNode.insertBefore(retEl, kpiRow.nextSibling);
  }
  const retColour = (v) => v >= 70 ? '#2D7A4F' : v >= 40 ? '#C8A15A' : '#c0392b';
  retEl.innerHTML = `
    <div class="ad-kpi" style="border-left-color:${retColour(trialToBook)}">
      <div class="ad-kpi-num">${trialToBook}<em>%</em></div>
      <div class="ad-kpi-lbl">Trial → paid conversion</div>
      <div class="ad-kpi-trend">${byType.trial||0} trials, ${(byType.gcse||0)+(byType.alevel||0)} paid lessons</div>
    </div>
    <div class="ad-kpi" style="border-left-color:${retColour(retention2)}">
      <div class="ad-kpi-num">${retention2}<em>%</em></div>
      <div class="ad-kpi-lbl">2+ lesson retention</div>
      <div class="ad-kpi-trend">${had2Plus} of ${totalStudents} students came back</div>
    </div>
    <div class="ad-kpi" style="border-left-color:${retColour(retention3)}">
      <div class="ad-kpi-num">${retention3}<em>%</em></div>
      <div class="ad-kpi-lbl">3+ lesson retention</div>
      <div class="ad-kpi-trend">${had3Plus} of ${totalStudents} students stayed 3+ lessons</div>
    </div>`;

  // Revenue chart (last 12 months)
  const months = Object.entries(monthly);
  const maxVal = Math.max(...months.map(([,v])=>v), 1);
  const chartEl = document.querySelector('#ad-home .ad-bar-chart');
  if (chartEl) {
    chartEl.innerHTML = months.map(([key, val]) => {
      const pct = Math.round((val / maxVal) * 100);
      const label = new Date(key + '-01').toLocaleDateString('en-GB', {month:'short'});
      const isNow = key === new Date().toISOString().slice(0,7);
      return `<div class="ad-bar-col" title="${label}: ${adFmt(val)}">
        <div class="ad-bar" style="height:${Math.max(pct,2)}%;${isNow?'background:linear-gradient(180deg,#0D1B2A,#243650)':''}"></div>
        <div class="ad-bar-lbl">${label}</div>
      </div>`;
    }).join('');
    const below = chartEl.nextElementSibling;
    if (below) below.textContent = `${adFmt(revenue.thisMonth)} this month · ${bookingCount} total bookings`;
  }

  // Recent bookings in attention card
  const attentionBody = document.querySelector('#ad-home .ad-card:last-child');
  if (attentionBody && recentBookings?.length) {
    const rows = recentBookings.slice(0,3).map(b => `
      <div class="ad-lead-row">
        <div class="ad-lead-av">${(b.studentName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="ad-lead-info">
          <div class="ad-lead-name">${b.studentName} — ${TYPE_LABEL[b.lessonType]||b.lessonType}</div>
          <div class="ad-lead-meta">${b.subject} · ${b.tutorName} · ${adDateFmt(b.startTime)}</div>
        </div>
        <span class="ad-status-pill ${b.status==='confirmed'?'ad-status-assigned':'ad-status-confirmed'}">${b.status}</span>
      </div>`).join('');
    attentionBody.innerHTML = `
      <div class="ad-card-hdr"><span class="ad-card-title">Recent bookings</span><span class="ad-card-link" onclick="showAdPanel('ad-bookings',null)">View all →</span></div>
      ${rows}`;
  }

  // Tutor capacity — count this week's confirmed lessons per tutor (cap 20/wk)
  const capEl = document.getElementById('ad-capacity-list');
  if (capEl && adData.recentBookings) {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+7);
    const counts = {};
    adData.recentBookings.forEach(b => {
      if (b.status === 'cancelled') return;
      const d = new Date(b.startTime);
      if (d >= weekStart && d < weekEnd) counts[b.tutorName] = (counts[b.tutorName]||0) + 1;
    });
    const colours = ['#C8A15A','#4A90D9','#2D7A4F','#7B5EA7'];
    const tutors = Object.keys(counts);
    if (!tutors.length) {
      capEl.innerHTML = '<div style="padding:12px;text-align:center;color:#A7A7A7;font-size:.8rem">No lessons scheduled this week yet.</div>';
    } else {
      capEl.innerHTML = tutors.map((t,i) => {
        const hrs = counts[t];
        const pct = Math.min(100, Math.round((hrs/20)*100));
        return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px"><span style="font-weight:600;color:#0D1B2A">${t}</span><span style="color:#718096">${hrs}/20 lessons</span></div>
          <div class="ad-load-bar"><div class="ad-load-fill" style="width:${pct}%;background:${colours[i%colours.length]}"></div></div>
        </div>`;
      }).join('');
    }
  }
}

// ── BOOKINGS PANEL ───────────────────────────────────────────────────────
async function adRenderAttention() {
  const el = document.getElementById('ad-attention-list');
  if (!el) return;
  try {
    // New leads + pending signups + unconfirmed assigned leads
    const attnAuthHeaders = await adAuthHeaders();
    const [newR, pendR] = await Promise.all([
      fetchWithTimeout(`${AD_BACKEND}/api/leads?status=new`, { headers: attnAuthHeaders }),
      fetchWithTimeout(`${AD_BACKEND}/api/analytics?resource=pending-profiles`, { headers: attnAuthHeaders }),
    ]);
    const newLeads = await newR.json();
    const pending = await pendR.json();
    const items = [];
    (Array.isArray(newLeads) ? newLeads : []).forEach(l => items.push({
      initials: (l.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      name: `${l.name} — enquiry`,
      meta: `${l.subject||''} ${l.level||''} · via journey form`,
      pill: 'New', pillClass: 'ad-status-new',
    }));
    (Array.isArray(pending) ? pending : []).forEach(p => items.push({
      initials: (p.full_name||p.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      name: `${p.full_name||p.email} — signup`,
      meta: `${p.subject||''} ${p.level||''} · awaiting approval`,
      pill: 'Pending', pillClass: 'ad-status-pending',
    }));
    if (!items.length) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:#A7A7A7;font-size:.82rem">✓ All caught up — nothing needs your attention.</div>';
      return;
    }
    el.innerHTML = items.slice(0,6).map(it => `
      <div class="ad-lead-row">
        <div class="ad-lead-av">${it.initials}</div>
        <div class="ad-lead-info"><div class="ad-lead-name">${it.name}</div><div class="ad-lead-meta">${it.meta}</div></div>
        <span class="ad-status-pill ${it.pillClass}">${it.pill}</span>
        <div class="ad-lead-action"><button class="ad-btn-xs ad-btn-assign" onclick="showAdPanel('ad-leads',null)">Handle</button></div>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:#A7A7A7;font-size:.82rem">Could not load.</div>';
  }
}

function adFilterBookings() {
  const tutor = document.getElementById('ad-bk-filter-tutor')?.value || '';
  const status = document.getElementById('ad-bk-filter-status')?.value || '';
  const payStatus = document.getElementById('ad-bk-filter-paystatus')?.value || '';
  const date = document.getElementById('ad-bk-filter-date')?.value || '';
  adRenderBookings(tutor, status, date, payStatus);
}

function adClearBookingFilters() {
  ['ad-bk-filter-tutor','ad-bk-filter-status','ad-bk-filter-paystatus','ad-bk-filter-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  adRenderBookings();
}

function adRenderBookings(filterTutor='', filterStatus='', filterDate='', filterPayStatus='') {
  if (!adData?.recentBookings) return;
  const tbody = document.querySelector('#ad-bookings-tbody') || document.querySelector('#ad-bookings .ad-table tbody');
  if (!tbody) return;

  let bookings = adData.recentBookings;
  if (filterTutor) bookings = bookings.filter(b => b.tutorName === filterTutor);
  if (filterStatus) bookings = bookings.filter(b => b.status === filterStatus);
  if (filterPayStatus) bookings = bookings.filter(b => b.paymentStatus === filterPayStatus);
  if (filterDate) {
    const d = new Date(filterDate).toDateString();
    bookings = bookings.filter(b => new Date(b.startTime).toDateString() === d);
  }
  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#A7A7A7;padding:20px;font-size:.82rem">No bookings match your filters</td></tr>`;
    return;
  }
  tbody.innerHTML = bookings.map(b => {
    const initials = (b.studentName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const isCancelled = b.status === 'cancelled';
    // Under periodic billing every non-cancelled booking is status
    // 'confirmed' immediately — payment_status is the only accurate signal
    // for "has this actually been paid for", so the badge is driven by it
    // directly rather than inferred from the lesson's own status.
    const payBadge = isCancelled
      ? '<span class="ad-pay-status" style="background:#f5f5f5;color:#999">Cancelled</span>'
      : b.paymentStatus === 'free'
      ? '<span class="ad-pay-status ad-pay-free">Free</span>'
      : b.paymentStatus === 'paid'
        ? '<span class="ad-pay-status ad-pay-paid">Paid</span>'
        : b.paymentStatus === 'failed'
          ? '<span class="ad-pay-status" style="background:#fdeaea;color:#c0392b">Failed</span>'
          : b.paymentStatus === 'invoiced'
            ? '<span class="ad-pay-status" style="background:#fff3cd;color:#8a6d00">Invoiced</span>'
            : '<span class="ad-pay-status ad-pay-pending">Unbilled</span>';
    const actions = isCancelled ? '' : `
      <button class="ad-btn-xs ad-btn-ghost" style="margin-right:5px" onclick="adRescheduleBooking('${b.id}','${b.startTime}')">Reschedule</button>
      <button class="ad-btn-xs" style="color:#c0392b;border:1px solid #f0d0d0;background:#fff" onclick="adCancelBooking('${b.id}',this)">Cancel</button>`;
    return `<tr${isCancelled && b.deliveryStatus !== 'late_cancelled' ?' style="opacity:0.5"':''}>
      <td><div style="display:flex;align-items:center;gap:9px"><div class="ad-mini-av">${initials}</div>${b.studentName}</div></td>
      <td>${b.tutorName}</td>
      <td>${b.subject}</td>
      <td>${adDateFmt(b.startTime)}</td>
      <td>${TYPE_LABEL[b.lessonType]||b.lessonType}</td>
      <td>${adDeliveryBadge(b)}</td>
      <td>${payBadge}</td>
      <td style="white-space:nowrap">${actions}</td>
      <td>${b.paymentStatus === 'unbilled' && b.feePence > 0 && b.status !== 'cancelled' ? `<button class="ad-btn-xs" style="color:#2D7A4F;border:1px solid #c3e6cb;background:#fff" onclick="adChargeStudent('${b.id}',this)">💳 Charge now</button>` : ''} ${b.paymentIntentId ? `<button class="ad-btn-xs ad-btn-ghost" onclick="adDownloadInvoice('${b.id}')">Receipt</button>` : ''}</td>
    </tr>`;
  }).join('');
}

// SCRUM-88: what actually happened in the lesson, which is now what decides
// whether it gets billed and paid out. "Awaiting" is the state that matters
// most to an admin — those lessons are stuck, invisible to both sweeps until
// the tutor answers.
function adDeliveryBadge(b) {
  const S = {
    delivered:      ['Taught',            '#2D7A4F', '#EAF5EE'],
    no_show:        ['No-show',           '#C0632F', '#FDF0E8'],
    late_cancelled: ['Late cancellation', '#C0632F', '#FDF0E8'],
    waived:         ['Waived',            '#8A8A8A', '#F4F4F4'],
  };
  if (b.deliveryStatus) {
    const [label, fg, bg] = S[b.deliveryStatus] || [b.deliveryStatus, '#8A8A8A', '#F4F4F4'];
    const by = b.deliveryMarkedBy ? ' — marked by ' + b.deliveryMarkedBy : '';
    const note = b.deliveryNote ? '\n' + b.deliveryNote : '';
    return `<span class="ad-pay-status" title="${(label + by + note).replace(/"/g,'&quot;')}" style="background:${bg};color:${fg}">${label}</span>`;
  }
  if (b.status === 'requested') return '<span class="ad-pay-status" style="background:#f5f5f5;color:#999">Not confirmed</span>';
  const finished = b.endTime && new Date(b.endTime) < new Date();
  if (!finished) return '<span style="color:#C7C7C7">—</span>';
  return '<span class="ad-pay-status" title="Nobody has confirmed whether this lesson happened. It will not be billed or paid out until they do." style="background:#FFF3CD;color:#8a6d00">Awaiting</span>';
}

async function adCancelBooking(bookingId, btn) {
  // SCRUM-88: who cancelled decides whether the family pays. A family
  // cancelling inside 18 hours is charged in full and the tutor is paid for
  // the slot they held; anyone else cancelling is free. The admin has to say
  // which it was, because the backend can't know — and defaulting silently
  // to "family" would charge people for lessons Seeds itself called off.
  const who = prompt(
    'Who cancelled this lesson?\n\n' +
    '  1 — Seeds/admin (not charged)\n' +
    '  2 — The tutor (not charged)\n' +
    '  3 — The family (charged in full if inside 18 hours\' notice)\n\n' +
    'Enter 1, 2 or 3:', '1');
  if (who === null) return;
  const cancelledBy = { '1': 'seeds', '2': 'tutor', '3': 'family' }[who.trim()];
  if (!cancelledBy) { alert('Please enter 1, 2 or 3.'); return; }
  if (!confirm('Cancel this booking?\n\nAny refund due will be issued automatically. A late family cancellation is charged in full and is not refunded.')) return;
  btn.disabled = true; btn.textContent = 'Cancelling…';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/analytics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'cancel-booking', bookingId, cancelledBy }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    if (data.chargeable) {
      seedsToast('✓ Cancelled — charged in full. ' + (data.policyReason || ''), false);
    } else if (data.refunded) {
      seedsToast('✓ Booking cancelled — Stripe refund issued (' + data.refundId + ')', false);
    } else {
      seedsToast('✓ Booking cancelled (no payment on file)', false);
    }
    adData = null;
    await adLoadAnalytics();
  } catch(e) { alert('Cancel failed: ' + e.message); btn.disabled=false; btn.textContent='Cancel'; }
}

function adRescheduleBooking(bookingId, currentStart) {
  // Open the reschedule modal
  document.getElementById('ad-reschedule-booking-id').value = bookingId;
  const dt = document.getElementById('ad-reschedule-time');
  dt.value = new Date(currentStart).toISOString().slice(0,16);
  document.getElementById('ad-reschedule-error').style.display = 'none';
  document.getElementById('ad-reschedule-modal').classList.add('open');
}

async function adConfirmReschedule() {
  const bookingId = document.getElementById('ad-reschedule-booking-id').value;
  const newTime = document.getElementById('ad-reschedule-time').value;
  const btn = document.getElementById('ad-reschedule-btn');
  const errEl = document.getElementById('ad-reschedule-error');
  if (!newTime) { errEl.textContent='Please pick a new date and time'; errEl.style.display='block'; return; }
  btn.disabled=true; btn.textContent='Saving…'; errEl.style.display='none';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/analytics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'reschedule-booking', bookingId, newStartTime: new Date(newTime).toISOString() }),
    });
    if (!r.ok) throw new Error('Failed');
    document.getElementById('ad-reschedule-modal').classList.remove('open');
    seedsToast('✓ Lesson rescheduled', false);
    adData = null;
    await adLoadAnalytics();
  } catch(e) {
    errEl.textContent='Reschedule failed: '+e.message; errEl.style.display='block';
    btn.disabled=false; btn.textContent='Confirm reschedule →';
  }
}

// ── PAYMENTS PANEL ───────────────────────────────────────────────────────
function adRenderPayments() {
  if (!adData) return;
  const panel = document.getElementById('ad-payments');
  if (!panel) return;

  const { revenue, byType, recentBookings } = adData;
  const TUTOR_CUT = 0.78;
  const paidLessons = recentBookings.filter(b => b.feePence > 0 && b.paymentIntentId);
  const unpaidByStudents = recentBookings.filter(b => b.feePence > 0 && b.status !== 'cancelled' && !b.paymentIntentId);

  // Upcoming lessons in next 14 days
  const soon = new Date(); soon.setDate(soon.getDate() + 14);
  const upcoming = recentBookings.filter(b => {
    const d = new Date(b.startTime);
    return d > Date.now() && d <= soon && b.status !== 'cancelled';
  }).sort((a,b) => new Date(a.startTime)-new Date(b.startTime));

  // Per-tutor unpaid (owed wages)
  const tutorUnpaid = {};
  recentBookings.filter(b => b.status === 'confirmed' && b.feePence > 0 && b.paymentIntentId).forEach(b => {
    tutorUnpaid[b.tutorName] = (tutorUnpaid[b.tutorName]||0) + Math.round(b.feePence * TUTOR_CUT);
  });
  const totalWagesOwed = Object.values(tutorUnpaid).reduce((s,v)=>s+v,0);

  panel.innerHTML = `
    <h2 style="font-family:'DM Serif Display',serif;font-size:1.45rem;color:#0D1B2A;margin-bottom:16px">Payments & Finance</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div id="ad-churn-alert" style="flex:1;min-width:200px;background:#fef2f2;border:1px solid #f5c2c2;border-radius:10px;padding:10px 14px;font-size:.82rem"></div>
      <button onclick="adExportCSV()" style="padding:9px 16px;background:#fff;color:#0D1B2A;border:1.5px solid #E8E8E8;border-radius:10px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">⬇ Export CSV</button>
    </div>

    <!-- KPIs -->
    <div class="ad-kpi-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
      <div class="ad-kpi" style="border-left-color:#2D7A4F">
        <div class="ad-kpi-num">£<em>${(revenue.thisMonth/100).toLocaleString('en-GB',{minimumFractionDigits:0})}</em></div>
        <div class="ad-kpi-lbl">Revenue this month</div>
        <div class="ad-kpi-trend">${revenue.lastMonth>0?((revenue.thisMonth-revenue.lastMonth)/revenue.lastMonth*100).toFixed(0)+'% vs last':'First month'}</div>
      </div>
      <div class="ad-kpi" style="border-left-color:#C8A15A">
        <div class="ad-kpi-num">£<em>${(unpaidByStudents.reduce((s,b)=>s+b.feePence,0)/100).toFixed(0)}</em></div>
        <div class="ad-kpi-lbl">Unpaid by students</div>
        <div class="ad-kpi-trend">${unpaidByStudents.length} lessons awaiting payment</div>
      </div>
      <div class="ad-kpi" style="border-left-color:#7B5EA7">
        <div class="ad-kpi-num">£<em>${(totalWagesOwed/100).toFixed(0)}</em></div>
        <div class="ad-kpi-lbl">Wages owed to tutors</div>
        <div class="ad-kpi-trend">${Object.keys(tutorUnpaid).length} tutors with balances</div>
      </div>
      <div class="ad-kpi" style="border-left-color:#4A90D9">
        <div class="ad-kpi-num">£<em>${(revenue.total/100).toLocaleString('en-GB',{minimumFractionDigits:0})}</em></div>
        <div class="ad-kpi-lbl">All-time revenue</div>
        <div class="ad-kpi-trend">${byType.gcse+byType.alevel+byType.group} paid lessons</div>
      </div>
    </div>

    <!-- Upcoming 14 days -->
    ${upcoming.length ? `<div class="ad-card" style="margin-bottom:14px">
      <div class="ad-card-hdr" style="margin-bottom:14px">
        <span class="ad-card-title">Upcoming lessons — next 14 days</span>
        <span style="font-size:.72rem;color:#718096">${upcoming.length} lessons · £${(upcoming.reduce((s,b)=>s+b.feePence,0)/100).toFixed(0)} expected</span>
      </div>
      <table class="ad-table">
        <thead><tr><th>Date</th><th>Student</th><th>Tutor</th><th>Type</th><th>Fee</th><th>Paid?</th><th></th></tr></thead>
        <tbody>${upcoming.map(b=>{
          const initials=(b.studentName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
          const paid = !!b.paymentIntentId;
          return `<tr>
            <td>${adDateFmt(b.startTime)}</td>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="ad-mini-av">${initials}</div>${b.studentName}</div></td>
            <td>${b.tutorName}</td>
            <td>${TYPE_LABEL[b.lessonType]||b.lessonType}</td>
            <td style="font-weight:700">${b.feePence?adFmt(b.feePence):'Free'}</td>
            <td>${paid?'<span class="ad-pay-status ad-pay-paid">Paid</span>':'<span class="ad-pay-status ad-pay-pending">Unpaid</span>'}</td>
            <td>${!paid&&b.feePence>0?`<button class="ad-btn-xs" style="color:#2D7A4F;border:1px solid #c3e6cb;background:#fff" onclick="adChargeStudent('${b.id}',this)">💳 Charge</button>`:''}
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : ''}

    <!-- Wages owed -->
    ${Object.keys(tutorUnpaid).length ? `<div class="ad-card" style="margin-bottom:14px">
      <div class="ad-card-hdr" style="margin-bottom:14px">
        <span class="ad-card-title">Tutor wages due</span>
        <span style="font-size:.72rem;color:#718096">Based on confirmed & paid lessons · 78% cut</span>
      </div>
      ${Object.entries(tutorUnpaid).map(([name, pence])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F0EDE8">
          <div>
            <div style="font-weight:600;color:#0D1B2A">${name}</div>
            <div style="font-size:.75rem;color:#718096">Earned from confirmed paid lessons</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <strong style="color:#0D1B2A">${adFmt(pence)}</strong>
            <button class="ad-btn-xs ad-btn-assign" onclick="adApprovePayout('${name}',${pence})">Pay now</button>
          </div>
        </div>`).join('')}
      <div style="text-align:right;font-size:.82rem;font-weight:700;margin-top:10px">Total: <span style="color:#7B5EA7">${adFmt(totalWagesOwed)}</span></div>
    </div>` : '<div class="ad-card" style="margin-bottom:14px;padding:18px;text-align:center;color:#2D7A4F;font-size:.85rem">✓ All tutor wages are up to date</div>'}

    <!-- Failed payments -->
    ${(adData.failedPayments||[]).length ? `<div class="ad-card" style="margin-bottom:14px;border-left:3px solid #c0392b">
      <div class="ad-card-hdr" style="margin-bottom:14px">
        <span class="ad-card-title">Failed payments — needs action</span>
        <span style="font-size:.72rem;color:#c0392b">${adData.failedPayments.length} booking${adData.failedPayments.length===1?'':'s'}</span>
      </div>
      <table class="ad-table">
        <thead><tr><th>Student</th><th>Tutor</th><th>Subject</th><th>Date</th><th>Amount</th><th></th></tr></thead>
        <tbody>${adData.failedPayments.map(b => `
          <tr>
            <td>${b.studentName}${b.parentEmail?`<div style="font-size:.72rem;color:#A7A7A7">${b.parentEmail}</div>`:''}</td>
            <td>${b.tutorName}</td>
            <td>${b.subject||'—'}</td>
            <td>${adDateFmt(b.startTime)}</td>
            <td style="font-weight:700">${adFmt(b.feePence)}</td>
            <td><span class="ad-pay-status ad-pay-pending">Payment failed</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Payment reconciliation -->
    ${adData.reconciliation ? `<div class="ad-card" style="margin-bottom:14px">
      <div class="ad-card-hdr" style="margin-bottom:14px"><span class="ad-card-title">Payment reconciliation</span></div>
      <div class="ad-reconciliation-grid">
        <div><div style="color:#718096">Confirmed</div><div style="font-weight:700;color:#0D1B2A">${adData.reconciliation.confirmed}</div></div>
        <div><div style="color:#718096">Awaiting payment</div><div style="font-weight:700;color:#C8A15A">${adData.reconciliation.scheduled}</div></div>
        <div><div style="color:#718096">Failed</div><div style="font-weight:700;color:#c0392b">${adData.reconciliation.paymentFailed}</div></div>
        <div><div style="color:#718096">Cancelled</div><div style="font-weight:700;color:#718096">${adData.reconciliation.cancelled}</div></div>
        <div><div style="color:#718096">Completed</div><div style="font-weight:700;color:#2D7A4F">${adData.reconciliation.completed}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid #E8E8E8;font-size:.82rem">
        <span>Collected: <strong style="color:#2D7A4F">${adFmt(adData.reconciliation.totalCollected)}</strong></span>
        <span>Outstanding: <strong style="color:#C8A15A">${adFmt(adData.reconciliation.totalOutstanding)}</strong></span>
      </div>
    </div>` : ''}

    <!-- Full ledger -->
    <div class="ad-card">
      <div class="ad-card-hdr" style="margin-bottom:14px">
        <span class="ad-card-title">Payment ledger</span>
        <span style="font-size:.72rem;color:#718096">${paidLessons.length} transactions</span>
      </div>
      <table class="ad-table">
        <thead><tr><th>Student</th><th>Tutor</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${paidLessons.map(b => {
            const initials = (b.studentName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:9px"><div class="ad-mini-av">${initials}</div>${b.studentName}</div></td>
              <td>${b.tutorName}</td>
              <td>${TYPE_LABEL[b.lessonType]||b.lessonType}</td>
              <td>${adDateFmt(b.startTime)}</td>
              <td style="font-weight:700">${adFmt(b.feePence)}</td>
              <td><span class="ad-pay-status ad-pay-paid">Paid</span></td>
              <td><button class="ad-btn-xs" style="color:#c0392b;border:1px solid #f5c2c2;background:#fff" onclick="adRefundBooking('${b.id}',${b.feePence},this)">Refund</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div style="text-align:right;font-size:.82rem;font-weight:700;color:#0D1B2A;margin-top:12px;padding-top:10px;border-top:1px solid #E8E8E8">
        Total received: <span style="color:#2D7A4F">${adFmt(paidLessons.reduce((s,b)=>s+b.feePence,0))}</span>
      </div>
    </div>`;
}

async function adRefundBooking(bookingId, feePence, btnEl) {
  const amountStr = `£${(feePence/100).toFixed(2)}`;
  if (!confirm(`Refund ${amountStr} for this booking? This cannot be undone.`)) return;
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Refunding…'; }
  try {
    const r = await fetchWithTimeout(AD_BACKEND + '/api/analytics', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ action: 'refund-booking', bookingId }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Refund failed');
    seedsToast(`✓ Refunded ${amountStr}`, false);
    adLoadAnalytics();
  } catch(e) {
    seedsToast('Refund failed: ' + e.message);
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Refund'; }
  }
}

// SCRUM-84/86: single source of truth for "who is actually on the platform".
// Cached per panel-render so the Tutors and Students views don't each refetch.
let _adAccounts = null;
async function adLoadAccounts(force) {
  if (_adAccounts && !force) return _adAccounts;
  const r = await fetchWithTimeout(`${AD_BACKEND}/api/analytics?resource=accounts`, { headers: await adAuthHeaders() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Failed to load accounts');
  _adAccounts = Array.isArray(data) ? data : [];
  return _adAccounts;
}
function adTutorAccounts(accounts) {
  return accounts.filter(a => a.role === 'tutor' && a.tutorName);
}

// ── TUTOR PAYOUTS PANEL (inside Tutors section) ──────────────────────────
// SCRUM-84: tutorDefs used to be a hardcoded array of the original three
// tutors, so every tutor created since (Invite / Create / Approve as tutor)
// was invisible here — no payout card, no scheduling links, no cadence
// control. Now driven by the canonical tutors/profiles data.
async function adRenderTutorPayouts() {
  const panel = document.getElementById('ad-tutors');
  if (!panel) return;

  const TUTOR_CUT = 0.78;
  let tutorDefs;
  try {
    const accounts = await adLoadAccounts();
    const palette = ['#C8A15A', '#4A90D9', '#2D7A4F', '#7B5EA7', '#C05621'];
    tutorDefs = adTutorAccounts(accounts).map((t, i) => ({
      key: t.tutorName,
      label: t.tutorName,
      subj: t.subjects || '—',
      colour: palette[i % palette.length],
      userId: t.id,
      email: t.email,
      noLogin: t.noLogin,
    }));
  } catch (e) {
    panel.innerHTML = `<div style="padding:20px;color:#c0392b">Failed to load tutors: ${e.message}</div>`;
    return;
  }
  if (!tutorDefs.length) {
    panel.innerHTML = `<div style="padding:20px;color:#A7A7A7">No tutors yet — use “Create tutor” to add one.</div>`;
    return;
  }

  const payoutCards = tutorDefs.map(t => {
    const d = (adData?.tutors && adData.tutors[t.key]) || { lessons:0, revenue:0, unpaid:0 };
    const unpaid = d.unpaid;
    const totalEarned = Math.round(d.revenue * TUTOR_CUT);
    return `
      <div class="ad-card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:#0D1B2A">${t.label}</div>
            <div style="font-size:.78rem;color:#718096">${t.subj}</div>
            <div style="font-size:.72rem;color:#A7A7A7;margin-top:2px">${t.email || 'No email on file'}${t.noLogin ? ' · no login yet' : ''}</div>
            <button onclick="adOpenEditCalLinks('${t.key}')" style="margin-top:6px;padding:5px 10px;background:#fff;color:#0D1B2A;border:1.5px solid #E8E8E8;border-radius:8px;font-size:.71rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">🔗 Scheduling links</button>
            ${t.userId ? `<button onclick="adDeactivateAccount('${t.userId}','${t.label.replace(/'/g,"\\'")}')" style="margin-top:6px;margin-left:6px;padding:5px 10px;background:#fff;color:#c0392b;border:1.5px solid #f5d0cd;border-radius:8px;font-size:.71rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">Deactivate</button>` : ''}
            <!-- SCRUM-76: payouts are automatic — admin picks each tutor's own cadence here. -->
            <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
              <span style="font-size:.7rem;color:#A7A7A7">💷 Payout:</span>
              <div id="ad-payout-cycle-${t.key.replace(/[^a-zA-Z]/g,'')}" style="display:flex;gap:4px">
                <button onclick="adSetPayoutCycle('${t.key}','weekly',this)" data-cycle="weekly" style="padding:4px 9px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.7rem;font-weight:700;cursor:pointer;background:#fff;color:#0D1B2A;font-family:'Inter',sans-serif">Weekly</button>
                <button onclick="adSetPayoutCycle('${t.key}','monthly',this)" data-cycle="monthly" style="padding:4px 9px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.7rem;font-weight:700;cursor:pointer;background:#fff;color:#0D1B2A;font-family:'Inter',sans-serif">Monthly</button>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="text-align:right">
              <div style="font-size:.65rem;color:#A7A7A7;text-transform:uppercase;font-weight:700">Lessons</div>
              <div style="font-weight:700;color:#0D1B2A">${d.lessons}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:.65rem;color:#A7A7A7;text-transform:uppercase;font-weight:700">Total earned (78%)</div>
              <div style="font-weight:700;color:#0D1B2A">${adFmt(totalEarned)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:.65rem;color:#A7A7A7;text-transform:uppercase;font-weight:700">Unpaid balance</div>
              <div style="font-weight:700;color:${unpaid>0?'#C8A15A':'#2D7A4F'}">${adFmt(unpaid)}</div>
            </div>
          </div>
        </div>
        ${unpaid > 0 ? `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#FAF8F4;border-radius:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:160px;font-size:.82rem;color:#718096">
            Unpaid balance: <strong style="color:#0D1B2A">${adFmt(unpaid)}</strong> — pays out automatically on their next cycle, or pay early below.
          </div>
          <button onclick="adVerifyLessons('${t.key}',this)"
            style="padding:9px 16px;background:#fff;color:#0D1B2A;border:1.5px solid #E8E8E8;border-radius:9px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">
            View lessons
          </button>
          <button onclick="adApprovePayout('${t.key}',${unpaid})"
            style="padding:9px 18px;background:#0D1B2A;color:#fff;border:none;border-radius:9px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">
            Approve & mark paid →
          </button>
        </div>
        <div id="ad-verify-${t.key.replace(/[^a-zA-Z]/g,'')}" style="display:none;margin-top:10px"></div>` : `
        <div style="padding:12px 14px;background:#2D7A4F10;border-radius:10px;font-size:.82rem;color:#2D7A4F;font-weight:600">
          ✓ All earnings paid up to date
        </div>`}
      </div>`;
  }).join('');

  // Preserve the header, replace content
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <h2 style="font-family:'DM Serif Display',serif;font-size:1.45rem;color:#0D1B2A">Tutors & Payouts</h2>
      <div style="display:flex;gap:8px">
        <button onclick="adShowInviteTutor()" style="padding:9px 14px;background:#fff;color:#0D1B2A;border:1.5px solid #E8E8E8;border-radius:10px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">✉ Invite tutor</button>
        <button onclick="adShowCreateTutor()" style="padding:9px 14px;background:#0D1B2A;color:#fff;border:none;border-radius:10px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">+ Create tutor</button>
      </div>
    </div>
    ${payoutCards}`;

  adLoadPayoutCycles(tutorDefs.map(t => t.key));
}

// ── STUDENTS PANEL ───────────────────────────────────────────────────────
// ── LEADS PANEL ──────────────────────────────────────────────────────────
let adLeadsData = [];
let adLeadsCurrentFilter = 'all';

async function adRenderLeads() {
  const tbody = document.getElementById('ad-leads-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#A7A7A7;padding:20px">Loading...</td></tr>';
  try {
    // Fetch journey form leads AND pending student signups in parallel
    const leadsAuthHeaders = await adAuthHeaders();
    const [leadsRes, pendingRes] = await Promise.all([
      fetchWithTimeout(`${AD_BACKEND}/api/leads`, { headers: leadsAuthHeaders }),
      fetchWithTimeout(`${AD_BACKEND}/api/analytics?resource=pending-profiles`, { headers: leadsAuthHeaders }),
    ]);
    adLeadsData = await leadsRes.json();

    // Merge pending signups as synthetic leads
    const pendingData = await pendingRes.json();
    if (Array.isArray(pendingData)) {
      const pendingLeads = pendingData.map(p => ({
        id: p.id,
        name: p.full_name || p.email,
        email: p.email,
        subject: p.subject || '—',
        level: p.level || '—',
        availability: [],
        status: 'pending_signup',
        created_at: p.created_at,
        _supabase_id: p.id,
      }));
      adLeadsData = [...pendingLeads, ...adLeadsData];
    }

    // SCRUM-84: real tutor names for the assign dropdown below.
    try { _adLeadTutorNames = adTutorAccounts(await adLoadAccounts()).map(t => t.tutorName); }
    catch(e) { _adLeadTutorNames = []; }

    adLeadsRenderTable();
    adLeadsUpdateTabs();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#c0392b;padding:20px">Failed to load: ${e.message}</td></tr>`;
  }
}
let _adLeadTutorNames = [];

function adLeadsFilter(status, el) {
  adLeadsCurrentFilter = status;
  document.querySelectorAll('#ad-leads-tabs .ad-filter-tab').forEach(t => t.classList.remove('ad-filter-active'));
  el.classList.add('ad-filter-active');
  adLeadsRenderTable();
}

function adLeadsUpdateTabs() {
  const counts = { all: adLeadsData.length, new: 0, assigned: 0, confirmed: 0, pending_signup: 0 };
  adLeadsData.forEach(l => { if (l.status in counts) counts[l.status]++; });
  const tabs = document.querySelectorAll('#ad-leads-tabs .ad-filter-tab');
  const labels = ['all','new','assigned','confirmed'];
  const display = ['All','New','Assigned','Confirmed'];
  tabs.forEach((t, i) => {
    const key = labels[i];
    const extra = key === 'all' && counts.pending_signup ? ` (${counts.pending_signup} pending)` : '';
    t.textContent = `${display[i]}${counts[key] ? ' ('+counts[key]+')' : ''}${extra}`;
    t.onclick = () => adLeadsFilter(key, t);
  });
  // Update nav badge
  const badge = document.querySelector('.ad-sidebar .ad-badge');
  if (badge) badge.textContent = counts.new || '';
}

function adLeadsRenderTable() {
  const tbody = document.getElementById('ad-leads-tbody');
  if (!tbody) return;
  const filtered = adLeadsCurrentFilter === 'all'
    ? adLeadsData
    : adLeadsData.filter(l => l.status === adLeadsCurrentFilter);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#A7A7A7;padding:20px">No ${adLeadsCurrentFilter === 'all' ? '' : adLeadsCurrentFilter+' '}leads</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(lead => {
    const initials = lead.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const avail = Array.isArray(lead.availability) ? lead.availability.join(', ') : '—';
    const age = adRelativeTime(lead.created_at);

    let statusPill, actionBtn;
    if (lead.status === 'pending_signup') {
      statusPill = `<span class="ad-status-pill" style="background:#EBF4FF;color:#2B6CB0;font-weight:600;font-size:.72rem;padding:3px 9px;border-radius:20px">Pending signup</span>`;
      // SCRUM-84: no longer guesses a tutor from a hardcoded trio — approve
      // first, then assign from the Students table, where the dropdown is
      // driven by the real tutor roster.
      const suggested = '';
      // SCRUM-81: a pending signup could be either a family or a tutor who
      // signed up through the same magic-link/Google form — nothing about
      // the account itself says which, so admin needs to pick, not have it
      // forced to 'student' as this used to.
      actionBtn = `<div style="display:flex;gap:6px">
        <button class="ad-btn-xs ad-btn-assign" onclick="adApproveStudent('${lead._supabase_id}','${suggested}',this)">Approve as student</button>
        <button class="ad-btn-xs ad-btn-view" onclick="adOpenApproveTutor('${lead._supabase_id}','${lead.name.replace(/'/g,"\\'")}')">Approve as tutor</button>
      </div>`;
    } else if (lead.status === 'new') {
      statusPill = `<span class="ad-status-pill ad-status-new">New</span>`;
      // SCRUM-84: pick from the real tutor roster, not a hardcoded trio, so a
      // newly created tutor can actually be assigned a lead. Rendered as a
      // dropdown rather than a one-shot "Assign <first tutor>" button, which
      // gave admin no say in who got the lead.
      const opts = _adLeadTutorNames.map(t => `<option value="${t}">${t}</option>`).join('');
      actionBtn = _adLeadTutorNames.length
        ? `<select onchange="if(this.value)adAssignLead('${lead.id}',this.value,this)" style="padding:4px 6px;border:1.5px solid #E8E8E8;border-radius:7px;font-size:.74rem;font-family:'Inter',sans-serif;cursor:pointer"><option value="">Assign to…</option>${opts}</select>`
        : `<span style="font-size:.72rem;color:#A7A7A7">No tutors yet</span>`;
    } else if (lead.status === 'assigned') {
      statusPill = `<span class="ad-status-pill ad-status-assigned">Assigned — ${lead.assigned_tutor?.split(' ')[0]||''}</span>`;
      actionBtn = `<button class="ad-btn-xs ad-btn-view" onclick="adViewLead('${lead.id}')">View</button>`;
    } else if (lead.status === 'confirmed') {
      statusPill = `<span class="ad-status-pill ad-status-confirmed">Trial confirmed</span>`;
      actionBtn = `<button class="ad-btn-xs ad-btn-view" onclick="adViewLead('${lead.id}')">View</button>`;
    } else {
      statusPill = `<span class="ad-status-pill" style="background:#f5f5f5;color:#999">${lead.status}</span>`;
      actionBtn = '';
    }

    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px"><div class="ad-mini-av">${initials}</div>${lead.name}</div></td>
      <td>${lead.subject}</td>
      <td>${lead.level}</td>
      <td style="font-size:.78rem;color:#718096">${avail||'—'}</td>
      <td style="color:#718096">${age}</td>
      <td>${statusPill}</td>
      <td>${actionBtn}</td>
    </tr>`;
  }).join('');
}

async function adAssignLead(id, tutorName, btn) {
  btn.disabled = true;
  btn.textContent = 'Assigning…';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/leads`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ id, status: 'assigned', assignedTutor: tutorName }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    // Update local cache and re-render
    const lead = adLeadsData.find(l => l.id === id);
    if (lead) { lead.status = 'assigned'; lead.assigned_tutor = tutorName; }
    adLeadsRenderTable();
    adLeadsUpdateTabs();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Retry';
    alert('Assignment failed: ' + e.message);
  }
}

function adViewLead(id) {
  const lead = adLeadsData.find(l => l.id === id);
  if (!lead) return;
  const avail = Array.isArray(lead.availability) ? lead.availability.join(', ') : '—';
  const existing = document.getElementById('ad-lead-view-modal');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'ad-lead-view-modal';
  div.className = 'ad-modal-overlay open';
  div.innerHTML = `<div class="ad-modal">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <h3>${lead.name}</h3>
      <button type="button" onclick="this.closest('.ad-modal-overlay').remove()" aria-label="Close" style="cursor:pointer;font-size:1.3rem;color:#A7A7A7;background:none;border:none;padding:0;font-family:inherit">✕</button>
    </div>
    <div style="font-size:.82rem;color:#4A5568;line-height:1.8;margin-bottom:12px">
      <div><span style="color:#A7A7A7">Email:</span> ${lead.email}</div>
      <div><span style="color:#A7A7A7">Subject:</span> ${lead.subject} (${lead.level})</div>
      <div><span style="color:#A7A7A7">Goal:</span> ${lead.goal||'—'}</div>
      <div><span style="color:#A7A7A7">Availability:</span> ${avail}</div>
      <div><span style="color:#A7A7A7">Status:</span> ${lead.status}${lead.assigned_tutor?' · '+lead.assigned_tutor:''}</div>
    </div>
    <span class="lg-label">Admin notes</span>
    <textarea class="tp-note-input" id="lead-note-${lead.id}" placeholder="Notes about this lead…" style="min-height:70px">${lead.admin_notes||''}</textarea>
    <button class="tp-btn-xs tp-btn-primary" onclick="adSaveLeadNote('${lead.id}')" style="margin-top:6px">Save note</button>
  </div>`;
  document.body.appendChild(div);
}

function adRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins/60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs/24);
  return `${days}d ago`;
}

async function adRenderStudents() {
  const tbody = document.getElementById('ad-students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#A7A7A7;padding:20px">Loading...</td></tr>';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/analytics?resource=students`, { headers: await adAuthHeaders() });
    const students = await r.json();
    if (!students.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#A7A7A7;padding:20px">No students yet</td></tr>';
      return;
    }
    tbody.innerHTML = students.map(s => {
      const initials = s.student_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const bookings = s.bookings || [];
      // The assigned tutor is the answer to "who looks after this family",
      // which is what this column is asking. It used to be derived purely
      // from who they'd booked with, so a student assigned to a tutor but
      // not yet booked in showed "—" and looked unassigned.
      const booked = [...new Set(bookings.map(b=>b.tutor_name))];
      const tutors = s.assigned_tutor
        ? s.assigned_tutor + (booked.length && !booked.includes(s.assigned_tutor)
            ? ` <span style="color:#A7A7A7;font-size:.75rem">(also taught by ${booked.join(', ')})</span>` : '')
        : (booked.join(', ') || '—');
      const joined = new Date(s.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:9px"><div class="ad-mini-av">${initials}</div>${s.student_name}</div></td>
        <td>${s.parent_name}</td>
        <td style="font-size:.78rem;color:#718096">${s.parent_email}</td>
        <td>${tutors}</td>
        <td>${bookings.length}</td>
        <td style="color:#718096">${joined}</td>
        <td></td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px">Failed to load: ${e.message}</td></tr>`;
  }
}

// ── TUTOR HOME KPIs ──────────────────────────────────────────────────────
// Computed from this tutor's own bookings (tpLiveBookings, populated by
// tpLoadSchedule() via the authenticated resource=my-tutor-bookings) —
// previously read from adData.tutors, the admin-only dashboard's aggregate,
// which a real (non-admin) tutor can never successfully fetch. That 401
// was the actual cause of "dashboard error loading" on the tutor side,
// and meant these KPIs (and the toast complaining the whole dashboard
// failed to load) never worked for any real tutor account.
function tpUpdateHomeKPIs(tutorName) {
  const active = (tpLiveBookings || []).filter(b => b.status !== 'cancelled');
  const studentIds = new Set(active.map(b => b.studentId || b.studentName).filter(Boolean));
  const paid = active.filter(b => b.status === 'confirmed' || b.status === 'completed');
  const unpaidPence = Math.round(paid.reduce((s, b) => s + (b.feePence || 0), 0) * 0.78);
  const el = id => document.getElementById(id);
  if (el('tp-kpi-students')) el('tp-kpi-students').textContent = studentIds.size || '—';
  if (el('tp-kpi-lessons')) el('tp-kpi-lessons').textContent = active.length || '—';
  if (el('tp-kpi-lessons-trend')) el('tp-kpi-lessons-trend').textContent = active.length ? `${active.length} total` : '';
  if (el('tp-kpi-unpaid')) el('tp-kpi-unpaid').textContent = (unpaidPence/100).toFixed(2);
}
async function adVerifyLessons(tutorName, btn) {
  const safeId = tutorName.replace(/[^a-zA-Z]/g,'');
  const container = document.getElementById('ad-verify-' + safeId);
  if (!container) return;
  // Toggle
  if (container.style.display === 'block') {
    container.style.display = 'none';
    btn.textContent = 'View lessons';
    return;
  }
  btn.textContent = 'Loading…';
  container.style.display = 'block';
  container.innerHTML = '<div style="padding:12px;color:#A7A7A7;font-size:.8rem">Loading lesson records…</div>';
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/payouts?resource=verify&tutor=${encodeURIComponent(tutorName)}`, {
      headers: await adAuthHeaders(),
    });
    const lessons = await r.json();
    btn.textContent = 'Hide lessons';
    if (!lessons.length) {
      container.innerHTML = '<div style="padding:12px;color:#A7A7A7;font-size:.8rem">No billable lessons found.</div>';
      return;
    }
    const CUT = 0.78;
    const totalFee = lessons.reduce((s,l) => s + l.fee_pence, 0);
    const tutorEarns = Math.round(totalFee * CUT);
    const rows = lessons.map(l => {
      const d = new Date(l.start_time).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'});
      const statusPill = l.status === 'completed'
        ? '<span style="font-size:.68rem;color:#2D7A4F;font-weight:700">✓ Completed</span>'
        : '<span style="font-size:.68rem;color:#C8A15A;font-weight:700">Confirmed</span>';
      return `<tr style="border-bottom:1px solid #F0EDE8">
        <td style="padding:7px 8px;font-size:.78rem">${l.students?.student_name||'—'}</td>
        <td style="padding:7px 8px;font-size:.78rem">${l.subject||'—'}</td>
        <td style="padding:7px 8px;font-size:.78rem;color:#718096">${d}</td>
        <td style="padding:7px 8px;font-size:.78rem;text-align:right">${adFmt(Math.round(l.fee_pence*CUT))}</td>
        <td style="padding:7px 8px;text-align:right">${statusPill}</td>
      </tr>`;
    }).join('');
    container.innerHTML = `
      <div style="border:1px solid #F0EDE8;border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#FAF8F4">
            <th style="padding:8px;text-align:left;font-size:.65rem;color:#A7A7A7;text-transform:uppercase">Student</th>
            <th style="padding:8px;text-align:left;font-size:.65rem;color:#A7A7A7;text-transform:uppercase">Subject</th>
            <th style="padding:8px;text-align:left;font-size:.65rem;color:#A7A7A7;text-transform:uppercase">When</th>
            <th style="padding:8px;text-align:right;font-size:.65rem;color:#A7A7A7;text-transform:uppercase">Tutor cut</th>
            <th style="padding:8px;text-align:right;font-size:.65rem;color:#A7A7A7;text-transform:uppercase">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="background:#FAF8F4;font-weight:700">
            <td colspan="3" style="padding:8px;font-size:.8rem">${lessons.length} lessons</td>
            <td style="padding:8px;text-align:right;font-size:.8rem;color:#0D1B2A">${adFmt(tutorEarns)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>`;
  } catch(e) {
    container.innerHTML = `<div style="padding:12px;color:#c0392b;font-size:.8rem">Failed: ${e.message}</div>`;
    btn.textContent = 'View lessons';
  }
}

async function adApprovePayout(tutorName, amountPence) {
  if (!confirm(`Approve and pay ${adFmt(amountPence)} to ${tutorName}?\n\nIf their Stripe account is connected and your platform has sufficient test balance, this sends a real Stripe transfer.`)) return;
  try {
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({ action: 'approve-and-transfer', tutorName, amountPence }),
    });
    const data = await r.json();
    if (!r.ok) {
      // Common Stripe balance error
      if (data.error && data.error.includes('balance')) {
        alert(`Transfer failed: Insufficient Stripe balance.\n\nIn test mode, go to Stripe Dashboard → Balances → Add test funds. Then try again.`);
      } else {
        alert('Approval failed: ' + data.error);
      }
      return;
    }
    if (data.transferStatus === 'paid') {
      alert(`✓ £${(amountPence/100).toFixed(2)} transferred to ${tutorName} via Stripe.\nTransfer ID: ${data.transferId}`);
    } else {
      alert(`✓ Marked as paid.\n\nNote: ${tutorName} hasn't completed Stripe onboarding yet, so no automatic transfer was sent — pay them manually this time.`);
    }
    adData = null;
    await adLoadAnalytics();
    adRenderTutorPayouts();
  } catch(e) {
    alert('Approval failed: ' + e.message);
  }
}

// Hook into panel switching to load data when admin portal opens
// Use DOMContentLoaded to ensure _openAdminPortal is defined before wrapping
window.addEventListener('DOMContentLoaded', function() {
  const _origOpenAdmin = window._openAdminPortal;
  window._openAdminPortal = function() {
    _origOpenAdmin();
    adLoadAnalytics();
  };

  const _origShowAdPanel = window.showAdPanel;
  window.showAdPanel = function(id, navEl) {
    _origShowAdPanel(id, navEl);
    if (id === 'ad-bookings' || id === 'ad-home') {
      adData = null;
      adLoadAnalytics();
    } else if (id === 'ad-leads') {
      adRenderLeads();
    } else if (adData) {
      if (id === 'ad-payments') adRenderPayments();
      if (id === 'ad-tutors')   adRenderTutorPayouts();
    }
    if (id === 'ad-students') adRenderStudents();
  };
});


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.AD_BACKEND = AD_BACKEND;
  Object.defineProperty(window, "adData", { get: () => adData, set: (v) => { adData = v; }, configurable: true });
  window.adAuthHeaders = adAuthHeaders;
  window.adOpenHealthCheck = adOpenHealthCheck;
  window.adLoadAnalytics = adLoadAnalytics;
  window.adFmt = adFmt;
  window.adDateFmt = adDateFmt;
  window.TYPE_LABEL = TYPE_LABEL;
  window.adRenderDashboard = adRenderDashboard;
  window.adRenderAttention = adRenderAttention;
  window.adFilterBookings = adFilterBookings;
  window.adClearBookingFilters = adClearBookingFilters;
  window.adRenderBookings = adRenderBookings;
  window.adDeliveryBadge = adDeliveryBadge;
  window.adCancelBooking = adCancelBooking;
  window.adRescheduleBooking = adRescheduleBooking;
  window.adConfirmReschedule = adConfirmReschedule;
  window.adRenderPayments = adRenderPayments;
  window.adRefundBooking = adRefundBooking;
  Object.defineProperty(window, "_adAccounts", { get: () => _adAccounts, set: (v) => { _adAccounts = v; }, configurable: true });
  window.adLoadAccounts = adLoadAccounts;
  window.adTutorAccounts = adTutorAccounts;
  window.adRenderTutorPayouts = adRenderTutorPayouts;
  Object.defineProperty(window, "adLeadsData", { get: () => adLeadsData, set: (v) => { adLeadsData = v; }, configurable: true });
  Object.defineProperty(window, "adLeadsCurrentFilter", { get: () => adLeadsCurrentFilter, set: (v) => { adLeadsCurrentFilter = v; }, configurable: true });
  window.adRenderLeads = adRenderLeads;
  Object.defineProperty(window, "_adLeadTutorNames", { get: () => _adLeadTutorNames, set: (v) => { _adLeadTutorNames = v; }, configurable: true });
  window.adLeadsFilter = adLeadsFilter;
  window.adLeadsUpdateTabs = adLeadsUpdateTabs;
  window.adLeadsRenderTable = adLeadsRenderTable;
  window.adAssignLead = adAssignLead;
  window.adViewLead = adViewLead;
  window.adRelativeTime = adRelativeTime;
  window.adRenderStudents = adRenderStudents;
  window.tpUpdateHomeKPIs = tpUpdateHomeKPIs;
  window.adVerifyLessons = adVerifyLessons;
  window.adApprovePayout = adApprovePayout;
}
