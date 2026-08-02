// Single source of truth for the facts that appear in marketing copy in more
// than one place. Before this existed the site shipped two contact domains
// (SCRUM-XX13), four names for the same free offer (SCRUM-XX10) and prices
// that only the booking modal knew about (SCRUM-XX8) — each of them a
// content bug that only shows up when you read two pages side by side.

// The brand domain is seedsinstitute.co.uk (it is what the site is served
// from), so that is the one contact domain. seedstuition.co.uk should be
// forwarded to it — see SCRUM-XX13.
export const CONTACT_EMAIL = 'hello@seedsinstitute.co.uk';
export const PRIVACY_EMAIL = 'privacy@seedsinstitute.co.uk';

// Lessons run on Google Meet. Marketing used to say Zoom (SCRUM-XX12); the
// join links in the portal have always been Meet.
export const MEETING_PLATFORM = 'Google Meet';

// The free offer, named once. Use these verbatim — the whole point of the
// constant is that no section invents its own wording.
export const OFFER = {
  // Step one: the call.
  consultation: 'free consultation',
  consultationFull: 'free 15-minute consultation call',
  consultationDuration: '15 minutes',
  // Step two: the lesson.
  trial: 'free trial lesson',
  trialFull: 'free 60-minute trial lesson',
  trialDuration: '60 minutes',
  // The two together, as a sequence.
  sequence: 'Free consultation (15-min call) → free trial lesson (60 min)',
};

export const PRICES = [
  {
    id: 'gcse',
    level: 'GCSE',
    price: '£40',
    unit: 'per 1:1 lesson',
    blurb: 'KS3 and GCSE one-to-one, a full hour with a subject specialist.',
    features: [
      '60-minute live 1:1 lesson on Google Meet',
      'Weekly homework set, marked and returned',
      'Monthly written parent report',
      'Progress tracker in your portal',
    ],
  },
  {
    id: 'alevel',
    level: 'A-Level',
    price: '£45',
    unit: 'per 1:1 lesson',
    featured: true,
    blurb: 'A-Level one-to-one, a full hour with a specialist in your exam board.',
    features: [
      'Everything in GCSE',
      'Exam-board-specific past paper work',
      'University and application guidance',
      'Priority scheduling in exam season',
    ],
  },
  {
    id: 'group',
    level: 'Group sessions',
    price: '£20',
    unit: 'per session',
    blurb: 'Weekly small-group past-paper sessions — recorded, so nothing is missed.',
    features: [
      'Live small-group past-paper practice',
      'Recorded and available to rewatch',
      'Exam technique and mark-scheme decoding',
      'Great alongside weekly 1:1 lessons',
    ],
  },
];

export const PRICING_NOTES = [
  'Your first consultation and trial lesson are free — no card required.',
  'Pay per lesson. No subscription, no joining fee, no minimum term.',
  'Cancel or reschedule free of charge up to 24 hours before a lesson.',
  'Sibling discount available — get in touch and we will set it up.',
];
