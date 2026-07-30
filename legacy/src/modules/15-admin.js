// Extracted from index.html by the SCRUM-32 migration (block 15).
// Logic is unchanged; only the module wrapper and the global bridge below
// are new. The bridge re-publishes this module's top-level declarations so
// the other modules' bare cross-references — and the inline on* handlers in
// the markup — keep resolving exactly as they did in global scope.

// ── ADMIN: CHARGE A STUDENT ───────────────────────────────────────────────
async function adChargeStudent(bookingId, btn) {
  btn.disabled = true; btn.textContent = 'Looking up…';
  try {
    // Fetch booking details to get student email
    const r = await fetchWithTimeout(`${AD_BACKEND}/api/analytics`, { headers: await adAuthHeaders() });
    const data = await r.json();
    const booking = (data.recentBookings||[]).find(b => b.id === bookingId);
    if (!booking) { btn.textContent = 'Not found'; return; }

    const email = booking.studentEmail || booking.parentEmail;
    if (!email) { alert('No email on file for this student — cannot charge.'); btn.disabled=false; btn.textContent='💳 Charge'; return; }

    btn.textContent = 'Charging…';
    const chargeR = await fetchWithTimeout(`${AD_BACKEND}/api/lifecycle?resource=charge-student`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await adAuthHeaders()) },
      body: JSON.stringify({
        bookingId,
        studentEmail: email,
        lessonType: booking.lessonType,
        studentLevel: booking.lessonType === 'alevel' ? 'alevel' : 'gcse',
        studentName: booking.studentName,
        tutorName: booking.tutorName,
        subject: booking.subject,
        startTime: booking.startTime,
        portalUrl: window.location.origin + window.location.pathname,
      }),
    });
    const result = await chargeR.json();
    if (result.status === 'charged') {
      btn.textContent = '✓ Paid';
      btn.style.color = '#2D7A4F';
      seedsToast(`✓ Card charged: ${result.amount/100 >= 1 ? '£'+(result.amount/100).toFixed(2) : 'free'}`, false);
    } else if (result.status === 'payment_link') {
      btn.textContent = '🔗 Link sent';
      seedsToast('No saved card — payment link emailed to student.', false);
    } else if (result.status === 'free') {
      btn.textContent = 'Free';
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch(e) {
    btn.disabled = false; btn.textContent = '💳 Charge';
    seedsToast('Charge failed: ' + e.message);
  }
}


// ── global bridge (generated) ──────────────────────────────────────────
{
  window.adChargeStudent = adChargeStudent;
}
