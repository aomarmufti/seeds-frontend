// Extracted from index.html by the SCRUM-32 migration (block 17).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ══ LESSON PREP MODE ══════════════════════════════════════════════════════
async function tpOpenPrepMode(btn) {
  const bid = btn.getAttribute('data-bid') || '';
  const sid = btn.getAttribute('data-sid') || '';
  const sname = btn.getAttribute('data-sname') || '';
  const subj = btn.getAttribute('data-subj') || '';
  const meetLink = btn.getAttribute('data-meet') || '';
  const startTime = btn.getAttribute('data-start') || '';

  document.getElementById('tp-prep-title').textContent = 'Lesson prep: ' + sname;
  document.getElementById('tp-prep-desc').textContent = subj + ' · ' + (startTime ? new Date(startTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '');
  document.getElementById('tp-prep-body').innerHTML = '<div style="text-align:center;color:#A7A7A7;padding:20px">Loading student context…</div>';

  const joinBtn = document.getElementById('tp-prep-join-btn');
  if (meetLink) {
    joinBtn.onclick = () => window.open(meetLink, '_blank');
    joinBtn.style.display = '';
  } else {
    joinBtn.style.display = 'none';
  }
  document.getElementById('tp-prep-modal').classList.add('open');

  if (!sid) {
    document.getElementById('tp-prep-body').innerHTML = '<div style="color:#A7A7A7;font-size:.82rem;padding:10px">No student ID — open from My Students to see full context.</div>';
    return;
  }

  try {
    const _tpPrepAuthH = await seedsAuthHeaders();
    const [notesR, hwR, progR] = await Promise.all([
      fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=notes&studentId=' + sid, { headers: _tpPrepAuthH }),
      fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=homework&studentId=' + sid, { headers: _tpPrepAuthH }),
      fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=progress&studentId=' + sid, { headers: _tpPrepAuthH }),
    ]);
    const notes = await notesR.json();
    const hw = await hwR.json();
    const prog = await progR.json();

    const lastNote = notes[0];
    const pendingHw = hw.filter(h => !h.completed);
    const subjectProg = prog.find(p => p.subject === subj) || prog[0];

    document.getElementById('tp-prep-body').innerHTML = `
      <div style="display:grid;gap:12px">
        <div style="background:#FAF8F4;border-radius:10px;padding:14px">
          <div style="font-size:.68rem;font-weight:700;color:#A7A7A7;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Last lesson notes</div>
          ${lastNote
            ? `<div style="font-size:.83rem;color:#0D1B2A;line-height:1.5">${lastNote.note}</div><div style="font-size:.71rem;color:#A7A7A7;margin-top:4px">${new Date(lastNote.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>`
            : '<div style="font-size:.82rem;color:#A7A7A7">No previous notes.</div>'}
        </div>
        <div style="background:#FAF8F4;border-radius:10px;padding:14px">
          <div style="font-size:.68rem;font-weight:700;color:#A7A7A7;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Outstanding homework (${pendingHw.length})</div>
          ${pendingHw.length
            ? pendingHw.map(h => `<div style="font-size:.82rem;color:#0D1B2A;margin-bottom:4px">• ${h.title} ${h.due_date?'<span style="color:#C8A15A">due '+new Date(h.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'</span>':''}</div>`).join('')
            : '<div style="font-size:.82rem;color:#A7A7A7">All homework complete ✓</div>'}
        </div>
        ${subjectProg ? `<div style="background:#FAF8F4;border-radius:10px;padding:14px">
          <div style="font-size:.68rem;font-weight:700;color:#A7A7A7;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Current progress</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-weight:600;color:#0D1B2A">${subjectProg.subject}</span>
            <span style="color:#C8A15A;font-weight:700">${subjectProg.percent}% · ${subjectProg.current_grade||'—'} → ${subjectProg.target_grade||'—'}</span>
          </div>
          <div style="height:6px;background:#E8E8E8;border-radius:3px"><div style="height:100%;width:${subjectProg.percent}%;background:#C8A15A;border-radius:3px"></div></div>
        </div>` : ''}
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid #E8E8E8">
        <button onclick="tpOpenLessonLog('${bid}','${sid}','${sname}','${subj}')" style="width:100%;padding:10px;background:#2D7A4F;color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:.85rem;font-family:Inter,sans-serif">
          📝 Log this lesson after it ends
        </button>
      </div>`;
  } catch(e) {
    document.getElementById('tp-prep-body').innerHTML = '<div style="color:#c0392b;font-size:.82rem">Failed to load: ' + e.message + '</div>';
  }
}

// ══ STUDENT ONBOARDING WELCOME ═══════════════════════════════════════════
async function spCheckOnboarding() {
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;
    const { data: profile } = await sbClient.from('profiles').select('onboarding_complete').eq('id', session.user.id).single();
    if (!profile?.onboarding_complete && !localStorage.getItem('sp_welcomed')) {
      document.getElementById('sp-welcome-modal').classList.add('open');
    }
  } catch(e) {}
}

async function spDismissWelcome() {
  document.getElementById('sp-welcome-modal').classList.remove('open');
  localStorage.setItem('sp_welcomed', '1');
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    // Upsert (with role) rather than update — a student with no profiles
    // row yet would otherwise have this silently affect zero rows, leaving
    // onboarding_complete permanently false and the setup modal re-prompting
    // on every future login despite being dismissed here.
    if (session) {
      await sbClient.from('profiles').upsert(
        { id: session.user.id, role: 'student', onboarding_complete: true },
        { onConflict: 'id' }
      );
    }
  } catch(e) {}
}

// ══ IN-PORTAL TODAY REMINDER BANNER ══════════════════════════════════════
function spRenderTodayReminder() {
  const now = new Date();
  const todayLessons = spBookings.filter(b => {
    const d = new Date(b.startTime);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear() && d > now;
  }).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));

  const existing = document.getElementById('sp-today-reminder');
  if (existing) existing.remove();
  if (!todayLessons.length) return;

  const next = todayLessons[0];
  const timeStr = new Date(next.startTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const minsAway = Math.round((new Date(next.startTime) - now) / 60000);
  const timeLabel = minsAway < 60 ? `in ${minsAway} minutes` : `at ${timeStr}`;

  const div = document.createElement('div');
  div.id = 'sp-today-reminder';
  div.className = 'sp-today-reminder';
  div.innerHTML = `
    <div class="sp-today-reminder-icon">🔔</div>
    <div class="sp-today-reminder-text">
      <div class="sp-today-reminder-title">Lesson today ${timeLabel}</div>
      <div class="sp-today-reminder-meta">${next.subject} with ${next.tutorName}</div>
    </div>
    ${next.meetLink ? `<button class="sp-today-reminder-btn" onclick="spJoinLesson('${next.meetLink}')">Join →</button>` : ''}`;

  const homePanel = document.getElementById('p-home');
  if (homePanel) homePanel.insertBefore(div, homePanel.firstChild);
}

// ══ PROGRESS TREND / HISTORY ══════════════════════════════════════════════
async function spRenderProgressWithTrend(progress) {
  const el = document.getElementById('sp-progress-cards');
  if (!el) return;
  if (!progress.length) {
    el.innerHTML = '<div style="color:#A7A7A7;font-size:.85rem;padding:20px;text-align:center">No progress recorded yet. Your tutor will update this after lessons.</div>';
    return;
  }

  const { data: { session } } = await sbClient.auth.getSession().catch(() => ({ data: {} }));
  const email = session?.user?.email || '';

  const COLOURS_P = ['#C8A15A','#2D7A4F','#4A90D9','#7B5EA7'];
  let html = '';
  for (let i = 0; i < progress.length; i++) {
    const p = progress[i];
    const colour = COLOURS_P[i % COLOURS_P.length];

    // Fetch history for trend
    let trendHTML = '';
    try {
      const hr = await fetchWithTimeout(SP_BACKEND + '/api/lifecycle?resource=progress-history&subject=' + encodeURIComponent(p.subject), { headers: await seedsAuthHeaders() });
      const history = await hr.json();
      if (history.length >= 2) {
        const maxP = Math.max(...history.map(h => h.percent || 0), 1);
        const first = history[0].percent;
        const latest = history[history.length-1].percent;
        const change = latest - first;
        const changeStr = change > 0 ? `<span style="color:#2D7A4F">↑ +${change}%</span>` : change < 0 ? `<span style="color:#c0392b">↓ ${change}%</span>` : '→ no change';
        const bars = history.slice(-8).map(h => `<div class="prog-trend-bar" style="background:${colour};height:${Math.round((h.percent/maxP)*100)}%" title="${h.percent}%"></div>`).join('');
        trendHTML = `<div class="prog-trend">${bars}</div><div style="font-size:.71rem;color:#718096;margin-top:2px">${changeStr} since first lesson</div>`;
      }
    } catch(e) {}

    html += `<div class="psc">
      <div class="psc-hdr">
        <div><div class="psc-name">${p.subject}</div><div class="psc-target">Target: ${p.target_grade||'—'}</div></div>
        <div class="psc-grade" style="color:${colour}">${p.current_grade||'—'}</div>
      </div>
      <div class="psc-bar"><div class="psc-fill" style="width:${p.percent}%;background:${colour}"></div></div>
      <div class="psc-pct">${p.percent}% covered${p.note?' · '+p.note:''}</div>
      ${trendHTML}
    </div>`;
  }
  el.innerHTML = html;
}

// ══ EARNINGS FORECAST ════════════════════════════════════════════════════
function earnRenderForecast() {
  const tutor = earnCurrentTutor || 'Azeem Omar-Mufti';
  const now = new Date();
  const nextWeekStart = new Date(now); nextWeekStart.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7); nextWeekStart.setHours(0,0,0,0);
  const nextWeekEnd = new Date(nextWeekStart); nextWeekEnd.setDate(nextWeekStart.getDate()+7);

  const nextWeek = tpLiveBookings.filter(b => {
    const d = new Date(b.startTime);
    return d >= nextWeekStart && d < nextWeekEnd;
  });
  const forecastGross = nextWeek.reduce((s,b) => s + (b.feePence||0), 0);
  const forecastCut = Math.round(forecastGross * 0.78);

  const el = document.getElementById('earn-forecast');
  if (!el) return;
  if (!nextWeek.length) { el.textContent = 'No lessons next week yet.'; return; }
  el.innerHTML = `Next week: <strong>${nextWeek.length} lesson${nextWeek.length>1?'s':''}</strong> · Your cut: <strong style="color:#2D7A4F">£${(forecastCut/100).toFixed(2)}</strong>`;
}

