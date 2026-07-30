'use client';

import PortalShell from '@/components/PortalShell';

// Every page below /tutor lives inside this shell. The nav is data, not
// markup, so a page can never drift out of step with the sidebar — and each
// item is a real Link to a real path, which is what makes them shareable and
// the back button work.
const NAV = [
  {
    items: [
      { key: 'schedule', label: 'Schedule', href: '/tutor/schedule' },
      { key: 'students', label: 'My students', href: '/tutor/students' },
      { key: 'earnings', label: 'Earnings', href: '/tutor/earnings' },
    ],
  },
];

export default function TutorLayout({ children }) {
  return <PortalShell portal="tutor" nav={NAV}>{children}</PortalShell>;
}
