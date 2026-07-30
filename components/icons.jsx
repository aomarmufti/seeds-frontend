// One icon set, replacing the emoji that were scattered through the old markup.
//
// The old build used pictographic emoji as UI icons — 🌱 in the logo, 💳 on the
// payments nav, 🩺 on a subject chip, 📊 on a stats card. They render as a
// different typeface at a different weight on every OS, they carry colour we
// don't control, they don't inherit currentColor, and en masse they make a
// product look generated rather than designed.
//
// These are 1.5px-stroke line icons on a 24px grid, drawn to sit on the text
// baseline and inherit colour and size from their container. Typographic marks
// that were already doing real work — → ← ✓ ✕ · — are left alone; they're
// punctuation, not decoration.

function Svg({ children, size = 18, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block' }}
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ── brand ─────────────────────────────────────────────────────────────── */
// Replaces the 🌱 in the wordmark. A seed with two leaves — the same idea the
// emoji was reaching for, drawn to match the type it sits beside.
export const Seedling = (p) => (
  <Svg {...p}>
    <path d="M12 21v-7" />
    <path d="M12 14c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6Z" />
    <path d="M12 14c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7Z" />
  </Svg>
);

/* ── navigation ────────────────────────────────────────────────────────── */
export const Home = (p) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Svg>
);
export const Calendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);
export const Lessons = (p) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
  </Svg>
);
export const Progress = (p) => (
  <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
);
export const Homework = (p) => (
  <Svg {...p}>
    <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v6h6M9 14l2 2 4-4" />
  </Svg>
);
export const Payments = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M2.5 10h19M6 15h4" />
  </Svg>
);
export const Students = (p) => (
  <Svg {...p}>
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    <path d="M17 4.3a3.5 3.5 0 0 1 0 6.9M18.5 14a6.5 6.5 0 0 1 3 5.5" />
  </Svg>
);
export const Leads = (p) => (
  <Svg {...p}>
    <path d="M4 5.5h16v13H4z" /><path d="m4 6.5 8 6 8-6" />
  </Svg>
);
export const Earnings = (p) => (
  <Svg {...p}>
    <path d="M12 2.5v19" />
    <path d="M16.5 6.5H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H7" />
  </Svg>
);
export const Resources = (p) => (
  <Svg {...p}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
  </Svg>
);
export const Tutors = (p) => (
  <Svg {...p}>
    <path d="M12 3 2.5 8 12 13l9.5-5Z" /><path d="M6.5 10.5V16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5.5" />
  </Svg>
);
export const Analytics = (p) => (
  <Svg {...p}>
    <path d="M21 21H3V3" /><path d="m7 15 3.5-4 3 2.5L20 7" />
  </Svg>
);
export const Settings = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" />
  </Svg>
);

/* ── status & actions ──────────────────────────────────────────────────── */
export const Bell = (p) => (
  <Svg {...p}>
    <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5Z" />
    <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
  </Svg>
);
export const Video = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="13" height="12" rx="2" />
    <path d="m15.5 10.5 6-3v9l-6-3Z" />
  </Svg>
);
export const Link = (p) => (
  <Svg {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
  </Svg>
);
export const Note = (p) => (
  <Svg {...p}>
    <path d="M4 4.5h16v15H4z" /><path d="M8 9.5h8M8 13.5h8M8 17h5" />
  </Svg>
);
export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.75" />
    <path d="M4.5 20.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7" />
  </Svg>
);
export const Shield = (p) => (
  <Svg {...p}>
    <path d="M12 2.75 4.5 6v6.5c0 4.5 3.2 7.6 7.5 8.75 4.3-1.15 7.5-4.25 7.5-8.75V6Z" />
  </Svg>
);
export const Alert = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 2.5 20h19Z" /><path d="M12 10v4M12 17h.01" />
  </Svg>
);
export const Announce = (p) => (
  <Svg {...p}>
    <path d="M3.5 10v4a1 1 0 0 0 1 1H8l5.5 4V5L8 9H4.5a1 1 0 0 0-1 1Z" />
    <path d="M17.5 8.5a5 5 0 0 1 0 7" />
  </Svg>
);
export const Message = (p) => (
  <Svg {...p}>
    <path d="M20.5 12a8 8 0 0 1-11.6 7.1L3.5 20.5l1.4-5.4A8 8 0 1 1 20.5 12Z" />
  </Svg>
);
export const Download = (p) => (
  <Svg {...p}><path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4 19.5h16" /></Svg>
);
export const Trash = (p) => (
  <Svg {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5 6.8 20a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1L18 6.5" />
  </Svg>
);
export const Doc = (p) => (
  <Svg {...p}>
    <path d="M6 3h8l4.5 4.5V21H6Z" /><path d="M14 3v5h4.5" />
  </Svg>
);
export const Key = (p) => (
  <Svg {...p}>
    <circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M15.5 12v2.5" />
  </Svg>
);
export const Globe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
  </Svg>
);
export const Target = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);
export const Check = (p) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const Close = (p) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);

/* ── subject marks, replacing the emoji on subject chips ───────────────── */
// 🩺 for medicine, 🧬 for biology, 🔬 for science and so on read as clip-art
// next to the type. These are quieter and share one visual language.
export const Subject = {
  maths: (p) => <Svg {...p}><path d="M4.5 7h6M7.5 4v6M14 7h5.5M14 15h5.5M14 18.5h5.5M5 15l4 4M9 15l-4 4" /></Svg>,
  science: (p) => <Svg {...p}><path d="M9.5 3v6L4 19a1.5 1.5 0 0 0 1.3 2.2h13.4A1.5 1.5 0 0 0 20 19l-5.5-10V3" /><path d="M8 3h8M7.5 14h9" /></Svg>,
  biology: (p) => <Svg {...p}><path d="M7 3c0 6 10 12 10 18M17 3c0 6-10 12-10 18" /><path d="M8.5 7h7M8.5 17h7" /></Svg>,
  english: (p) => <Svg {...p}><path d="M4 20h16" /><path d="m8 16 4-11 4 11M9.5 12.5h5" /></Svg>,
  medicine: (p) => <Svg {...p}><path d="M12 7.5v9M7.5 12h9" /><circle cx="12" cy="12" r="8.5" /></Svg>,
};

// Nav icon by route segment, so a sidebar item never hardcodes one.
export const NAV_ICON = {
  home: Home, lessons: Lessons, calendar: Calendar, progress: Progress,
  homework: Homework, payments: Payments, students: Students, leads: Leads,
  schedule: Calendar, earnings: Earnings, resources: Resources,
  tutors: Tutors, bookings: Lessons, analytics: Analytics, settings: Settings,
};