// ══ ADMIN LEAD NOTES ═════════════════════════════════════════════════════
async function adSaveLeadNote(leadId) {
  const note = document.getElementById('lead-note-' + leadId)?.value?.trim();
  if (!note) return;
  try {
    await fetchWithTimeout(AD_BACKEND + '/api/lifecycle?resource=lead-notes', {
      method: 'POST', headers: {'Content-Type':'application/json', ...(await adAuthHeaders())},
      body: JSON.stringify({ leadId, adminNotes: note }),
    });
    seedsToast('✓ Note saved', false);
  } catch(e) { seedsToast('Failed: ' + e.message); }
}

// ══ CSV EXPORT ═══════════════════════════════════════════════════════════
function adExportCSV() {
  if (!adData?.recentBookings) return;
  const rows = [
    ['Date','Student','Tutor','Subject','Type','Fee','Status','Payment ID'],
    ...adData.recentBookings.map(b => [
      new Date(b.startTime).toLocaleDateString('en-GB'),
      b.studentName, b.tutorName, b.subject,
      b.lessonType, (b.feePence/100).toFixed(2),
      b.status, b.paymentIntentId||'',
    ])
  ];
  const csv = rows.map(r => r.map(v => '"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'seeds-payments-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ══ CHURN VISIBILITY ═════════════════════════════════════════════════════
function adRenderChurnAlert() {
  if (!adData?.recentBookings) return;
  const el = document.getElementById('ad-churn-alert');
  if (!el) return;

  const now = Date.now();
  const fourWeeks = 28 * 86400000;
  // Find students whose last confirmed lesson was > 4 weeks ago
  const lastLesson = {};
  adData.recentBookings.forEach(b => {
    if (b.status === 'cancelled') return;
    const t = new Date(b.startTime).getTime();
    if (!lastLesson[b.studentName] || t > lastLesson[b.studentName]) {
      lastLesson[b.studentName] = t;
    }
  });
  const atRisk = Object.entries(lastLesson)
    .filter(([, t]) => now - t > fourWeeks)
    .sort((a,b) => a[1]-b[1]);

  if (!atRisk.length) {
    el.innerHTML = '<div style="color:#2D7A4F;font-size:.82rem;padding:12px">✓ All students had a lesson in the last 4 weeks</div>';
    return;
  }
  el.innerHTML = `<div style="font-size:.72rem;font-weight:700;color:#c0392b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">⚠ ${atRisk.length} student${atRisk.length>1?'s':''} at risk of churning</div>` +
    atRisk.map(([name, t]) => {
      const weeks = Math.floor((now - t) / (7*86400000));
      return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F0EDE8;font-size:.8rem">
        <span style="font-weight:600;color:#0D1B2A">${name}</span>
        <span style="color:#c0392b">No lesson for ${weeks} weeks</span>
      </div>`;
    }).join('');
}

// ══ WIRE IT ALL TOGETHER ══════════════════════════════════════════════════
// Hook onboarding check into student portal open
const _origSPOpenFinal = window._openStudentPortal;
window._openStudentPortal = function() {
  _origSPOpenFinal();
  setTimeout(spCheckOnboarding, 500);
};

// Add today reminder on home load
const _origSpRenderHomeFinal = window.spRenderHome;
if (typeof spRenderHome === 'function') {
  const _origH = spRenderHome;
  window.spRenderHome = function(name) {
    _origH(name);
    spRenderTodayReminder();
  };
}

// Hook churn and forecast into admin load
const _origAdRenderDashFinal = window.adRenderDashboard;
if (typeof adRenderDashboard === 'function') {
  const _origD = adRenderDashboard;
  window.adRenderDashboard = function() {
    _origD();
    adRenderChurnAlert();
  };
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.tpOpenPrepMode = tpOpenPrepMode;
  window.spCheckOnboarding = spCheckOnboarding;
  window.spDismissWelcome = spDismissWelcome;
  window.spRenderTodayReminder = spRenderTodayReminder;
  window.spRenderProgressWithTrend = spRenderProgressWithTrend;
  window.earnRenderForecast = earnRenderForecast;
  window.adSaveLeadNote = adSaveLeadNote;
  window.adExportCSV = adExportCSV;
  window.adRenderChurnAlert = adRenderChurnAlert;
  window._origSPOpenFinal = _origSPOpenFinal;
  window._origSpRenderHomeFinal = _origSpRenderHomeFinal;
  window._origAdRenderDashFinal = _origAdRenderDashFinal;
}
