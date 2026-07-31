'use client';

import { useState } from 'react';

// The "Our Difference" audience tabs from the legacy methodology section
// (switchAud in legacy/src/modules/00). Only the tab switch needs client JS;
// the right-hand faith-examples column stays server-rendered in page.js.
const TABS = [
  { key: 'curious', label: 'The curious' },
  { key: 'faith', label: 'Faith layer' },
  { key: 'parents', label: 'For parents' },
];

export default function FaithTabs() {
  const [active, setActive] = useState('curious');

  return (
    <>
      <div className="aud-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`aud-tab${active === t.key ? ' active' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`aud-panel${active === 'curious' ? ' active' : ''}`} role="tabpanel">
        <p className="aud-body">
          The greatest scientists in history were not just skilled — they were <em>in awe</em>.
          Why does π appear in equations that have nothing to do with circles? Why does DNA
          self-replicate with extraordinary fidelity? Why do civilisations follow recognisable
          patterns of rise and fall?
        </p>
        <p className="aud-body">
          Seeds tutors teach these questions alongside the answers. Students who ask <em>why</em>{' '}
          consistently outperform students who only ask <em>what</em>. That curiosity is our
          methodology — and the grades reflect it. This is for every family, regardless of faith.
        </p>
      </div>

      <div className={`aud-panel${active === 'faith' ? ' active' : ''}`} role="tabpanel">
        <p className="aud-body">
          Seeds weaves faith-based reflection into every subject — not as a separate lesson, but
          as a natural lens. Students discover that the precision of mathematics, the patterns of
          biology, and the arc of history all point to something greater.
        </p>
        <div className="arabic-quote-block">
          <div className="arabic-text">سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ</div>
          <div className="arabic-translation">
            &ldquo;We will show them Our signs on the horizons and within themselves.&rdquo; — Quran 41:53
          </div>
        </div>
      </div>

      <div className={`aud-panel${active === 'parents' ? ' active' : ''}`} role="tabpanel">
        <p className="aud-body">
          You want two things: <strong>results</strong> and a child who is{' '}
          <strong>genuinely engaged</strong>. Seeds delivers both. Our structured syllabus tracking,
          past-paper approach, and weekly homework ensure exam readiness. The deeper methodology
          means students want to learn.
        </p>
        <p className="aud-body">
          You receive monthly written progress reports, recordings of weekly group past-paper
          sessions, and tutor notes after every 1:1 lesson. You can always contact your child&apos;s
          tutor directly.
        </p>
      </div>
    </>
  );
}
