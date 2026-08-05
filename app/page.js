import Link from 'next/link';
import Image from 'next/image';
import './landing.css';
import BookButton from '@/components/landing/BookButton';
import ScrollProgress from '@/components/landing/ScrollProgress';
import FaithTabs from '@/components/landing/FaithTabs';
import JourneyWizard from '@/components/landing/JourneyWizard';
import BookingModal from '@/components/booking/BookingModal';
import SiteFonts from '@/components/site/SiteFonts';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { TUTORS } from '@/lib/tutors';
import { PRICES, PRICING_NOTES } from '@/lib/site';

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

// Only outcomes we can point to a real student for. A row with no `before`
// grade renders without the grade block rather than inventing a start point.
const RESULTS = [
  {
    after: '8', subject: 'GCSE Mathematics',
    detail: 'Grade 8 after rebuilding his foundations from the ground up — now taking Maths, Further Maths and Economics at A-Level.',
  },
  {
    subject: 'GCSE → A-Level Mathematics',
    detail: 'Several years of tuition with the same student, GCSE through to A-Level — skills, confidence and a genuine passion for the subject.',
  },
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
  { num: '01', title: 'Free consultation (15-min call)', desc: "A short call to understand your child's current level, the gaps holding them back, and the grade you're aiming for. No pressure, no cost, no card required." },
  { num: '02', title: 'Free trial lesson (60 min)', desc: 'We match a subject specialist on exam board, learning style and goals — usually within 24 hours — and they teach a full trial lesson, free, before you decide anything.' },
  { num: '03', title: 'Structured weekly sessions', desc: 'Live 1:1 on Google Meet with a shared interactive whiteboard — undivided attention, every time. Plus weekly recorded group sessions working through past papers.' },
  { num: '04', title: 'Measurable, visible progress', desc: 'Monthly parent reports. Grade trajectory graphs. Syllabus coverage tracker. You always know exactly where your child stands and what comes next.' },
];

