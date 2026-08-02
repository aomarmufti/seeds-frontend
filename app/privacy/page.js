import ContentPage from '@/components/site/ContentPage';
import { PRIVACY_EMAIL } from '@/lib/site';

// SCRUM-XX11. Copy seeded from the legacy #privacy-overlay
// (legacy/index.html), with the contact address unified onto the brand
// domain (SCRUM-XX13).

export const metadata = {
  title: 'Privacy Policy — Seeds',
  description: 'How Seeds Tuition collects, uses and protects your data, including children’s data, under UK GDPR.',
};

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" subtitle="Last updated: July 2026">
      <div className="content-disclaimer">
        ⚠️ <strong>Draft for review.</strong> This policy should be reviewed by a data protection
        professional before launch, especially given that we process children&apos;s data. Register
        with the ICO before going live.
      </div>

      <h2>1. Who we are</h2>
      <p>
        Seeds Tuition is the data controller for the personal data we collect. We are committed to
        protecting your privacy and complying with UK GDPR and the Data Protection Act 2018.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Student details:</strong> name, year group, subjects, target grades, progress records.</li>
        <li><strong>Parent/guardian details:</strong> name, email, phone number.</li>
        <li><strong>Booking &amp; lesson data:</strong> lesson times, tutor notes, homework, attendance.</li>
        <li><strong>Payment data:</strong> handled by Stripe; we store only a payment reference, never full card numbers.</li>
        <li><strong>Technical data:</strong> basic login and usage information.</li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To deliver and schedule tuition.</li>
        <li>To process payments.</li>
        <li>To communicate with you about lessons, progress, and your account.</li>
        <li>To improve our services and for safeguarding purposes.</li>
      </ul>
      <p>Our lawful bases are performance of a contract, legitimate interests, and consent where required.</p>

      <h2>4. Children&apos;s data</h2>
      <p>
        We process the personal data of students who may be under 18. We collect only what is
        necessary to provide tuition. A parent or guardian sets up and controls the account for
        students under 16. We do not use children&apos;s data for marketing.
      </p>

      <h2>5. Who we share it with</h2>
      <p>
        We share data only with the tutor delivering your lessons and with trusted service
        providers who help us operate: Stripe (payments), Supabase (secure database hosting),
        Resend (email delivery), and Google Meet (video lessons). We never sell your data. Some
        providers may process data outside the UK under appropriate safeguards.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your data for as long as your account is active and for a reasonable period
        afterwards to meet legal and accounting obligations. You can request deletion at any time
        (see below).
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under UK GDPR you have the right to access, correct, delete, or restrict the use of your
        data, and to data portability. To exercise any of these rights, email{' '}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. You also have the right to
        complain to the Information Commissioner&apos;s Office (ICO).
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard security measures including encrypted connections (HTTPS),
        role-based access controls, and reputable infrastructure providers. No system is
        completely secure, but we take reasonable steps to protect your data.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use only essential cookies required to keep you logged in and operate the platform. We
        do not use advertising or third-party tracking cookies.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about your data? Email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
