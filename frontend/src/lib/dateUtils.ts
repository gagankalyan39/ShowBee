/**
 * Dynamic Booking Date Utility
 * Generates real-time dates based on user's current clock.
 * Handles COMING_SOON movies (Advance booking only for next 2 days, never today).
 */

export interface BookingDateOption {
  label: string;       // "Today", "Tomorrow", "Mon", etc.
  dateStr: string;     // "06 Sep", "07 Sep", etc.
  value: string;       // "today", "tomorrow", "day3"
  isoDate: string;     // "2026-09-06"
  dayOffset: number;   // 0, 1, 2
  isAdvance: boolean;  // true if dayOffset > 0
}

export function getBookingDates(isComingSoon: boolean = false): BookingDateOption[] {
  const now = new Date();
  const options: BookingDateOption[] = [];

  // 4 upcoming days in real time
  for (let i = 0; i < 4; i++) {
    // COMING_SOON movies: ONLY next 2-3 advance days (Tomorrow & Day 3+). NEVER today!
    if (isComingSoon && i === 0) {
      continue;
    }

    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const dayName = i === 0 
      ? 'Today' 
      : i === 1 
        ? 'Tomorrow' 
        : d.toLocaleDateString('en-US', { weekday: 'short' });
        
    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const value = i === 0 ? 'today' : i === 1 ? 'tomorrow' : i === 2 ? 'day3' : 'day4';

    options.push({
      label: dayName,
      dateStr,
      value,
      isoDate,
      dayOffset: i,
      isAdvance: i > 0,
    });
  }

  return options;
}
