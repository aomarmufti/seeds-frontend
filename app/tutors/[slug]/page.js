import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContentPage from '@/components/site/ContentPage';
import BookButton from '@/components/landing/BookButton';
import { TUTORS, getTutor } from '@/lib/tutors';

// SCRUM-XX11 — the "Profile" button on each tutor card used to be a dead
// <span>. These are the pages it now points at: statically generated from the
// roster, so they cost nothing and give organic search a door per tutor.

export function generateStaticParams() {
  return TUTORS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tutor = getTutor(slug);
  if (!tutor) return { title: 'Tutor not found — Seeds' };
  return {
    title: `${tutor.name} — ${tutor.pill} tutor at Seeds`,
    description: tutor.role,
  };
}

export default async function TutorProfilePage({ params }) {
  const { slug } = await params;
  const tutor = getTutor(slug);
  if (!tutor) notFound();

  return (
    <ContentPage title={tutor.name} subtitle={tutor.role}>
      <div className="profile-head">
        <div className="profile-photo">
          <Image src={tutor.img} alt={tutor.name} fill sizes="132px" />
        </div>
        <div>
          <div className="profile-tags">
            {tutor.tags.map((tag) => (
              <span className="profile-tag" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="profile-actions">
            <BookButton tutor={tutor.name} subject={tutor.subject} className="btn-gold">
              Book a free consultation with {tutor.short} →
            </BookButton>
          </div>
        </div>
      </div>

      <div className="profile-stats">
        {tutor.stats.map((s) => (
          <div key={s.label}>
            <div className="profile-stat-num">
              {s.num}{s.suffix ? <span>{s.suffix}</span> : null}
            </div>
            <div className="profile-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <h2>About {tutor.short}</h2>
      <p>{tutor.bio}</p>
      <p>{tutor.detail}</p>

      <h2>How lessons run</h2>
      <p>
        Lessons are 55 minutes, live 1:1 on Google Meet with a shared whiteboard. Homework is set
        after every session and marked before the next one, and you receive a written parent
        report every four weeks. You can see the full breakdown on our{' '}
        <Link href="/faqs#pricing">pricing and FAQs</Link> page.
      </p>
      <p>
        Every Seeds tutor is enhanced DBS checked, subject-interviewed, and trained in the Seeds
        methodology before meeting a student.
      </p>

      <div className="content-footnote">
        <Link href="/#tutors">← Meet the rest of the team</Link>
      </div>
    </ContentPage>
  );
}
