'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, currentSession, currentProfile } from '@/lib/supabase';
import { Seedling, NAV_ICON } from '@/components/icons';

/**
 * The shell every portal page renders inside: top bar, sidebar, auth gate.
 *
 * On routing and access — the property carried over from SCRUM-34 and worth
 * keeping deliberate: a URL is a request, not a grant. Landing on
 * /admin/leads while signed out sends you to /login, and landing there as a
 * tutor sends you to your own portal. The address bar can ask for a page; it
 * can never be the thing that authorises one. The backend re-checks the
 * caller's role on every request regardless — this guard is for the person
 * using the product, not for the attacker.
 */
export default function PortalShell({ portal, nav, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ status: 'checking', profile: null, email: '' });

  useEffect(() => {
    let alive = true;

    (async () => {
      const session = await currentSession();
      if (!alive) return;

      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const profile = await currentProfile(session);
      if (!alive) return;

      const role = profile?.role || 'student';

      if (role === 'pending') {
        router.replace('/login?pending=1');
        return;
      }
      if (role !== portal) {
        // Signed in, but this isn't their portal. Send them to their own
        // rather than showing an error — they did nothing wrong.
        router.replace(`/${role}`);
        return;
      }

      setState({ status: 'ready', profile, email: session.user.email });
    })();

    return () => { alive = false; };
  }, [portal, pathname, router]);

  if (state.status === 'checking') {
    return (
      <div className="portal">
        <div className="main" style={{ marginLeft: 0, paddingTop: 120 }}>
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div className="skeleton" style={{ width: '55%', height: 20, marginBottom: 14 }} />
            <div className="skeleton" style={{ marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  const name = state.profile?.tutor_name || state.profile?.full_name || state.email;
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="portal">
      <header className="topbar">
        <Link href="/" className="topbar-brand">
          <span className="mark"><Seedling size={19} /></span>
          Seeds Tuition
        </Link>
        <span className="topbar-spacer" />
        <span style={{ fontSize: '.8rem', opacity: .72 }}>{name}</span>
        <span className="topbar-av" title={state.email}>{initials}</span>
      </header>

      <nav className="sidebar" aria-label={`${portal} navigation`}>
        {nav.map((group) => (
          <div key={group.label ?? 'main'}>
            {group.label ? <div className="sidebar-label">{group.label}</div> : null}
            {group.items.map((item) => {
              const Icon = NAV_ICON[item.key] || NAV_ICON.home;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item"
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.count ? <span className="badge-count">{item.count}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button
            className="nav-item"
            onClick={async () => { await supabase().auth.signOut(); router.replace('/login'); }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="main">{children}</main>
    </div>
  );
}
