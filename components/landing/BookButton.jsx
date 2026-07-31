'use client';

// The booking modal (components/booking/BookingModal.jsx) is mounted once at
// the bottom of the landing page and listens for this event. Dispatching a
// CustomEvent — rather than lifting open-state into a client wrapper around
// the whole page — is what lets the "Book" CTAs stay tiny client islands
// inside otherwise fully server-rendered sections.
export const OPEN_BOOKING_EVENT = 'seeds:open-booking';

export function openBooking(tutor, subject) {
  window.dispatchEvent(
    new CustomEvent(OPEN_BOOKING_EVENT, { detail: { tutor, subject } })
  );
}

export default function BookButton({ tutor, subject, className, children }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openBooking(tutor, subject)}
    >
      {children}
    </button>
  );
}