const QUESTIONS = [
  {
    q: 'Will my child actually get better grades?',
    a: (
      <>
        <strong>A and A* grades are outcomes our students have achieved</strong> — including a
        Grade 8 at GCSE Maths for a student who came to us needing his foundations rebuilt, and
        who is now taking Maths, Further Maths and Economics at A-Level. Our team&apos;s students
        have gone on to LSE and other top UK universities. We track progress after every lesson
        and adjust the plan if targets shift — you are never left guessing.
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
    q: 'What happens after the free trial lesson?',
    a: (
      <>
        Your child&apos;s tutor will share a short written diagnostic, with recommended frequency
        and initial focus areas. If you&apos;d like to continue, we set up a regular weekly slot.{' '}
        <strong>No pressure, no automatic sign-up.</strong> You choose the pace.
      </>
    ),
  },
];

// Real messages from real parents, quoted as they were written. Nothing here
// is composed for the website — if a quote isn't in an actual message from a
// family we have taught, it does not belong in this list.
const TESTIMONIALS = [
  {
    text: '"You have been an excellent teacher and what you have done for Alex over the last few years has been wonderful — not only have you improved his maths skills but you have challenged him and boosted his confidence when he was feeling low, really propelling him forward."',
    initials: 'S', name: 'Sarah', role: 'Parent · A-Level Mathematics',
  },
  {
    text: '"He is passionate about maths and has been able to share that with you, which has been amazing. So thank you. If you ever need a reference, we are here for you."',
    initials: 'S', name: 'Sarah', role: 'Parent · GCSE Mathematics',
  },
  {
    text: '"You did a lot of foundation work with him — he has got an 8, and he is still confident he can get a 9. He is planning to take Maths, Further Maths and Economics for A-Level, aiming for a career in the financial sector."',
    initials: 'P', name: 'GCSE Maths parent', role: 'Parent of a Year 11 student',
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

export default function Home() {
  return (
    <main className="landing">
      <SiteFonts />
      <SiteHeader home />

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
                <div className="proof-num">1000<span>+</span></div>
                <div className="proof-label">hours of 1:1 teaching delivered</div>
              </div>
              <div className="proof-stat">
                <div className="proof-num">A<span>/A*</span></div>
                <div className="proof-label">grades our students have achieved</div>
              </div>
              <div className="proof-stat">
                <div className="proof-num">Free</div>
                <div className="proof-label">consultation, then a trial lesson</div>
              </div>
            </div>

            <div className="hero-ctas">
              <BookButton tutor="Best available match" subject="Any subject" className="btn-gold">
                Book a Free Consultation →
              </BookButton>
              <a href="#journey" className="btn-outline-white">Not ready to book?</a>
            </div>
            <div className="hero-cta-note">
              Free consultation, then a free trial lesson · No card required
            </div>

            <div className="hero-trust">
              <span className="trust-stars">✦</span>
              <span className="trust-text">
                <strong>1000+ hours of teaching experience</strong> across the UK · Maths, Sciences, History &amp; Arabic
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
                  <span className="lesson-badge badge-live">Join Meet</span>
                </div>
                <div className="lesson-row">
                  <div className="lesson-stripe" style={{ background: '#4A90D9' }} />
                  <div className="lesson-info">
                    <div className="lesson-subject">GCSE Biology</div>
                    <div className="lesson-meta">4:00 PM · Cell Division &amp; Mitosis</div>
                  </div>
                  <span className="lesson-badge badge-soon">in 3h</span>
                </div>
                <div className="lesson-row">
                  <div className="lesson-stripe" style={{ background: '#6B8E73' }} />
                  <div className="lesson-info">
                    <div className="lesson-subject">GCSE History</div>
                    <div className="lesson-meta">5:30 PM · Cold War Origins</div>
                  </div>
                  <span className="lesson-badge badge-soon">in 4.5h</span>
                </div>

                <div className="zoom-pill">
                  <div className="zoom-icon">M</div>
                  <div className="zoom-text">
                    <strong>Live 1:1 on Google Meet</strong>
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
            <div className="stat-label">Hours of teaching</div>
            <div className="stat-sub">KS3 through A-Level</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">A<em>/A*</em></div>
            <div className="stat-label">Outcomes achieved</div>
            <div className="stat-sub">GCSE and A-Level students</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">DBS<em>✓</em></div>
            <div className="stat-label">Every tutor checked</div>
            <div className="stat-sub">Enhanced DBS · subject interviewed</div>
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
                {r.after ? (
                  <div className="res-grade-block">
                    {r.before ? (
                      <>
                        <div className="res-before">{r.before}</div>
                        <div className="res-arrow">→</div>
                      </>
                    ) : null}
                    <div className="res-after">{r.after}</div>
                  </div>
                ) : null}
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
            <Link href="/faqs#subjects" className="btn-ghost">View all subjects →</Link>
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
                    <Link href={`/tutors/${t.slug}`} className="tutor-profile-btn">Profile</Link>
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
                <div className="zoom-logo-block">M</div>
                <div>
                  <div className="zoom-feature-title">Live 1:1 lessons, plus recorded group sessions</div>
                  <div className="zoom-feature-body">
                    Every 1:1 lesson runs live on Google Meet with a shared whiteboard — fully
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

      {/* PRICING (SCRUM-XX8) */}
      <section className="pricing-section" id="pricing">
        <div className="section-inner">
          <div className="pricing-head">
            <span className="section-label">Pricing</span>
            <h2 className="section-heading">Simple, honest <em>pricing</em></h2>
            <p className="section-body">
              Pay per lesson. No subscription, no joining fee, no minimum term — and your
              consultation and trial lesson are free, so you see the teaching before you pay
              for any of it.
            </p>
          </div>

          <div className="pricing-grid">
            {PRICES.map((p) => (
              <div className={`price-card${p.featured ? ' featured' : ''}`} key={p.id}>
                {p.featured ? <span className="price-flag">Most booked</span> : null}
                <div className="price-level">{p.level}</div>
                <div className="price-amount">{p.price}</div>
                <div className="price-unit">{p.unit}</div>
                <p className="price-blurb">{p.blurb}</p>
                <ul className="price-features">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <BookButton
                  tutor="Best available match"
                  subject="Any subject"
                  className={p.featured ? 'btn-gold' : 'btn-ghost'}
                >
                  Start free →
                </BookButton>
              </div>
            ))}
          </div>

          <div className="pricing-notes">
            {PRICING_NOTES.map((n) => (
              <div className="pricing-note" key={n}>{n}</div>
            ))}
          </div>

          <p className="pricing-compare">
            Marketplaces like MyTutor charge <strong>£25–£55 an hour</strong> for a tutor you
            pick from a list and hope for the best. Every Seeds tutor is handpicked,
            DBS-checked and trained in our methodology before they meet your child.{' '}
            <Link href="/faqs#pricing">More on how payment works →</Link>
          </p>
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
              <div className="t-card" key={t.role}>
                <div className="t-stars">❝</div>
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
            <span className="section-label">Not ready to book?</span>
            <h2 className="section-heading">Then let us<br />come to <em>you</em></h2>
            <p className="section-body">
              If you would rather not pick a time yet, answer five quick questions instead. We
              will match your child with the right tutor — usually within 24 hours — and call you
              to arrange the free consultation when it suits you.
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
                <div className="j-step-text"><strong>Free consultation (15-min call)</strong>A quick call to introduce your tutor and confirm the plan</div>
              </div>
              <div className="j-step">
                <div className="j-dot">4</div>
                <div className="j-step-text"><strong>Free trial lesson (60 min)</strong>No cost, no commitment — just brilliant teaching</div>
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
            A free consultation — a 15-minute call — and then a free 60-minute trial lesson. No
            commitment, no pressure — just brilliant teaching and a student who leaves more
            curious than when they arrived.
          </p>
          <div className="cta-actions">
            <BookButton tutor="Best available match" subject="Any subject" className="btn-gold">
              Book a Free Consultation →
            </BookButton>
            <a href="#journey" className="btn-ghost">Not ready to book?</a>
          </div>
          <div className="cta-note">No credit card required · Match confirmed within 24 hours · Cancel anytime</div>
        </div>
      </section>

      <SiteFooter />

      <Link href="/login" className="portal-launch-btn" id="portal-launch-btn">🔑 Sign in</Link>
      <BookingModal />
    </main>
  );
}
