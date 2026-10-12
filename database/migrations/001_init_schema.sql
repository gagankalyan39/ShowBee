-- ============================================================
-- SHOWBEE DATABASE SCHEMA
-- Member 3 (Backend/Booking) + Member 2 (Movie/Data)
-- ============================================================

-- Clean existing schema if re-initializing
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & AUTH (Member 3 - Backend)
-- ============================================================

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'USER',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- ============================================================
-- MOVIES & CONTENT (Member 2 - Movie/Data)
-- ============================================================

CREATE TYPE movie_status AS ENUM ('DRAFT', 'NOW_SHOWING', 'COMING_SOON', 'ENDED');

CREATE TABLE IF NOT EXISTS languages (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL,
  code  VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS genres (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL,
  slug  VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(500) NOT NULL,
  synopsis        TEXT,
  director        VARCHAR(500),
  writer          VARCHAR(500),
  duration_mins   INTEGER,
  release_date    DATE,
  rating          DECIMAL(3,1) DEFAULT 0.0,
  language_id     INTEGER REFERENCES languages(id),
  country         VARCHAR(100),
  trailer_url     TEXT,
  poster_url      TEXT,
  banner_url      TEXT,
  status          movie_status NOT NULL DEFAULT 'COMING_SOON',
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  is_trending     BOOLEAN NOT NULL DEFAULT FALSE,
  view_count      INTEGER DEFAULT 0,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id  UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  genre_id  INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE IF NOT EXISTS cast_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  profile_url TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movie_cast (
  movie_id        UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  cast_member_id  UUID NOT NULL REFERENCES cast_members(id) ON DELETE CASCADE,
  role_name       VARCHAR(255),
  role_type       VARCHAR(50) DEFAULT 'ACTOR', -- ACTOR, DIRECTOR, WRITER
  display_order   INTEGER DEFAULT 0,
  PRIMARY KEY (movie_id, cast_member_id, role_type)
);

CREATE TABLE IF NOT EXISTS movie_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id    UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  image_type  VARCHAR(50) DEFAULT 'GALLERY', -- POSTER, BANNER, GALLERY
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_movies_language ON movies(language_id);
CREATE INDEX idx_movies_published ON movies(is_published);
CREATE INDEX idx_movie_genres_movie ON movie_genres(movie_id);
CREATE INDEX idx_movie_genres_genre ON movie_genres(genre_id);

-- Full text search index on movies
CREATE INDEX idx_movies_search ON movies USING gin(to_tsvector('english', title || ' ' || COALESCE(synopsis, '') || ' ' || COALESCE(director, '')));

-- ============================================================
-- THEATRES & SCREENS (Member 3 - Backend)
-- ============================================================

CREATE TABLE IF NOT EXISTS theatres (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  address     TEXT,
  location    TEXT,
  amenities   TEXT[],
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theatre_id  UUID NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 100,
  screen_type VARCHAR(50) DEFAULT '2D', -- 2D, 3D, IMAX, 4DX
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seat_types (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,  -- REGULAR, PREMIUM, RECLINER, VIP
  price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS seats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id     UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  seat_type_id  INTEGER NOT NULL REFERENCES seat_types(id),
  row_label     VARCHAR(5) NOT NULL,  -- A, B, C...
  seat_number   INTEGER NOT NULL,      -- 1, 2, 3...
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(screen_id, row_label, seat_number)
);

CREATE INDEX idx_seats_screen ON seats(screen_id);
CREATE INDEX idx_theatres_city ON theatres(city);

-- ============================================================
-- SHOWS (Member 3 - Backend)
-- ============================================================

CREATE TABLE IF NOT EXISTS shows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id    UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  screen_id   UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  base_price  DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  language_id INTEGER REFERENCES languages(id),
  format      VARCHAR(20) DEFAULT '2D',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS show_seats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_id         UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE, HELD, BOOKED
  locked_by       UUID REFERENCES users(id),
  lock_expires_at TIMESTAMPTZ,
  price           DECIMAL(10,2) NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(show_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_show_seats_version ON show_seats(version);

CREATE INDEX idx_shows_movie ON shows(movie_id);
CREATE INDEX idx_shows_screen ON shows(screen_id);
CREATE INDEX idx_shows_start_time ON shows(start_time);
CREATE INDEX idx_show_seats_show ON show_seats(show_id);
CREATE INDEX idx_show_seats_status ON show_seats(status);
CREATE INDEX idx_show_seats_lock_expires ON show_seats(lock_expires_at) WHERE status = 'HELD';

-- ============================================================
-- BOOKINGS & PAYMENTS (Member 3 - Backend/Booking)
-- CRITICAL: Pessimistic locking happens here
-- ============================================================

CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE payment_method AS ENUM ('CARD', 'UPI', 'WALLET');

CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id),
  show_id             UUID NOT NULL REFERENCES shows(id),
  booking_reference   VARCHAR(20) UNIQUE NOT NULL,
  subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
  convenience_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  taxes               DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  status              booking_status NOT NULL DEFAULT 'PENDING',
  offer_code          VARCHAR(50),
  qr_code             TEXT,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id     UUID NOT NULL REFERENCES seats(id),
  show_seat_id UUID NOT NULL REFERENCES show_seats(id),
  price       DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  method          payment_method NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  status          payment_status NOT NULL DEFAULT 'PENDING',
  transaction_id  VARCHAR(100),
  gateway_response JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_show ON bookings(show_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_booking_seats_booking ON booking_seats(booking_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- ============================================================
-- OFFERS & COUPONS (Member 4 - Admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  description     TEXT,
  discount_type   VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- PERCENTAGE, FLAT
  discount_value  DECIMAL(10,2) NOT NULL,
  min_amount      DECIMAL(10,2) DEFAULT 0,
  max_discount    DECIMAL(10,2),
  usage_limit     INTEGER,
  used_count      INTEGER DEFAULT 0,
  expiry_date     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEWS (Member 4 - Admin/Testing)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  movie_id      UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id),
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text   TEXT,
  is_approved   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_reviews_movie ON reviews(movie_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ============================================================
-- NOTIFICATIONS (Member 4 - Admin/Notifications)
-- ============================================================

CREATE TYPE notification_type AS ENUM (
  'MOVIE_RELEASE', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
  'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SHOW_REMINDER', 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(500) NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- AUDIT LOGS (Member 4 - Admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100) NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_theatres_updated_at BEFORE UPDATE ON theatres FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_show_seats_updated_at BEFORE UPDATE ON show_seats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
