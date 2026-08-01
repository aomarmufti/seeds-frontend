import Link from 'next/link';
import SeedLogo from '@/components/site/SeedLogo';
import BookButton from '@/components/landing/BookButton';
import { CONTACT_EMAIL } from '@/lib/site';

// The landing page's footer, extracted so every page carries it — and so the
// links that used to be dead <span>s (FAQs, Terms, Privacy, Group Sessions)
// have exactly one definition to keep honest. SCRUM-XX11.
//
// The "Book a Lesson" / subject buttons dispatch the booking event, so any
// page rendering this footer must also mount <BookingModal /> or the buttons
// do nothing.
export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-brand-row">
              <SeedLogo size={30} dark={false} />
              <span className="footer-brand-name">Seeds</span>
            </div>
            <div className="footer-brand-text">
              KS3, GCSE &amp; A-Level tuition — where academic excellence and genuine
              understanding grow together.
            </div>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <ul className="footer-links">
              <li><Link href="/login">Student Portal</Link></li>
              <li>
                <BookButton tutor="Best available match" subject="Any subject">
                  Book a Lesson
                </BookButton>
              </li>
              <li><Link href="/faqs#group-sessions">Group Sessions</Link></li>
              <li><Link href="/login">Progress Tracker</Link></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Subjects</div>
            <ul className="footer-links">
              <li><BookButton tutor="Azeem Omar-Mufti" subject="Mathematics">Mathematics</BookButton></li>
              <li><BookButton tutor="Abdul-Moez" subject="Chemistry & Biology">Sciences</BookButton></li>
              <li><BookButton tutor="Suleiman" subject="History & Arabic">History</BookButton></li>
              <li><BookButton tutor="Suleiman" subject="History & Arabic">Arabic</BookButton></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              <li><Link href="/faqs">FAQs</Link></li>
              <li><Link href="/terms">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">
            © 2026 Seeds Tuition Ltd. All rights reserved. ·{' '}
            <Link href="/terms">Terms</Link> ·{' '}
            <Link href="/privacy">Privacy</Link> ·{' '}
            <Link href="/login">Tutor Login</Link> ·{' '}
            <Link href="/login">Admin</Link>
          </div>
          <div className="footer-gold">Nurturing the next Al-Khwārizmī</div>
        </div>
      </div>
    </footer>
  );
}
