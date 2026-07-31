import Link from 'next/link';
import Image from 'next/image';
import './landing.css';
import BookButton from '@/components/landing/BookButton';
import ScrollProgress from '@/components/landing/ScrollProgress';
import FaithTabs from '@/components/landing/FaithTabs';
import JourneyWizard from '@/components/landing/JourneyWizard';
import BookingModal from '@/components/booking/BookingModal';

// The public marketing page — a section-for-section rebuild of the legacy
// landing page (legacy/index.html), with the exact legacy copy. Static
// sections are server-rendered; only the interactive islands (scroll bar,
// methodology tabs, journey wizard, booking modal, and the small "Book"
// buttons that open it) ship client JavaScript.
//
// The Google Fonts <link> tags below are hoisted to <head> by React — the
// legacy design system needs DM Serif Display, Inter and Cormorant Garamond.

export const metadata = {
  title: 'Seeds — GCSE & A-Level Tuition',
  description:
    'One-to-one KS3, GCSE and A-Level tuition across the UK — Maths, Sciences, History & Arabic. Book a free consultation.',
};

const MARQUEE_ITEMS = [
  'KS3 Mathematics', 'GCSE Biology', 'A-Level Chemistry', 'GCSE History',
  'A-Level Maths', 'Arabic Language', 'GCSE Physics', 'A-Level Biology', 'KS3 Sciences',
];

const RESULTS = [
  { before: '4', after: '8', subject: 'GCSE Maths · Edexcel', detail: '8 months · 2 lessons/week · Year 11' },
  { before: 'C', after: 'A', subject: 'A-Level Biology · AQA', detail: '1 academic year · 1 lesson/week · Year 13' },
  { before: '5', after: '9', subject: 'GCSE History · AQA', detail: '6 months · 1 lesson/week · Year 10' },
  { before: 'D', after: 'A*', subject: 'A-Level Chemistry · OCR A', detail: 'Full year · 2×/week · Year 12–13' },
];

const SUBJECT_CARDS = [
  {
    icon: '∑', name: 'Mathematics',
    desc: 'From algebra and number theory to calculus and statistics — built on conceptual foundations that make every exam question approachable.',
    levels: ['KS3', 'GCSE', 'A-Level'],
  },
  {
    icon: '🔬', name: 'Sciences',
    desc: 'Biology, Chemistry and Physics as interconnected disciplines — AQA, OCR, Edexcel. We teach the laws of nature, not just the syllabus points.',
    levels: ['KS3', 'GCSE', 'A-Level'],
  },
  {
    icon: '⚖', name: 'History',
    desc: 'Critical analysis of civilisations and turning points — teaching students to construct arguments, read sources, and write with authority.',
    levels: ['KS3', 'GCSE'],
  },
  {
    icon: 'ع', name: 'Arabic', arabic: true,
    desc: 'Classical and modern Arabic — language of scholarship, civilisation, and the Quran. Beginners through to A-Level, grammar through to fluency.',
    levels: ['Beginner', 'GCSE', 'A-Level'],
  },
];

const TUTORS = [
  {
    name: 'Azeem Omar-Mufti', short: 'Azeem', img: '/images/azeem.jpg',
    pill: 'Mathematics', subject: 'Mathematics',
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
    tags: ['GCSE Maths', 'A-Level Maths', 'Further Maths', 'Edexcel · AQA · OCR'],
  },
  {
    name: 'Abdul-Moez', short: 'Abdul-Moez', img: '/images/abdulmoez.jpg',
    pill: 'Chemistry & Biology', subject: 'Chemistry & Biology',
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
    tags: ['GCSE Chemistry', 'A-Level Biology', 'AQA · OCR', 'University applications'],
  },
  {
    name: 'Suleiman', short: 'Suleiman', img: '/images/suleiman.jpg',
    pill: 'History & Arabic', subject: 'History & Arabic',
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
    tags: ['GCSE History', 'A-Level Arabic', 'Classical Arabic', 'AQA · Edexcel'],
  },
];

