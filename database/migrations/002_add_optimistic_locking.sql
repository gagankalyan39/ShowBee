-- Migration 002: Add Optimistic Locking Support
-- Adds version column to show_seats for Compare-And-Set (CAS) optimistic concurrency control

ALTER TABLE show_seats 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_show_seats_version ON show_seats(version);
