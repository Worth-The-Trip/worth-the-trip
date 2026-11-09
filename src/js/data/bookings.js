// Worth The Trip — Booking Data + Architecture
// ---------------------------------------------------------------------------
// FUTURE: replace WTT_BOOKINGS with a fetch() to your bookings API /
//   confirmation-email parser / partner integrations (Booking.com, Klook,
//   JR, hotel PMS). The app only talks to this module through:
//     loadBookings()      -> merged list (static placeholders + user-saved)
//     saveUserBooking(b)  -> persist a booking (localStorage for now,
//                            swap for POST /api/bookings later)
//     bookingStatus(b)    -> 'upcoming' | 'ongoing' | 'past' from dates
//   Each booking object shape (keep stable — UI depends on it):
//     {
//       id: 'bk-xxxxxxxx',          // unique string
//       type: 'hotel',               // 'hotel' | 'event' | 'experience' | 'transport'
//       title: 'Hotel name',
//       location: 'Shinjuku, Tokyo',
//       dateStart: '2026-10-12',     // ISO date
//       dateEnd: '2026-10-15',       // ISO date (hotels/stays; omit for single-day)
//       time: '15:00',               // optional HH:MM (events/experiences)
//       reference: 'PH-8X2K4Q',      // confirmation / voucher code
//       image: 'https://...',        // card art
//       notes: 'Check-in from 3pm.', // optional free text
//       url: 'https://...',          // optional manage-booking link
//     }
// ---------------------------------------------------------------------------

const WTT_BOOKINGS = [];

// Example bookings were removed on request. Add real ones here when needed.
