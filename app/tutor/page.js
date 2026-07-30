import { redirect } from 'next/navigation';
// /tutor on its own isn't a page — send people to the one they actually want.
export default function TutorIndex() { redirect('/tutor/schedule'); }
