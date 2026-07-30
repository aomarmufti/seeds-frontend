import Link from 'next/link';
import { Seedling, Subject, Check } from '@/components/icons';

// The public marketing page. Deliberately a server component — it holds no
// state and needs no client JavaScript, so a visitor who never signs in
// downloads almost none. Under the old build every visitor pulled all four
// apps, admin logic included.

const SUBJECTS = [
  { key: 'maths',    icon: Subject.maths,    name: 'Maths',    levels: 'GCSE · A-Level' },
  { key: 'science',  icon: Subject.science,  name: 'Chemistry & Physics', levels: 'GCSE · A-Level' },
  { key: 'biology',  icon: Subject.biology,  name: 'Biology',  levels: 'GCSE · A-Level' },
  { key: 'english',  icon: Subject.english,  name: 'English',  levels: 'GCSE' },
];

const PROMISES = [
  'One tutor who stays with your child, not a rota',
  'A free consultation before you pay anything',
  'Written feedback after every lesson',
  'Cancel or move a lesson up to 18 hours before',
];

export default function Home() {
  return (
    <main style={{ background: 'var(--surface)', minHeight: '100vh' }}>
      <header
        style={{
          background: 'var(--navy)', color: '#fff',
          padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700 }}>
          <span style={{ color: 'var(--gold)', display: 'flex' }}><Seedling size={20} /></span>
          Seeds Tuition
        </span>
        <span style={{ flex: 1 }} />
        <Link href="/login" className="btn-xs ghost"
              style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}>
          Sign in
        </Link>
      </header>

      <section style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px 40px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 2.9rem)',
            lineHeight: 1.1, margin: '0 0 14px', letterSpacing: '-.02em', textWrap: 'balance',
          }}
        >
          Tutoring that actually knows your child
        </h1>
        <p style={{ fontSize: '1.06rem', color: 'var(--ink-2)', maxWidth: '58ch', margin: '0 0 26px' }}>
          One-to-one GCSE and A-Level tuition across London. The same tutor every week,
          so nobody starts from scratch — and a free consultation before you commit to anything.
        </p>
        <Link href="/login" className="btn">Book a free consultation</Link>
      </section>

      <section style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 56px' }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {SUBJECTS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="card" style={{ padding: '16px 18px' }}>
                <span style={{ color: 'var(--gold-ink)', display: 'flex', marginBottom: 9 }}>
                  <Icon size={22} />
                </span>
                <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{s.name}</div>
                <div style={{ fontSize: '.76rem', color: 'var(--ink-3)', marginTop: 2 }}>{s.levels}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ background: 'var(--surface-2)', padding: '48px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 18px', fontWeight: 600 }}>
            What you get
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 11 }}>
            {PROMISES.map((p) => (
              <li key={p} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: '.95rem' }}>
                <span style={{ color: 'var(--good)', marginTop: 2, display: 'flex' }}><Check size={17} /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer style={{ padding: '28px 24px', textAlign: 'center', fontSize: '.8rem', color: 'var(--ink-3)' }}>
        Seeds Tuition · London
      </footer>
    </main>
  );
}
