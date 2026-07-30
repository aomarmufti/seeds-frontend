'use client';

import { useState, useEffect } from 'react';

// The shared component set (SCRUM-33). One definition each, used by all three
// portals. Where the old portals had drifted apart on a value, the agreed one
// is baked into globals.css — these components just consume it, so a portal
// can't quietly fork a card again by copying markup.

export function PageHead({ title, children }) {
  return (
    <div className="page-hd">
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function Card({ title, action, children, style }) {
  return (
    <section className="card" style={style}>
      {(title || action) && (
        <div className="card-hdr">
          {title ? <h2 className="card-title">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function CardLink({ children, ...rest }) {
  return <button type="button" className="card-link" {...rest}>{children}</button>;
}

/** The tile is shared; the column count stays per-portal on purpose —
 *  admin shows five figures, tutor four. */
export function KpiRow({ cols, children }) {
  return (
    <div className="kpi-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, trend, icon: Icon }) {
  return (
    <div className="kpi">
      <div className="kpi-lbl">{Icon ? <Icon size={13} /> : null}{label}</div>
      <div className="kpi-num">{value}</div>
      {trend ? <div className={`kpi-trend ${trend.dir || ''}`}>{trend.text}</div> : null}
    </div>
  );
}

export function Badge({ tone = 'mute', children }) {
  return <span className={`badge ${tone === 'mute' ? '' : tone}`}>{children}</span>;
}

export function Button({ variant = '', size = 'xs', children, ...rest }) {
  const cls = size === 'xs' ? `btn-xs ${variant}` : `btn ${variant}`;
  return <button type="button" className={cls.trim()} {...rest}>{children}</button>;
}

export function Table({ head, children }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Avatar({ name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return <span className="mini-av">{initials}</span>;
}

export function Lesson({ subject, meta, tone = '', action }) {
  return (
    <div className="lesson">
      <div className={`l-stripe ${tone}`} />
      <div className="l-info">
        <div className="l-subj">{subject}</div>
        <div className="l-meta">{meta}</div>
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon: Icon, children }) {
  return (
    <div className="empty">
      {Icon ? <div className="empty-icon"><Icon size={26} /></div> : null}
      {children}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ErrorNote({ children }) {
  return <div className="error-note">{children}</div>;
}

/** One hook for every "fetch on mount, show loading / error / data" panel —
 *  the pattern that was hand-rolled dozens of times in the old build, each
 *  copy with its own slightly different error handling. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    fn()
      .then((data) => { if (alive) setState({ loading: false, error: null, data }); })
      .catch((err) => { if (alive) setState({ loading: false, error: err.message, data: null }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
