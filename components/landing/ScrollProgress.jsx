'use client';

import { useEffect, useRef } from 'react';

// The thin gold progress bar pinned just under the fixed nav — lets visitors
// see how much of the page remains, as on the legacy site.
export default function ScrollProgress() {
  const fillRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const fill = fillRef.current;
      if (!fill) return;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      fill.style.width = pct + '%';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="scroll-progress-track">
      <div className="scroll-progress-fill" ref={fillRef} />
    </div>
  );
}
