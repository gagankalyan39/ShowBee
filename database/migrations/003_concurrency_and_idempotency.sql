-- ============================================================
-- Migration 003: Concurrency Control, Idempotency & ACID Guarantees
-- SHOWBEE Cinema Booking Platform
-- ============================================================

-- 1. Add idempotency_key column to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

-- Unique index to prevent duplicate booking submissions per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_user_idempotency 
  ON bookings(user_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 2. General-purpose API idempotency record store
CREATE TABLE IF NOT EXISTS idempotency_records (
  key             VARCHAR(255) PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        VARCHAR(100) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_records_user ON idempotency_records(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_records_created ON idempotency_records(created_at);

-- 3. Strict Check Constraint on show_seats status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_show_seats_status'
  ) THEN
    ALTER TABLE show_seats 
      ADD CONSTRAINT chk_show_seats_status 
      CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED'));
  END IF;
END $$;

-- 4. Database-level trigger to physically prevent double-booking of any seat
-- Even if an application bug bypassed row-level locking, PostgreSQL will abort the transaction
CREATE OR REPLACE FUNCTION trg_check_duplicate_seat_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_status booking_status;
BEGIN
  SELECT status INTO v_booking_status 
  FROM bookings 
  WHERE id = NEW.booking_id;

  -- Only enforce conflict check if the booking is CONFIRMED or PENDING
  IF v_booking_status IN ('CONFIRMED', 'PENDING') THEN
    IF EXISTS (
      SELECT 1 
      FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.id
      WHERE bs.show_seat_id = NEW.show_seat_id
        AND bs.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND b.id <> NEW.booking_id
        AND b.status = 'CONFIRMED'
    ) THEN
      RAISE EXCEPTION 'ACID VIOLATION: Seat % is already CONFIRMED in another booking', NEW.show_seat_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_seat_booking ON booking_seats;
CREATE TRIGGER trg_prevent_duplicate_seat_booking
BEFORE INSERT OR UPDATE ON booking_seats
FOR EACH ROW
EXECUTE FUNCTION trg_check_duplicate_seat_booking();

-- 5. Additional performance index for deterministic lock ordering and validation
CREATE INDEX IF NOT EXISTS idx_show_seats_show_status ON show_seats(show_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_seats_show_seat ON booking_seats(show_seat_id);

