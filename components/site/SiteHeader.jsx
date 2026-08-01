import Link from 'next/link';
import SeedLogo from '@/components/site/SeedLogo';

// The landing page's nav, extracted so the content pages (/terms, /privacy,
// /faqs, /tutors/…) carry the same chrome instead of feeling like orphaned
// documents. Styling comes from app/landing.css, so anything rendering this
// must sit inside an element with the `.landing` class.
//
// `home` switches the section links between in-page anchors and links back to
// the landing page, so the same nav works on both.
export default function SiteHeader({ home = false }) {
  const to = (hash) => (home ? hash : `/${hash}`);

  return (
    <nav>
      <Link href="/" className="nav-logo">
        <SeedLogo size={40} />
        <span className="nav-brand">Seeds</span>
      </Link>
      <ul className="nav-links">
        <li><a href={to('#subjects')}>Subjects</a></li>
        <li><a href={to('#tutors')}>Tutors</a></li>
        <li><a href={to('#methodology')}>Methodology</a></li>
        <li><a href={to('#howitworks')}>How it works</a></li>
        <li><a href={to('#testimonials')}>Testimonials</a></li>
      </ul>
      <div className="nav-cta">
        <Link href="/login" className="btn-ghost">Student Portal</Link>
        <a href={to('#journey')} className="btn-primary">Get started ↗</a>
      </div>
    </nav>
  );
}