const PILLARS = [
  {
    num: '01', title: 'First principles, not formula sheets',
    body: 'We teach students to derive answers from core understanding. A student who knows why differentiation works will never be stumped by an unusual exam question. A student who only knows the rule will be.',
  },
  {
    num: '02', title: 'Structured exam technique, built in',
    body: "Understanding alone doesn't earn marks — expression does. Seeds tutors teach students how to structure written answers, decode command words, and systematically work through past papers as the exam approaches.",
  },
  {
    num: '03', title: 'Weekly homework, marked and returned',
    body: 'Homework is not optional. After each session, targeted tasks are assigned and marked with written feedback before the next lesson. Progress accumulates between sessions, not just during them.',
  },
  {
    num: '04', title: 'Monthly parent reports',
    body: "You receive a written report every four weeks covering grade trajectory, syllabus coverage, upcoming focus areas, and a direct note from your child's tutor. You always know exactly where they stand.",
  },
  {
    num: '05', title: 'Curiosity as a learning tool',
    body: 'Students who find their subject genuinely interesting revise more, retain more, and perform better under pressure. Seeds tutors are trained to make even the most abstract topics feel alive and worth knowing.',
  },
];

const STEPS = [
  { num: '01', title: 'Free diagnostic lesson', desc: 'A 30-minute session to assess current level, identify gaps, and set realistic grade targets. No pressure, no cost, no commitment.' },
  { num: '02', title: 'Tutor matched within 24h', desc: "We assign a subject specialist based on exam board, learning style, and your child's goals. Most matches are confirmed same day." },
  { num: '03', title: 'Structured weekly sessions', desc: 'Live 1:1 on Zoom with an interactive whiteboard — undivided attention, every time. Plus weekly recorded group sessions working through past papers.' },
  { num: '04', title: 'Measurable, visible progress', desc: 'Monthly parent reports. Grade trajectory graphs. Syllabus coverage tracker. You always know exactly where your child stands and what comes next.' },
];

const QUESTIONS = [
  {
    q: 'Will my child actually get better grades?',
    a: (
      <>
        <strong>A and A* are the most common outcome for Seeds students who stay with us.</strong>{' '}
        Our team&apos;s students have gone on to LSE, KCL, and successful dentistry applications,
        among other top UK universities. We track progress after every lesson and adjust the plan
        if targets shift — you are never left guessing.
      </>
    ),
  },
  {
    q: 'Is Seeds only for Muslim families?',
    a: (
      <>
        <strong>No — Seeds is for any family that values depth over drills.</strong> The academic
        methodology is universal. The faith-integrated reflection is optional and enriching for
        all students — many non-Muslim parents say it gave their child a sense of wonder they
        hadn&apos;t found elsewhere.
      </>
    ),
  },
  {
    q: 'How is this different from other tutors?',
    a: (
      <>
        Most tutors teach the mark scheme. Seeds teaches the subject. When a student understands{' '}
        <strong>why</strong> integration works, they can answer any question on it — including
        unseen ones. That first-principles approach is what produces consistent A and A* grades,
        not just one-off wins.
      </>
    ),
  },
  {
    q: 'What happens after the free lesson?',
    a: (
      <>
        Your child&apos;s tutor will share a short written diagnostic, with recommended frequency
        and initial focus areas. If you&apos;d like to continue, we set up a regular weekly slot.{' '}
        <strong>No pressure, no automatic sign-up.</strong> You choose the pace.
      </>
    ),
  },
];

const TESTIMONIALS = [
  {
    text: '"Our son went from a Grade 4 to a Grade 8 in GCSE Maths in eight months. The tutors genuinely care about him as a person, not just a result. He actually looks forward to the lessons."',
    initials: 'SA', name: 'Sister Aisha', role: 'Parent · GCSE Mathematics',
  },
  {
    text: '"I was sceptical about the \'faith-integrated\' element — we\'re not religious. But it turns out my daughter just started asking beautiful questions about why the universe works the way it does. Her Chemistry teacher said she\'s the most curious student in the class."',
    initials: 'RC', name: 'Rebecca C.', role: 'Parent · A-Level Chemistry · Surrey',
    badge: 'Non-Muslim family',
  },
  {
    text: '"My son went from a U to a B in A-Level Physics in one year. The tutor didn\'t just fix the gaps — he made my son fall in love with the subject. The platform is beautiful, the group past-paper sessions are brilliant for revision, and I can finally see exactly how he\'s progressing."',
    initials: 'FH', name: 'Sister Fatima H.', role: 'Parent · A-Level Physics',
  },
];

