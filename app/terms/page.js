import ContentPage from '@/components/site/ContentPage';
import { CONTACT_EMAIL } from '@/lib/site';

// SCRUM-XX11. Copy seeded from the legacy #terms-overlay
// (legacy/index.html), with the contact address unified onto the brand
// domain (SCRUM-XX13). Still a draft pending solicitor review — the
// disclaimer below says so on the page, deliberately.

export const metadata = {
  title: 'Terms & Conditions — Seeds',
  description: 'The terms that govern the use of Seeds Tuition’s platform and tuition services.',
};

export default function TermsPage() {
  return (
    <ContentPage title="Terms & Conditions" subtitle="Last updated: July 2026">
      <div className="content-disclaimer">
        ⚠️ <strong>Draft for review.</strong> These terms are a working draft and should be
        reviewed by a qualified solicitor before Seeds accepts paying customers. They are
        provided as a starting point, not as legal advice.
      </div>

      <h2>1. About us</h2>
      <p>
        Seeds Tuition (&quot;Seeds&quot;, &quot;we&quot;, &quot;us&quot;) provides online tuition
        services for KS3, GCSE, and A-Level students. These terms govern your use of our platform
        and services. By booking a lesson or creating an account, you agree to these terms.
      </p>

      <h2>2. Who can use Seeds</h2>
      <p>
        Our services are intended for students aged 11–18 and their parents or guardians. If you
        are under 18, a parent or guardian must agree to these terms and be responsible for
        payment. By booking, you confirm you are the parent/guardian or have their permission.
      </p>

      <h2>3. Booking and payment</h2>
      <ul>
        <li>Lesson prices are: GCSE 1:1 £40, A-Level 1:1 £45, group sessions £20. Your first consultation and trial lesson are free.</li>
        <li>Payment is taken per lesson via our payment processor (Stripe) before each confirmed lesson.</li>
        <li>By saving a card, you authorise us to charge it automatically for confirmed lessons.</li>
        <li>We do not store your full card details; these are held securely by Stripe.</li>
      </ul>

      <h2>4. Cancellations and refunds</h2>
      <ul>
        <li>You may cancel or reschedule free of charge up to 24 hours before a lesson.</li>
        <li>Cancellations within 24 hours of the lesson are non-refundable.</li>
        <li>No-shows are charged in full.</li>
        <li>If we or a tutor cancel a lesson, you will receive a full refund or the option to reschedule.</li>
      </ul>

      <h2>5. Lesson delivery</h2>
      <p>
        Lessons are delivered live online via Google Meet. It is your responsibility to have a
        working internet connection and device. If a technical issue on our side prevents a
        lesson, we will reschedule or refund it. 1:1 lessons are not recorded; group sessions may
        be recorded and shared with group participants only.
      </p>

      <h2>6. Conduct and safeguarding</h2>
      <p>
        We are committed to safeguarding young people. Tutors undergo appropriate checks. We
        expect respectful conduct from students, parents, and tutors. We reserve the right to
        suspend or terminate accounts for abusive, inappropriate, or unsafe behaviour.
        Safeguarding concerns are taken seriously and may be reported to relevant authorities
        where necessary.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        All teaching materials, resources, and content provided remain the property of Seeds or
        the respective tutor. You may use them for your own learning but may not redistribute,
        resell, or publish them.
      </p>

      <h2>8. Liability</h2>
      <p>
        We provide tuition services with reasonable care and skill but do not guarantee specific
        grades or outcomes. To the extent permitted by law, our liability is limited to the amount
        you have paid for the affected lesson(s). Nothing in these terms limits liability for
        death or personal injury caused by negligence, or for fraud.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Material changes will be communicated to
        registered users. Continued use of Seeds after changes constitutes acceptance.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of England and Wales, and disputes are subject to the
        exclusive jurisdiction of the courts of England and Wales.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
