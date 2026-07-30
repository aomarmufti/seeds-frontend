'use client';

import { PageHead, Card, Empty } from '@/components/ui';
import { Doc } from '@/components/icons';

/**
 * A page whose route, nav entry and shell are in place but whose content is
 * still being ported from legacy/index.html.
 *
 * This is deliberately explicit rather than a blank page: the route exists and
 * is linkable today, and anyone landing here can see exactly which part of the
 * old build still owns this screen.
 */
export default function ComingSoon({ title, intro, legacy }) {
  return (
    <>
      <PageHead title={title}>{intro}</PageHead>
      <Card>
        <Empty icon={Doc}>
          <p style={{ margin: '0 0 6px', fontWeight: 650, color: 'var(--ink-2)' }}>
            Not ported yet
          </p>
          <p style={{ margin: 0, fontSize: '.82rem' }}>
            This screen still lives in the previous build{legacy ? <> — <code>{legacy}</code></> : null}.
            The route and navigation are in place so it can be filled in without touching anything else.
          </p>
        </Empty>
      </Card>
    </>
  );
}