const FAITH_EXAMPLES = [
  {
    subject: 'A-Level Mathematics', sym: 'π',
    concept: <>The infinite precision of irrational numbers like π reflects <strong>Al-Muḥīṭ</strong> — the All-Encompassing, whose knowledge surrounds all things without limit.</>,
  },
  {
    subject: 'GCSE Biology', sym: '🧬',
    concept: <>The fidelity of DNA replication — copying 3 billion base pairs with near-zero error — reflects <strong>Al-Muṣawwir</strong>, the Fashioner of perfect forms.</>,
  },
  {
    subject: 'A-Level Chemistry', sym: '✦',
    concept: <>The electromagnetic spectrum and the nature of light demonstrate <strong>An-Nūr</strong> — the Light, whose nature pervades and reveals all creation.</>,
  },
  {
    subject: 'GCSE History', sym: '⚖',
    concept: <>The rise and fall of civilisations across centuries illustrate <strong>Al-Malik</strong> — the Sovereign — whose will shapes the tides of human history.</>,
  },
];

function SeedLogo({ size = 40, dark = true }) {
  const wing1 = dark ? '#0D1B2A' : 'rgba(255,255,255,0.5)';
  const wing2 = dark ? '#1a2d42' : 'rgba(255,255,255,0.4)';
  return (
    <svg style={{ width: size, height: size }} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M22 30 L7 23 L9 33 Q15.5 36.5 22 33 Z" fill={wing1} />
      <path d="M22 30 L37 23 L35 33 Q28.5 36.5 22 33 Z" fill={wing2} />
      {dark ? <ellipse cx="22" cy="30" rx="1.5" ry="4.5" fill="#0D1B2A" /> : null}
      <path d="M22 30 L12 19 L10 23 L22 30 Z" fill="#C8A15A" opacity="0.85" />
      <path d="M22 30 L32 19 L34 23 L22 30 Z" fill="#C8A15A" opacity="0.85" />
      {dark ? (
        <>
          <path d="M22 30 L15 17 L13 21 L22 30 Z" fill="#C8A15A" opacity="0.6" />
          <path d="M22 30 L29 17 L31 21 L22 30 Z" fill="#C8A15A" opacity="0.6" />
        </>
      ) : null}
      <path d="M22 30 L22 16" stroke="#C8A15A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 22 Q17 15 13 17 Q17 19 22 23 Z" fill="#C8A15A" />
      <path d="M22 18 Q27 11 31 13 Q27 15 22 20 Z" fill="#C8A15A" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="landing">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        precedence="landing-fonts"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap"
      />

      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <SeedLogo size={40} />
          <span className="nav-brand">Seeds</span>
        </a>
        <ul className="nav-links">
          <li><a href="#subjects">Subjects</a></li>
          <li><a href="#tutors">Tutors</a></li>
          <li><a href="#methodology">Methodology</a></li>
          <li><a href="#howitworks">How it works</a></li>
          <li><a href="#testimonials">Testimonials</a></li>
        </ul>
        <div className="nav-cta">
          <Link href="/login" className="btn-ghost">Student Portal</Link>
          <a href="#journey" className="btn-primary">Get started ↗</a>
        </div>
      </nav>
      <ScrollProgress />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <svg className="hero-ornament" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <circle cx="200" cy="200" r="180" stroke="white" strokeWidth=".5" />
          <circle cx="200" cy="200" r="130" stroke="white" strokeWidth=".5" />
          <circle cx="200" cy="200" r="80" stroke="white" strokeWidth=".5" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth=".5" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth=".5" />
          <line x1="74" y1="74" x2="326" y2="326" stroke="white" strokeWidth=".5" />
          <line x1="326" y1="74" x2="74" y2="326" stroke="white" strokeWidth=".5" />
          <polygon points="200,22 378,145 378,255 200,378 22,255 22,145" stroke="white" strokeWidth=".5" fill="none" />
        </svg>

        <div className="hero-content">
          <div>
            <div className="hero-eyebrow">
              <span className="eyebrow-line" />
              <span className="eyebrow-text">KS3 · GCSE · A-Level Tuition</span>
            </div>
            <h1 className="hero-headline">
              Excellence rooted<br />in <em>understanding</em>
            </h1>
            <p className="hero-sub">
              Seeds tutors achieve A and A* results by teaching subjects the way they were meant
              to be understood — with depth, curiosity, and the realisation that every pattern in
              nature has a reason behind it.
            </p>

            <div className="hero-proof">
              <div className="proof-stat">
                <div className="proof-num">94<span>%</span></div>
                <div className="proof-label">improve at least one full grade</div>
              </div>
              <div className="proof-stat">
                <div className="proof-num">67<span>%</span></div>
                <div className="proof-label">achieve A or A* after 6 months</div>
              </div>
              <div className="proof-stat">
                <div className="proof-num">4.9<span>★</span></div>
                <div className="proof-label">Google · 120+ parent reviews</div>
              </div>
            </div>

            <div className="hero-ctas">
              <BookButton tutor="Best available match" subject="Any subject" className="btn-gold">
                Book a Free Consultation →
              </BookButton>
              <a href="#journey" className="btn-outline-white">Start your journey</a>
            </div>
            <div className="hero-cta-note">
              Free lesson · No card required <span>|</span> Or answer 5 quick questions to get matched
            </div>

            <div className="hero-trust">
              <span className="trust-stars">★★★★★</span>
              <span className="trust-text">
                <strong>1000+ lessons of experience</strong> across the UK · Maths, Sciences, History &amp; Arabic
              </span>
            </div>
          </div>

          {/* Live dashboard preview */}
          <div className="hero-visual">
            <div style={{ position: 'relative' }}>
              <div className="hero-card">
                <div className="hero-card-header">
                  <span className="hero-card-title">Today&apos;s Lessons</span>
                  <span className="live-badge"><span className="live-dot" />2 Live Now</span>
                </div>

                <div className="lesson-row">
                  <div className="lesson-stripe" style={{ background: '#C8A15A' }} />
                  <div className="lesson-info">
                    <div className="lesson-subject">A-Level Mathematics</div>
                    <div className="lesson-meta">Now · Integration by Parts</div>
                  </div>
                  <button type="button" className="lesson-badge badge-live">Join Zoom</button>
                </div>
                <div className="lesson-row">
                  <div className="lesson-stripe" style={{ background: '#4A90D9' }} />
                  <div className="lesson-info">
                    <div className="lesson-subject">GCSE Biology</div>
                    <div className="lesson-meta">4:00 PM · Cell Division &amp; Mitosis</div>
                  </div>
                  <button type="button" className="lesson-badge badge-soon">in 3h</button>
                </div>
                <div className="lesson-row">
                  <div className="lesson-stripe" style={{ background: '#6B8E73' }} />
                  <div className="lesson-info">
                    <div className="lesson-subject">GCSE History</div>
                    <div className="lesson-meta">5:30 PM · Cold War Origins</div>
                  </div>
                  <button type="button" className="lesson-badge badge-soon">in 4.5h</button>
                </div>

                <div className="zoom-pill">
                  <div className="zoom-icon">Z</div>
                  <div className="zoom-text">
                    <strong>Live 1:1 on Zoom</strong>
                    Weekly group past-paper sessions recorded — catch up anytime
                  </div>
                </div>

                <div className="reflection-pill">
                  <div className="reflection-label">✦ Today&apos;s Reflection</div>
                  <div className="reflection-text">
                    &quot;The infinite precision of calculus mirrors <em>Al-Ḥasīb</em> — the
                    All-Reckoner, who accounts for all things with perfect exactness.&quot;
                  </div>
                </div>
              </div>

              <div className="float-card fc1">
                <div className="fc-label">Ibrahim&apos;s progress</div>
                <div className="fc-value">72%</div>
                <div className="fc-sub">GCSE Maths covered</div>
                <div className="fc-bar"><div className="fc-fill" style={{ width: '72%' }} /></div>
              </div>
              <div className="float-card fc2">
                <div className="fc-label">Grade this term</div>
                <div className="fc-value" style={{ color: '#C8A15A' }}>A*</div>
                <div className="fc-sub">↑ from Grade 5 in September</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="stats-band">
        <div className="stats-inner">
          <div className="stat-cell">
            <div className="stat-num">1000<em>+</em></div>
            <div className="stat-label">Lessons of experience</div>
            <div className="stat-sub">KS3 through A-Level</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">A<em>/A*</em></div>
            <div className="stat-label">Most common outcome</div>
            <div className="stat-sub">Students completing 6+ months</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">5<em>★</em></div>
            <div className="stat-label">Rated by parents</div>
            <div className="stat-sub">Real families, real results</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">LSE</div>
            <div className="stat-label">Among our destinations</div>
            <div className="stat-sub">KCL · Dentistry · more top universities</div>
          </div>
        </div>
      </div>

      {/* MARQUEE */}
      <div className="marquee-section">
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span className="marquee-item" key={i} aria-hidden={i >= MARQUEE_ITEMS.length}>
              <span className="marquee-dot" />{item}
            </span>
          ))}
        </div>
      </div>

      {/* THE SEEDS PROMISE */}
      <section className="promise-section">
        <div className="promise-inner">
          <div>
            <span className="section-label">The Seeds Promise</span>
            <h2 className="section-heading">The grades parents need.<br />The depth students <em>remember.</em></h2>
            <div className="grade-pills">
              <span className="grade-pill gp-gold">A* target</span>
              <span className="grade-pill gp-gold">A target</span>
              <span className="grade-pill">Exam technique</span>
              <span className="grade-pill">Past paper mastery</span>
              <span className="grade-pill">Genuine understanding</span>
            </div>
            <p className="section-body">
              Every Seeds lesson is structured to build real understanding — not just mark-scheme
              memorisation. Students who genuinely understand <em>why</em> a formula works, or{' '}
              <em>why</em> a historical event unfolded as it did, consistently outperform those who
              only revise surface answers.
            </p>
            <p className="section-body" style={{ marginTop: 13 }}>The grades follow the understanding. Always.</p>
          </div>
          <div className="result-rows">
            <div className="result-rows-label">Recent student outcomes</div>
            {RESULTS.map((r) => (
              <div className="result-row" key={r.subject}>
                <div className="res-grade-block">
                  <div className="res-before">{r.before}</div>
                  <div className="res-arrow">→</div>
                  <div className="res-after">{r.after}</div>
                </div>
                <div className="res-info">
                  <div className="res-subject">{r.subject}</div>
                  <div className="res-detail">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section className="subjects-section" id="subjects">
        <div className="section-inner">
          <div className="subjects-head">
            <div>
              <span className="section-label">What we teach</span>
              <h2 className="section-heading">Subjects offered</h2>
            </div>
            <span className="btn-ghost">View all courses →</span>
          </div>
          <div className="subjects-grid">
            {SUBJECT_CARDS.map((s) => (
              <div className="subject-card" key={s.name}>
                <span className="s-icon" style={s.arabic ? { fontFamily: "'Cormorant Garamond', serif" } : undefined}>
                  {s.icon}
                </span>
                <div className="s-name">{s.name}</div>
                <div className="s-desc">{s.desc}</div>
                <div className="subject-levels">
                  {s.levels.map((l) => <span className="level-pill" key={l}>{l}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEET THE TUTORS */}
      <section className="tutors-section" id="tutors">
        <div className="section-inner">
          <div style={{ marginBottom: 52 }}>
            <span className="section-label">Who teaches at Seeds</span>
            <h2 className="section-heading">Meet your <em>tutors</em></h2>
            <p className="section-body">
              Every Seeds tutor is a subject specialist — rigorously vetted, DBS-checked, and
              trained in our methodology. Not university students earning extra cash. Educators
              who are genuinely exceptional at their subject.
            </p>
          </div>

          <div className="tutors-grid">
            {TUTORS.map((t) => (
              <div className="tutor-card" key={t.name}>
                <div className="tutor-photo">
                  <Image
                    src={t.img}
                    alt={t.name}
                    fill
                    sizes="(max-width: 1000px) 100vw, 360px"
                  />
                  <div className="tutor-photo-shade" />
                  <span className="tutor-pill-subject">{t.pill}</span>
                  <span className="tutor-pill-rating">★ 4.9</span>
                </div>
                <div className="tutor-body">
                  <div className="tutor-name">{t.name}</div>
                  <div className="tutor-role">{t.role}</div>
                  <div className="tutor-stats">
                    {t.stats.map((s) => (
                      <div className="tutor-stat" key={s.label}>
                        <div className="tutor-stat-num">{s.num}{s.suffix ? <span>{s.suffix}</span> : null}</div>
                        <div className="tutor-stat-lbl">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="tutor-bio">{t.bio}</p>
                  <div className="tutor-tags">
                    {t.tags.map((tag) => <span className="tutor-tag" key={tag}>{tag}</span>)}
                  </div>
                  <div className="tutor-actions">
                    <BookButton tutor={t.name} subject={t.subject} className="tutor-book-btn">
                      Book with {t.short}
                    </BookButton>
                    <span className="tutor-profile-btn">Profile</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="vetting-note">
            <div className="vetting-icon">🛡️</div>
            <div>
              <div className="vetting-title">Every Seeds tutor is personally vetted — not a marketplace lottery</div>
              <div className="vetting-body">
                Enhanced DBS checked · Subject interview · Seeds methodology training · Minimum 2
                years teaching experience · Ongoing quality reviews. Unlike MyTutor and Tutorful,
                we are not a marketplace — every tutor has been handpicked and trained by Seeds
                before meeting a student.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW WE TEACH */}
      <section className="teaching-section">
        <div className="section-inner">
          <div className="teaching-grid">
            <div>
              <span className="section-label">How we teach</span>
              <h2 className="section-heading">Not what to think —<br /><em>how</em> to think</h2>
              <p className="section-body">
                Most tutors teach the mark scheme. Seeds tutors teach the subject. The distinction
                is everything — students who understand a concept from first principles can answer
                any exam question, including ones they&apos;ve never seen. That is where consistent
                A and A* grades come from.
              </p>
              <p className="section-body" style={{ marginTop: 14 }}>
                Our tutors are subject specialists, not generalists. Every one undergoes a rigorous
                interview, DBS check, and a Seeds teaching induction before meeting a student. They
                are the kind of teacher whose lessons a student thinks about long after the lesson ends.
              </p>

              <div className="zoom-feature-card">
                <div className="zoom-logo-block">Z</div>
                <div>
                  <div className="zoom-feature-title">Live 1:1 lessons, plus recorded group sessions</div>
                  <div className="zoom-feature-body">
                    Every 1:1 lesson runs live on Zoom with an interactive whiteboard — fully
                    focused, undivided attention, not recorded. Alongside this, weekly group
                    sessions work through past papers together and are recorded, so your child can
                    revisit exam technique anytime.
                  </div>
                  <div className="zoom-feature-tags">
                    <span className="zoom-tag">Live 1:1 whiteboard</span>
                    <span className="zoom-tag">Group past-paper sessions</span>
                    <span className="zoom-tag">Screen share</span>
                    <span className="zoom-tag">Group sessions recorded</span>
                    <span className="zoom-tag">iCal / Google Cal sync</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="teaching-right">
              {PILLARS.map((p) => (
                <div className="t-pillar" key={p.num}>
                  <div className="t-pillar-num">{p.num}</div>
                  <div className="t-pillar-title">{p.title}</div>
                  <div className="t-pillar-body">{p.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY / FAITH */}
      <section className="faith-section" id="methodology">
        <div className="faith-bg" />
        <div className="section-inner">
          <div className="faith-content">
            <div className="faith-left">
              <span className="section-label">Our Difference</span>
              <h2 className="section-heading">Learning that<br /><em>connects</em> everything</h2>
              <FaithTabs />
            </div>

            <div>
              <div className="faith-examples">
                {FAITH_EXAMPLES.map((f) => (
                  <div className="faith-eg" key={f.subject}>
                    <div className="faith-eg-subject">{f.subject}</div>
                    <div className="faith-eg-concept">{f.concept}</div>
                    <div className="faith-eg-sym">{f.sym}</div>
                  </div>
                ))}
              </div>
              <div className="scholar-line">
                <div className="scholar-label">Inspiring the next generation of</div>
                <div className="scholar-body">
                  Al-Khwārizmī in Mathematics · Ibn Sīnā in Medicine · Ibn al-Haytham in Physics —
                  scholars who saw no contradiction between rigour and wonder.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="howitworks">
        <div className="section-inner">
          <div className="how-head">
            <span className="section-label">How it works</span>
            <h2 className="section-heading">Four steps to <em>flourishing</em></h2>
          </div>
          <div className="steps-grid">
            {STEPS.map((s) => (
              <div className="step" key={s.num}>
                <span className="step-num">{s.num}</span>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARENT Q&A */}
      <section className="parents-section">
        <div className="section-inner">
          <div style={{ maxWidth: 540 }}>
            <span className="section-label">Common questions</span>
            <h2 className="section-heading">What parents<br />actually want to know</h2>
          </div>
          <div className="parents-grid">
            {QUESTIONS.map((item) => (
              <div className="parent-q" key={item.q}>
                <div className="pq-q"><span className="pq-icon">?</span>{item.q}</div>
                <p className="pq-a">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-inner">
          <div style={{ maxWidth: 540, marginBottom: 48 }}>
            <span className="section-label">What parents say</span>
            <h2 className="section-heading">Trusted by <em>families</em><br />across the UK</h2>
          </div>
          <div className="t-grid">
            {TESTIMONIALS.map((t) => (
              <div className="t-card" key={t.name}>
                <div className="t-stars">★★★★★</div>
                {t.badge ? <div className="t-badge">{t.badge}</div> : null}
                <div className="t-text">{t.text}</div>
                <div className="t-author">
                  <div className="t-avatar">{t.initials}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* START YOUR JOURNEY */}
      <section className="journey-section" id="journey">
        <div className="journey-inner">
          <div className="journey-left">
            <span className="section-label">Get started</span>
            <h2 className="section-heading">Start your<br /><em>journey</em></h2>
            <p className="section-body">
              Answer five quick questions and we&apos;ll match your child with the right tutor —
              usually within 24 hours. Your tutor will reach out directly to introduce themselves
              and arrange the first session.
            </p>

            <div className="journey-steps-list">
              <div className="j-step">
                <div className="j-dot">1</div>
                <div className="j-step-text"><strong>Tell us what you need</strong>Subject, level, and what you&apos;re hoping to achieve</div>
              </div>
              <div className="j-step">
                <div className="j-dot">2</div>
                <div className="j-step-text"><strong>We match your tutor</strong>Specialist, DBS-checked, vetted by Seeds</div>
              </div>
              <div className="j-step">
                <div className="j-dot">3</div>
                <div className="j-step-text"><strong>Free 15-min consultation</strong>A quick call to introduce your tutor and confirm the plan</div>
              </div>
              <div className="j-step">
                <div className="j-dot">4</div>
                <div className="j-step-text"><strong>Free trial lesson</strong>No cost, no commitment — just brilliant teaching</div>
              </div>
            </div>
          </div>

          <JourneyWizard />
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-heading">Plant the <em>seed</em><br />of something great</h2>
          <p className="cta-body">
            A free 15-minute consultation call, then a completely free trial lesson. No commitment,
            no pressure — just brilliant teaching and a student who leaves more curious than when
            they arrived.
          </p>
          <div className="cta-actions">
            <BookButton tutor="Best available match" subject="Any subject" className="btn-gold">
              Book Free Consultation →
            </BookButton>
            <a href="#journey" className="btn-ghost">Start your journey</a>
          </div>
          <div className="cta-note">No credit card required · Match confirmed within 24 hours · Cancel anytime</div>
        </div>
      </section>

      {/* FOOTER */}
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
                <li><span className="footer-link-dead">Group Sessions</span></li>
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
                <li><span className="footer-link-dead">FAQs</span></li>
                <li><span className="footer-link-dead">Terms &amp; Conditions</span></li>
                <li><span className="footer-link-dead">Privacy Policy</span></li>
                <li><a href="mailto:hello@seedstuition.co.uk">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">
              © 2026 Seeds Tuition Ltd. All rights reserved. ·{' '}
              <span className="footer-copy-dead">Terms</span> ·{' '}
              <span className="footer-copy-dead">Privacy</span> ·{' '}
              <Link href="/login">Tutor Login</Link> ·{' '}
              <Link href="/login">Admin</Link>
            </div>
            <div className="footer-gold">Nurturing the next Al-Khwārizmī</div>
          </div>
        </div>
      </footer>

      <Link href="/login" className="portal-launch-btn" id="portal-launch-btn">🔑 Sign in</Link>
      <BookingModal />
    </main>
  );
}
