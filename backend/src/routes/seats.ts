// ============================================================
// MEMBER 3 - Backend/Booking: Seat Routes + PESSIMISTIC LOCKING
// The core technical feature of SHOWBEE
// ============================================================
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/shows/:id/seats — seat map
router.get('/:id/seats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const show = await query(`
      SELECT s.*, m.title AS movie_title, m.poster_url,
             sc.name AS screen_name, sc.screen_type, sc.capacity,
             t.name AS theatre_name, t.city, t.address
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      JOIN screens sc ON s.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      WHERE s.id = $1
    `, [id]);

    if (!show.rows[0]) return res.status(404).json({ success: false, message: 'Show not found' });

    // Release expired locks first
    await query(`
      UPDATE show_seats SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL
      WHERE show_id = $1 AND status = 'HELD' AND lock_expires_at < NOW()
    `, [id]);

    const seats = await query(`
      SELECT ss.id AS show_seat_id, ss.status, ss.price, ss.locked_by,
             se.id AS seat_id, se.row_label, se.seat_number,
             st.name AS seat_type, st.price_multiplier
      FROM show_seats ss
      JOIN seats se ON ss.seat_id = se.id
      JOIN seat_types st ON se.seat_type_id = st.id
      WHERE ss.show_id = $1
      ORDER BY se.row_label, se.seat_number
    `, [id]);

    // Group by row
    const rows: any = {};
    for (const seat of seats.rows) {
      if (!rows[seat.row_label]) rows[seat.row_label] = [];
      rows[seat.row_label].push(seat);
    }

    res.json({ success: true, data: { show: show.rows[0], rows, seats: seats.rows } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/shows/:id/seats/hold — PESSIMISTIC LOCKING (Critical)
router.post('/:id/seats/hold', authenticate, async (req: AuthRequest, res: Response) => {
  const { id: showId } = req.params;
  const { seatIds } = req.body; // array of show_seat_ids
  const userId = req.user!.id;

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No seats selected' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify show has not already concluded
    const showCheck = await client.query('SELECT start_time, end_time FROM shows WHERE id = $1', [showId]);
    if (!showCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    if (new Date(showCheck.rows[0].end_time) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This screening has already concluded. Please select an upcoming screening.' });
    }

    const lockMode = (req.body.lockMode || 'PESSIMISTIC').toUpperCase();

    // ====================================================
    // CONCURRENCY CONTROLLER: PESSIMISTIC vs OPTIMISTIC
    // Both locking systems are fully implemented and selectable.
    // ====================================================

    if (lockMode === 'OPTIMISTIC') {
      // ────────────────────────────────────────────────────
      // OPTIMISTIC LOCKING ENGINE (Version-based CAS)
      // Read without row locks, then atomic Compare-And-Set
      // ────────────────────────────────────────────────────
      const readResult = await client.query(`
        SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at, ss.version,
               se.row_label, se.seat_number
        FROM show_seats ss
        JOIN seats se ON ss.seat_id = se.id
        WHERE ss.id = ANY($1::uuid[]) AND ss.show_id = $2
      `, [seatIds, showId]);

      const unavailable: string[] = [];
      const validSeats: any[] = [];

      for (const seat of readResult.rows) {
        if (seat.status === 'BOOKED') {
          unavailable.push(`${seat.row_label}${seat.seat_number} (already booked)`);
        } else if (seat.status === 'HELD' && seat.locked_by !== userId && new Date(seat.lock_expires_at) > new Date()) {
          unavailable.push(`${seat.row_label}${seat.seat_number} (held by another user)`);
        } else {
          validSeats.push(seat);
        }
      }

      if (unavailable.length > 0 || validSeats.length !== seatIds.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          lockMode: 'OPTIMISTIC',
          message: `Optimistic check: Seats no longer available: ${unavailable.join(', ')}`,
          unavailableSeats: unavailable,
        });
      }

      // Atomic Compare-And-Set (CAS) Update
      let conflictOccurred = false;
      const toHold: string[] = [];

      for (const seat of validSeats) {
        const updateRes = await client.query(`
          UPDATE show_seats
          SET status = 'HELD',
              locked_by = $1,
              lock_expires_at = NOW() + INTERVAL '5 minutes',
              version = version + 1,
              updated_at = NOW()
          WHERE id = $2 
            AND version = $3 
            AND (status = 'AVAILABLE' OR (status = 'HELD' AND lock_expires_at <= NOW()) OR locked_by = $1)
          RETURNING id, version
        `, [userId, seat.id, seat.version]);

        if (updateRes.rowCount === 0) {
          conflictOccurred = true;
          break;
        }
        toHold.push(seat.id);
      }

      if (conflictOccurred) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          lockMode: 'OPTIMISTIC',
          conflict: true,
          message: 'Optimistic Concurrency Conflict: Seat was modified concurrently by another user.',
        });
      }

      await client.query('COMMIT');

      // Socket.IO real-time broadcast
      try {
        const io = getIO();
        if (io) {
          io.emit('seat_status_update', {
            showId,
            seatIds: toHold,
            status: 'HELD',
            lockMode: 'OPTIMISTIC',
            lockedBy: userId,
          });
        }
      } catch {}

      return res.json({
        success: true,
        lockMode: 'OPTIMISTIC',
        message: 'Seats held successfully using Optimistic Locking (CAS version match)',
        data: {
          heldSeats: toHold,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
    }

    // ────────────────────────────────────────────────────
    // PESSIMISTIC LOCKING ENGINE (SELECT ... FOR UPDATE)
    // Exclusive row lock prevents race conditions
    // ────────────────────────────────────────────────────
    const lockResult = await client.query(`
      SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at, ss.version,
             se.row_label, se.seat_number
      FROM show_seats ss
      JOIN seats se ON ss.seat_id = se.id
      WHERE ss.id = ANY($1::uuid[]) AND ss.show_id = $2
      FOR UPDATE
    `, [seatIds, showId]);

    // Check all requested seats
    const unavailable: string[] = [];
    const toHold: string[] = [];

    for (const seat of lockResult.rows) {
      if (seat.status === 'BOOKED') {
        unavailable.push(`${seat.row_label}${seat.seat_number} (already booked)`);
      } else if (seat.status === 'HELD') {
        if (seat.locked_by !== userId && new Date(seat.lock_expires_at) > new Date()) {
          unavailable.push(`${seat.row_label}${seat.seat_number} (held by another user)`);
        } else {
          toHold.push(seat.id); // expired hold — can re-hold
        }
      } else {
        toHold.push(seat.id); // AVAILABLE
      }
    }

    if (unavailable.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        lockMode: 'PESSIMISTIC',
        message: `Sorry, these seats are no longer available: ${unavailable.join(', ')}`,
        unavailableSeats: unavailable,
      });
    }

    // Mark as HELD with 5-minute lock & increment version
    await client.query(`
      UPDATE show_seats
      SET status = 'HELD',
          locked_by = $1,
          lock_expires_at = NOW() + INTERVAL '5 minutes',
          version = version + 1,
          updated_at = NOW()
      WHERE id = ANY($2::uuid[])
    `, [userId, toHold]);

    await client.query('COMMIT');

    // Socket.IO real-time broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit('seat_status_update', {
          showId,
          seatIds: toHold,
          status: 'HELD',
          lockMode: 'PESSIMISTIC',
          lockedBy: userId,
        });
      }
    } catch {}

    res.json({
      success: true,
      lockMode: 'PESSIMISTIC',
      message: 'Seats held successfully for 5 minutes (Pessimistic Row Lock)',
      data: {
        heldSeats: toHold,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Seat hold error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/shows/:id/seats/release — release held seats
router.post('/:id/seats/release', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id: showId } = req.params;
    const { seatIds } = req.body;
    const userId = req.user!.id;

    await query(`
      UPDATE show_seats
      SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL, updated_at = NOW()
      WHERE id = ANY($1::uuid[]) AND show_id = $2 AND locked_by = $3 AND status = 'HELD'
    `, [seatIds, showId, userId]);

    res.json({ success: true, message: 'Seats released' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
