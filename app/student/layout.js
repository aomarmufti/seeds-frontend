'use client';

import PortalShell from '@/components/PortalShell';
// Calendar cells, book-lesson modal, billing-cycle/add-card controls — the
// student-only styles restored from the legacy build (see this file's
// header comment for why they aren't in the shared globals.css).
import './student-extras.css';

const NAV = [
  { items: [
    { key: 'lessons', label: 'My lessons', href: '/student/lessons' },
    { key: 'calendar', label: 'Calendar', href: '/student/calendar' },
    { key: 'progress', label: 'Progress', href: '/student/progress' },
    { key: 'payments', label: 'Payments', href: '/student/payments' },
  ] },
];

export default function StudentLayout({ children }) {
  return <PortalShell portal="student" nav={NAV}>{children}</PortalShell>;
}
