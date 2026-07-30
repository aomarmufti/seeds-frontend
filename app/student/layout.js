'use client';

import PortalShell from '@/components/PortalShell';

const NAV = [
  { items: [
    { key: 'lessons', label: 'My lessons', href: '/student/lessons' },
    { key: 'progress', label: 'Progress', href: '/student/progress' },
    { key: 'payments', label: 'Payments', href: '/student/payments' },
  ] },
];

export default function StudentLayout({ children }) {
  return <PortalShell portal="student" nav={NAV}>{children}</PortalShell>;
}
