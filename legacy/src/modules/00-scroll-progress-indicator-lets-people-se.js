// Extracted from index.html by the SCRUM-32 migration (block 0).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// Scroll progress indicator — lets people see how much content remains
window.addEventListener('scroll', function() {
  const fill = document.getElementById('scroll-progress-fill');
  if (!fill) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  fill.style.width = pct + '%';
});

// Journey form logic
const jfState = { subject:'', level:'', goal:'', days:[], name:'', email:'' };

function goStep(n) {
  document.querySelectorAll('.jf-step').forEach(s => s.classList.remove('active'));
  document.getElementById('jf-' + n).classList.add('active');
  const bars = { 1:20, 2:40, 3:60, 4:80, 5:95, success:100 };
  document.getElementById('jf-bar').style.width = (bars[n] || 20) + '%';
  if(n === 4) checkDays();
}

function selectChip(el, group) {
  const chips = el.parentNode.querySelectorAll('.jf-chip');
  chips.forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  jfState[group] = el.textContent;
  const nextMap = { subject: 'next-1', level: 'next-2', goal: 'next-3' };
  if(nextMap[group]) document.getElementById(nextMap[group]).disabled = false;
}

function toggleChip(el) {
  el.classList.toggle('selected');
  jfState.days = Array.from(document.querySelectorAll('#chips-days .selected')).map(c => c.textContent);
  document.getElementById('next-4').disabled = jfState.days.length === 0;
}

function checkDays() {
  document.getElementById('next-4').disabled = jfState.days.length === 0;
}

function checkContact() {
  const n = document.getElementById('inp-name').value.trim();
  const e = document.getElementById('inp-email').value.trim();
  document.getElementById('next-5').disabled = !(n && e && e.includes('@'));
}

async function submitJourney() {
  const name  = document.getElementById('inp-name').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const btn   = document.getElementById('next-5');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await fetchWithTimeout(`${BACKEND}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email,
        subject:      jfState.subject,
        level:        jfState.level,
        goal:         jfState.goal,
        availability: jfState.days,
      }),
    });
  } catch(e) {
    console.error('Lead submission failed:', e.message);
    // Still show success to user — don't block on network error
  }
  document.querySelectorAll('.jf-step').forEach(s => s.classList.remove('active'));
  document.getElementById('jf-success').classList.add('active');
  document.getElementById('jf-bar').style.width = '100%';
}

function switchAud(e, panel) {
  document.querySelectorAll('.aud-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.aud-panel').forEach(p => p.classList.remove('active'));
  e.currentTarget.classList.add('active');
  document.getElementById('p-' + panel).classList.add('active');
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.jfState = jfState;
  window.goStep = goStep;
  window.selectChip = selectChip;
  window.toggleChip = toggleChip;
  window.checkDays = checkDays;
  window.checkContact = checkContact;
  window.submitJourney = submitJourney;
  window.switchAud = switchAud;
}
