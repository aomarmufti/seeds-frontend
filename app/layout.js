import './globals.css';

export const metadata = {
  title: 'Seeds Tuition',
  description: 'One-to-one tutoring for GCSE and A-Level, matched to your child.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D1B2A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
