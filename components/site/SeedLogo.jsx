// The Seeds mark. Lifted out of app/page.js so the shared header and footer
// (and any page that reuses them) can render it without importing the
// landing page.
export default function SeedLogo({ size = 40, dark = true }) {
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
