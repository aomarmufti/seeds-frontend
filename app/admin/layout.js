'use client';

import PortalShell from '@/components/PortalShell';

const NAV = [
  { items: [
    { key: 'leads', label: 'Leads', href: '/admin/leads' },
    { key: 'bookings', label: 'Bookings', href: '/admin/bookings' },
  ] },
  { label: 'People', items: [
    { key: 'students', label: 'Students', href: '/admin/students' },
    { key: 'tutors', label: 'Tutors & payouts', href: '/admin/tutors' },
  ] },
];

export default function AdminLayout({ children }) {
  return <PortalShell portal="admin" nav={NAV}>{children}</PortalShell>;
}
