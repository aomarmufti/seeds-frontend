// The legacy design system needs DM Serif Display, Inter and Cormorant
// Garamond. React hoists these tags into <head>. Rendered by every page that
// uses the `.landing` chrome (the landing page itself and the content pages),
// rather than by the root layout, so the portal routes are unaffected.
export default function SiteFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        precedence="landing-fonts"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap"
      />
    </>
  );
}
