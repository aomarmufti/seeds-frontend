'use client';

// The shared bits of the two profile screens (SCRUM-XX39 / XX40). Small on
// purpose: the value is that "this field saves" and "this field doesn't, and
// here's why" look different on the page, so nobody has to type into
// something that was never going to persist.

/** An editable field. `hint` explains what the value is for. */
export function Field({ label, hint, children }) {
  return (
    <label className="field pf-field">
      <span>{label}</span>
      {children}
      {hint ? <em className="pf-hint">{hint}</em> : null}
    </label>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/**
 * A value the person can see but not change here, with the reason stated.
 *
 * Every use of this carries a `why` — an uneditable field with no
 * explanation reads as a bug, and the reasons differ: some are somebody
 * else's decision to make, some are waiting on a backend endpoint.
 */
export function ReadOnly({ label, value, why }) {
  return (
    <div className="pf-ro">
      <span className="pf-ro-lbl">{label}</span>
      <span className="pf-ro-val">{value || '—'}</span>
      {why ? <em className="pf-hint">{why}</em> : null}
    </div>
  );
}

/** Save button + the outcome of the last attempt, in one place. */
export function SaveBar({ busy, dirty, saved, error, onSave }) {
  return (
    <div className="pf-savebar">
      <button type="button" className="btn" disabled={busy || !dirty} onClick={onSave}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
      {saved && !dirty ? <span className="pf-saved">✓ Saved</span> : null}
      {error ? <span className="pf-err">{error}</span> : null}
    </div>
  );
}
