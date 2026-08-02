import Link from 'next/link';
import '@/app/landing.css';
import '@/app/content.css';
import SiteFonts from '@/components/site/SiteFonts';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import BookingModal from '@/components/booking/BookingModal';

// Shared shell for the standalone content routes (/terms, /privacy, /faqs,
// /tutors/…). Wraps the document in the landing page's nav and footer so a
// parent who clicks "Privacy Policy" lands somewhere that still looks like
// Seeds and can get back to booking in one click.
//
// BookingModal is mounted here because SiteFooter's subject buttons dispatch
// the open-booking event.
export default function ContentPage({ title, subtitle, wide = false, children }) {
  return (
    <main className="landing">
      <SiteFonts />
      <SiteHeader />
      <div className="content-page">
        <Link href="/" className="content-back">← Back to Seeds</Link>
        <article className="content-doc" style={wide ? { maxWidth: 900 } : undefined}>
          <h1>{title}</h1>
          {subtitle ? <div className="content-updated">{subtitle}</div> : null}
          {children}
        </article>
      </div>
      <SiteFooter />
      <BookingModal />
    </main>
  );
}
