// The tutor roster. Still hardcoded, as it was in legacy — SCRUM-XX24 covers
// driving this from the backend roster. Lifting it out of app/page.js is the
// first half of that job: the landing page, the tutor profile routes and (in
// time) the booking modal now read one list instead of three copies.

export const TUTORS = [
  {
    slug: 'azeem-omar-mufti',
    name: 'Azeem Omar-Mufti',
    short: 'Azeem',
    img: '/images/azeem.jpg',
    pill: 'Mathematics',
    subject: 'Mathematics',
    role: 'GCSE & A-Level Mathematics Specialist',
    stats: [
      { num: '700', suffix: '+', label: 'Hours taught' },
      { num: '4.9', suffix: '★', label: 'Rating' },
      { num: '98', suffix: '%', label: 'Grade lift' },
    ],
    bio: (
      <>
        Azeem specialises in building genuine mathematical confidence — not just exam technique.
        His students describe lessons as the first time they truly <em>understood</em> a concept,
        not just learned to replicate it. Specialist in GCSE Higher and A-Level Pure &amp; Mechanics.
      </>
    ),
    detail: (
      <>
        In practice that means starting from where a student actually is, not where the syllabus
        assumes they are. A shaky grasp of algebraic manipulation quietly caps a grade at every
        later topic, so Azeem rebuilds those foundations first — then the harder material stops
        feeling like a wall. Lessons work through past paper questions live, with the student
        narrating their reasoning, because a method you can explain is a method you can reproduce
        under exam pressure.
      </>
    ),
    tags: ['GCSE Maths', 'A-Level Maths', 'Further Maths', 'Edexcel · AQA · OCR'],
  },
  {
    slug: 'abdul-moez',
    name: 'Abdul-Moez',
    short: 'Abdul-Moez',
    img: '/images/abdulmoez.jpg',
    pill: 'Chemistry & Biology',
    subject: 'Chemistry & Biology',
    role: "GCSE & A-Level Chemistry and Biology · King's College London",
    stats: [
      { num: 'KCL', suffix: '', label: 'Dentistry grad' },
      { num: '4.9', suffix: '★', label: 'Rating' },
      { num: '2', suffix: '', label: 'Sciences taught' },
    ],
    bio: (
      <>
        A Dentistry graduate from King&apos;s College London, Abdul-Moez brings a clinician&apos;s
        precision to Chemistry and Biology. Having sat the very exams he now teaches towards a
        competitive dentistry application, he knows exactly what separates a good answer from a
        top-mark one.
      </>
    ),
    detail: (
      <>
        Sciences reward precision of language as much as understanding, and that is where most
        marks quietly leak away. Abdul-Moez drills the difference between an answer that is right
        and an answer that scores: naming the correct mechanism, using the command word the
        examiner asked for, and showing the working a mark scheme is looking for. Students heading
        towards medicine, dentistry or veterinary applications also get candid guidance on what a
        competitive application actually requires.
      </>
    ),
    tags: ['GCSE Chemistry', 'A-Level Biology', 'AQA · OCR', 'University applications'],
  },
  {
    slug: 'suleiman',
    name: 'Suleiman',
    short: 'Suleiman',
    img: '/images/suleiman.jpg',
    pill: 'History & Arabic',
    subject: 'History & Arabic',
    role: "GCSE & A-Level History and Arabic · King's College London",
    stats: [
      { num: '7', suffix: '', label: 'Years in Jordan' },
      { num: '4.9', suffix: '★', label: 'Rating' },
      { num: 'KCL', suffix: '', label: 'Graduate' },
    ],
    bio: (
      <>
        Suleiman studied Arabic and Islamic Studies in Jordan for seven years before completing
        his degree at King&apos;s College London. He brings rare fluency in classical Arabic
        alongside a historian&apos;s eye for argument, source analysis, and structure — exactly
        what GCSE and A-Level History examiners reward.
      </>
    ),
    detail: (
      <>
        History marks are won in structure: a thesis stated in the first sentence, evidence
        marshalled to serve it, and a judgement that actually judges. Suleiman teaches students to
        plan an essay in two minutes and write it in thirty. In Arabic he teaches the language as
        a living system of roots and patterns rather than a vocabulary list, which is why his
        students can read unfamiliar text rather than only the passages they have revised.
      </>
    ),
    tags: ['GCSE History', 'A-Level Arabic', 'Classical Arabic', 'AQA · Edexcel'],
  },
];

export function getTutor(slug) {
  return TUTORS.find((t) => t.slug === slug) || null;
}
