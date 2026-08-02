'use client';

import { useEffect, useRef } from 'react';

// The accordion itself is plain <details>/<summary> — no JavaScript needed to
// open and close, keyboard-accessible, and findable by the browser's in-page
// search. The only reason this is a client component is deep links: the
// footer's "Group Sessions" link points at /faqs#group-sessions, and landing
// on a collapsed answer would be a dead end.
export default function FaqList({ items }) {
  const ref = useRef(null);

  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.slice(1);
      if (!id || !ref.current) return;
      const el = ref.current.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;
      el.open = true;
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  return (
    <div ref={ref}>
      {items.map((item) => (
        <details className="faq-item" id={item.id} key={item.id}>
          <summary>
            {item.q}
            <span className="faq-chevron" aria-hidden="true">▾</span>
          </summary>
          <p className="faq-a">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
