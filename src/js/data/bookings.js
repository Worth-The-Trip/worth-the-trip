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
//       id: 'bk-park-hyatt-tokyo',   // unique string
//       type: 'hotel',               // 'hotel' | 'event' | 'experience' | 'transport'
//       title: 'Park Hyatt Tokyo',
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

const WTT_BOOKINGS = [
  {
    id: 'bk-park-hyatt-tokyo',
    type: 'hotel',
    title: 'Park Hyatt Tokyo',
    location: 'Shinjuku, Tokyo',
    dateStart: '2026-10-12',
    dateEnd: '2026-10-15',
    reference: 'PH-8X2K4Q',
    image: 'public/Bookings Images/Park Hyatt Tokyo.webp',
    notes: 'Check-in from 3pm. New York Bar on the 52nd floor.',
    url: ''
  },
  {
    id: 'bk-teamlab-planets',
    type: 'event',
    title: 'teamLab Planets Tickets × 2',
    location: 'Toyosu, Tokyo',
    dateStart: '2026-10-13',
    time: '10:30',
    reference: 'TL-209471',
    image: 'public/Bookings Images/team lab planets-web.jpg',
    notes: 'Arrive 15 min early. Barefoot — wear shorts you can roll up.',
    url: ''
  },
  {
    id: 'bk-tsukiji-masterclass',
    type: 'experience',
    title: 'Tsukiji Sushi Masterclass',
    location: 'Tsukiji, Tokyo',
    dateStart: '2026-10-14',
    time: '08:00',
    reference: 'TS-5518-WTT',
    image: 'public/Bookings Images/tsukiji sushi masterclass.jpg',
    notes: 'Apron provided. Market tour included before the class.',
    url: ''
  },
  {
    id: 'bk-kyoto-machiya',
    type: 'hotel',
    title: 'Gion Machiya Stay',
    location: 'Gion, Kyoto',
    dateStart: '2026-04-02',
    dateEnd: '2026-04-05',
    reference: 'GM-3301-ZZ',
    image: 'public/Bookings Images/gion machiya stay.avif',
    notes: 'Traditional townhouse. Self check-in with key box.',
    url: ''
  }
];
