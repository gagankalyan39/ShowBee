// ============================================================
// SHOWBEE TYPE DEFINITIONS
// Shared across Member 1 (Frontend), Member 2 (Catalog),
// Member 3 (Booking & Locking) and Member 4 (Admin & Sockets)
// ============================================================

export interface Movie {
  id: string;
  title: string;
  synopsis?: string;
  director?: string;
  writer?: string;
  duration_mins?: number;
  release_date?: string;
  rating?: number | string;
  language?: string;
  language_code?: string;
  country?: string;
  trailer_url?: string;
  poster_url: string;
  banner_url?: string;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'DRAFT' | 'ENDED';
  is_published: boolean;
  is_trending: boolean;
  view_count?: number;
  genres?: string[];
  cast?: string[];
  cast_members?: { id: string; name: string; role_name?: string; role_type?: string }[];
  reviews?: Review[];
}

export interface Theatre {
  id: string;
  name: string;
  city: string;
  address: string;
  postal_code?: string;
  amenities?: string[];
  screen_count?: number;
  shows?: ShowInfo[];
}

export interface Screen {
  id: string;
  theatre_id: string;
  name: string;
  screen_number: number;
  capacity: number;
  screen_type: string;
  sound_system?: string;
}

export interface ShowInfo {
  id: string;
  start_time: string;
  end_time: string;
  base_price: number;
  screen_id: string;
  screen_name: string;
  screen_type: string;
  language?: string;
  available_seats: number;
  total_seats: number;
}

export interface DetailedShow {
  id: string;
  movie_id: string;
  movie_title: string;
  poster_url: string;
  duration_mins: number;
  rating: number;
  synopsis?: string;
  start_time: string;
  end_time: string;
  base_price: number;
  language_name?: string;
  screen_id: string;
  screen_name: string;
  screen_type: string;
  theatre_id: string;
  theatre_name: string;
  theatre_city: string;
  theatre_address: string;
  theatre_amenities?: string[];
}

export interface SeatItem {
  show_seat_id: string;
  seat_id: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number | string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  locked_by?: string;
}

export interface BookingSeat {
  seat_id: string;
  show_seat_id: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number;
}

export interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  show_id: string;
  total_amount: number | string;
  subtotal: number | string;
  convenience_fee: number | string;
  discount_amount: number | string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  qr_code?: string;
  movie_title?: string;
  poster_url?: string;
  theatre_name?: string;
  theatre_city?: string;
  screen_name?: string;
  screen_type?: string;
  start_time?: string;
  seats?: BookingSeat[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  avatar_url?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export interface MemberContribution {
  memberId: number;
  role: string;
  responsibilities: string[];
  technologies: string[];
  status: 'ONLINE' | 'STANDBY';
  liveProof: any;
}
