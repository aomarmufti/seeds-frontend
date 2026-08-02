import Link from 'next/link';
import ContentPage from '@/components/site/ContentPage';
import FaqList from '@/components/site/FaqList';
import { CONTACT_EMAIL } from '@/lib/site';

// SCRUM-XX11. Copy seeded from the legacy #faq-overlay (legacy/index.html).
// The legacy FAQ already said Google Meet — it was only the marketing
// sections that said Zoom (SCRUM-XX12). Offer wording aligned with lib/site
// (SCRUM-XX10) and the contact address unified (SCRUM-XX13).

export const metadata = {
  title: 'FAQs — Seeds',
  description:
    'How Seeds lessons work, what they cost, who the tutors are, and how to get started with a free consultation.',
};

const FAQS = [
  {
    id: 'how-lessons-work',
    q: 'How do lessons work?',
    a: "All 1:1 lessons are live and online via Google Meet. You'll get a join link in your student portal and by email. Lessons are 60 minutes. Group past-paper sessions are also live but are recorded so you can review them afterwards. Individual 1:1 lessons are never recorded — your time with your tutor stays private.",
  },
  {
    id: 'pricing',
    q: 'How much do lessons cost?',
    a: 'GCSE 1:1 lessons are £40, A-Level 1:1 lessons are £45, and group past-paper sessions are £20. Your first consultation and trial lesson are free. There are no subscriptions or hidden fees — you pay per lesson, and your card is charged automatically before each confirmed lesson.',
  },
  {
    id: 'free-trial',
    q: 'Is the first lesson really free?',
    a: 'Yes. You start with a free 15-minute consultation call, and then a free 60-minute trial lesson with no obligation. It lets you and your child meet the tutor, see how we teach, and decide whether Seeds is right for you before you pay anything.',
  },
  {
    id: 'group-sessions',
    q: 'What are the group sessions?',
    a: 'Alongside weekly 1:1 lessons we run small-group past-paper sessions at £20 per session. A tutor works through real exam questions with the group, decoding command words and mark schemes. They are live, and they are recorded — so if your child misses one, or wants to revisit a topic before an exam, the recording is available in the student portal.',
  },
  {
    id: 'tutors',
    q: 'Who are the tutors?',
    a: 'Our tutors are subject specialists with strong academic backgrounds and real teaching experience. The team includes Azeem Omar-Mufti (Mathematics), Suleiman (History & Arabic, KCL graduate), and Abdul-Moez (Chemistry & Biology, KCL Dentistry graduate). All tutors undergo appropriate safeguarding checks.',
  },
  {
    id: 'faith-approach',
    q: 'What is the faith-integrated approach?',
    a: "Seeds weaves Islamic theological concepts — particularly the Names of Allah — into academic subjects as a lens for curiosity and wonder. It's an approach that connects learning to meaning. Families of all faiths and none are warmly welcome; the academic teaching is rigorous and complete regardless of background, and the faith dimension is a gentle enrichment rather than a requirement.",
  },
  {
    id: 'cancellations',
    q: 'How do I cancel or reschedule a lesson?',
    a: 'You can reschedule or cancel free of charge up to 24 hours before your lesson. Cancellations within 24 hours are non-refundable, and no-shows are charged in full. To make changes, contact your tutor or reach out to us directly.',
  },
  {
    id: 'payments',
    q: 'How do payments work?',
    a: 'We use Stripe, a leading secure payment processor. Your card details are saved securely on file (we never see or store your full card number) and charged automatically before each confirmed lesson. You can view your full payment history and download receipts from the Payments tab in your portal.',
  },
  {
    id: 'subjects',
    q: 'What subjects do you cover?',
    a: "We currently offer Mathematics, Chemistry, Biology, History, and Arabic at KS3, GCSE, and A-Level. We're expanding our subject range — if you need a subject not listed, get in touch and we'll do our best to help.",
  },
  {
    id: 'progress',
    q: "How do I track my child's progress?",
    a: 'Your student portal has a Progress tab showing coverage percentages, current and target grades, and trend charts over time. After each lesson your tutor logs notes, sets homework, and updates progress — you’ll receive email updates automatically.',
  },
  {
    id: 'data',
    q: "Is my child's data safe?",
    a: 'Yes. We take data protection seriously and comply with UK GDPR. We only collect what we need to deliver tuition, we never sell your data, and you can request a copy or deletion of your data at any time. See our Privacy Policy for full details.',
  },
  {
    id: 'get-started',
    q: 'How do I get started?',
    a: 'Click "Book a Free Consultation" on our homepage and tell us a little about your child and their goals — it\'s a free 15-minute call, no card required. Afterwards your tutor books you a free 60-minute trial lesson so you can see them teach before committing to anything paid.',
  },
];

export default function FaqsPage() {
  return (
    <ContentPage
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about learning with Seeds"
    >
      <FaqList items={FAQS} />
      <div className="content-footnote">
        Still have a question? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        See also our <Link href="/terms">Terms &amp; Conditions</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </div>
    </ContentPage>
  );
}
