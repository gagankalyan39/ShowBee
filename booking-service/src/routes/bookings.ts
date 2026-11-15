// ============================================================
// BOOKING MICROSERVICE - Booking Routes
// ============================================================
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import { logAudit } from '../services/auditService';
import { getIO } from '../socket';
import { generateBookingRef, generateQR } from '../utils/helpers';
import { bookingCreations, bookingAttempts, bookingSuccess, bookingDuration } from '../metrics';

const router = Router();

// POST /api/bookings — create booking
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  const ARCH = (process.env.ARCHITECTURE_LABEL || 'microservice').trim();
  bookingAttempts.labels(ARCH).inc();

  const userId = req.user!.id;
  const { showId, offerCode } = req.body;
  const rawSeatIds = req.body.seatIds;
  const idempotencyKey = (req.headers['idempotency-key'] || req.body.idempotencyKey || req.body.idempotency_key) as string | undefined;

  // 1. Idempotency Check
  if (idempotencyKey) {
    try {
      const existing = await query(`
        SELECT b.*,
               COALESCE(json_agg(DISTINCT jsonb_build_object('row', se.row_label, 'num', se.seat_number, 'type', st.name, 'price', bs.price)) FILTER (WHERE se.id IS NOT NULL), '[]') AS seats
        FROM bookings b
        LEFT JOIN booking_seats bs ON bs.booking_id = b.id
        LEFT JOIN seats se ON bs.seat_id = se.id
        LEFT JOIN seat_types st ON se.seat_type_id = st.id
        WHERE b.user_id = $1 AND b.idempotency_key = $2
        GROUP BY b.id
      `, [userId, idempotencyKey]);

      if (existing.rows[0]) {
        return res.status(200).json({
          success: true,
          idempotent: true,
          message: 'Booking retrieved from idempotent cache',
          data: existing.rows[0],
        });
      }
    } catch {}
  }

  if (!rawSeatIds || !Array.isArray(rawSeatIds) || rawSeatIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No seats selected' });
  }

  // Deduplicate and deterministically sort seat IDs
  const seatIds: string[] = Array.from(new Set(rawSeatIds.filter((s: any) => typeof s === 'string'))).sort();
  if (seatIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid seat IDs provided' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Deterministic ORDER BY ss.id ASC FOR UPDATE
    const seatsResult = await client.query(`
      SELECT ss.id AS show_seat_id, ss.status, ss.locked_by, ss.lock_expires_at, ss.price,
             se.id AS seat_id, se.row_label, se.seat_number, st.name AS seat_type
      FROM show_seats ss
      JOIN seats se ON ss.seat_id = se.id
      JOIN seat_types st ON se.seat_type_id = st.id
      WHERE ss.id = ANY($1::uuid[]) AND ss.show_id = $2
      ORDER BY ss.id ASC
      FOR UPDATE
    `, [seatIds, showId]);

    if (seatsResult.rows.length !== seatIds.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'One or more selected seats could not be found for this show.',
      });
    }

    for (const seat of seatsResult.rows) {
      if (seat.status !== 'HELD' || seat.locked_by !== userId) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: `Seat ${seat.row_label}${seat.seat_number} is no longer held by you. Please re-select your seats.` });
      }
      if (new Date(seat.lock_expires_at) <= new Date()) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Your seat hold has expired. Please select seats again.' });
      }
    }

    const subtotal = seatsResult.rows.reduce((sum: number, s: any) => sum + parseFloat(s.price), 0);
    const convenienceFee = Math.round(subtotal * 0.05);
    const taxes = Math.round(subtotal * 0.18);

    let discount = 0;
    if (offerCode) {
      const offer = await client.query(`
        SELECT * FROM offers WHERE code = $1 AND is_active = TRUE
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        AND (usage_limit IS NULL OR used_count < usage_limit)
        FOR UPDATE
      `, [offerCode.toUpperCase()]);

      if (offer.rows[0]) {
        const o = offer.rows[0];
        if (subtotal >= parseFloat(o.min_amount)) {
          if (o.discount_type === 'PERCENTAGE') {
            discount = Math.round(subtotal * parseFloat(o.discount_value) / 100);
            if (o.max_discount) discount = Math.min(discount, parseFloat(o.max_discount));
          } else {
            discount = parseFloat(o.discount_value);
          }
          await client.query(
            'UPDATE offers SET used_count = used_count + 1 WHERE code = $1 AND (usage_limit IS NULL OR used_count < usage_limit)',
            [offerCode.toUpperCase()]
          );
        }
      }
    }

    const totalAmount = subtotal + convenienceFee + taxes - discount;
    const bookingRef = generateBookingRef();

    const bookingResult = await client.query(`
      INSERT INTO bookings (user_id, show_id, booking_reference, subtotal, convenience_fee, taxes, discount, total_amount, status, offer_code, idempotency_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,$10)
      RETURNING *
    `, [userId, showId, bookingRef, subtotal, convenienceFee, taxes, discount, totalAmount, offerCode || null, idempotencyKey || null]);

    const booking = bookingResult.rows[0];

    for (const seat of seatsResult.rows) {
      await client.query(`
        INSERT INTO booking_seats (booking_id, seat_id, show_seat_id, price)
        VALUES ($1,$2,$3,$4)
      `, [booking.id, seat.seat_id, seat.show_seat_id, seat.price]);
    }

    await client.query('COMMIT');
    bookingCreations.labels('pending', ARCH).inc();
    bookingSuccess.labels(ARCH).inc();
    bookingDuration.labels(ARCH).observe((Date.now() - startTime) / 1000);

    try {
      const showDetails = await query(`
        SELECT m.title AS movie_title, t.name AS theatre_name, s.start_time
        FROM shows s
        JOIN movies m ON s.movie_id = m.id
        JOIN screens sc ON s.screen_id = sc.id
        JOIN theatres t ON sc.theatre_id = t.id
        WHERE s.id = $1
      `, [showId]);
      const sd = showDetails.rows[0];
      const seatLabels = seatsResult.rows.map((s: any) => `${s.row_label}${s.seat_number}`).join(', ');

      await createNotification(
        userId,
        'BOOKING_PENDING',
        '⏳ Seats Reserved (5 Mins to Pay)',
        `Seats (${seatLabels}) reserved for "${sd?.movie_title || 'Movie'}" at ${sd?.theatre_name || 'Theatre'}! Complete payment within 5 minutes to confirm tickets. Ref: ${bookingRef}`,
        { bookingId: booking.id, bookingRef, showId }
      );
    } catch (notifErr: any) {
      console.error('Failed to create pending booking notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      data: {
        ...booking,
        seats: seatsResult.rows,
        seatLabels: seatsResult.rows.map((s: any) => `${s.row_label}${s.seat_number}`).join(', ')
      }
    });
  } catch (err: any) {
    bookingCreations.labels('failed', ARCH).inc();
    bookingDuration.labels(ARCH).observe((Date.now() - startTime) / 1000);
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/bookings or /api/bookings/my-bookings
router.get(['/', '/my-bookings'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;
    let conditions = ['b.user_id = $1'];
    let params: any[] = [userId];

    if (status) { conditions.push(`b.status = $2`); params.push(status); }

    const result = await query(`
      SELECT b.*, 
             m.title AS movie_title, m.poster_url, m.duration_mins,
             m.language_id,
             l.name AS language,
             s.start_time, s.end_time, s.base_price,
             sc.name AS screen_name, sc.screen_type,
             t.name AS theatre_name, t.city, t.address,
             p.status AS payment_status, p.method AS payment_method,
             COALESCE(json_agg(DISTINCT jsonb_build_object('row',se.row_label,'num',se.seat_number,'type',st.name)) FILTER (WHERE se.id IS NOT NULL), '[]') AS seats
      FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      LEFT JOIN languages l ON m.language_id = l.id
      JOIN screens sc ON s.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN booking_seats bs ON bs.booking_id = b.id
      LEFT JOIN seats se ON bs.seat_id = se.id
      LEFT JOIN seat_types st ON se.seat_type_id = st.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY b.id, m.id, l.id, s.id, sc.id, t.id, p.id
      ORDER BY b.created_at DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT b.*,
             m.title AS movie_title, m.poster_url, m.banner_url, m.rating, m.duration_mins,
             l.name AS language,
             s.start_time, s.end_time, s.base_price, s.format,
             sc.name AS screen_name, sc.screen_type,
             t.name AS theatre_name, t.city, t.address,
             p.status AS payment_status, p.method AS payment_method, p.transaction_id,
             COALESCE(json_agg(DISTINCT jsonb_build_object('row',se.row_label,'num',se.seat_number,'type',st.name,'price',bs.price)) FILTER (WHERE se.id IS NOT NULL), '[]') AS seats
      FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      LEFT JOIN languages l ON m.language_id = l.id
      JOIN screens sc ON s.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN booking_seats bs ON bs.booking_id = b.id
      LEFT JOIN seats se ON bs.seat_id = se.id
      LEFT JOIN seat_types st ON se.seat_type_id = st.id
      WHERE b.id = $1 AND (b.user_id = $2 OR $3 = 'ADMIN')
      GROUP BY b.id, m.id, l.id, s.id, sc.id, t.id, p.id
    `, [req.params.id, req.user!.id, req.user!.role]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await client.query('BEGIN');

    const booking = await client.query(
      "SELECT * FROM bookings WHERE id=$1 AND (user_id=$2 OR $3='ADMIN') FOR UPDATE",
      [id, userId, req.user!.role]
    );

    if (!booking.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.rows[0].status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    await client.query(`
      UPDATE show_seats ss
      SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL, version = version + 1, updated_at = NOW()
      FROM booking_seats bs
      WHERE bs.booking_id = $1 AND bs.show_seat_id = ss.id
    `, [id]);

    await client.query(
      "UPDATE bookings SET status='CANCELLED', cancelled_at=NOW() WHERE id=$1",
      [id]
    );

    await client.query(
      "UPDATE payments SET status='REFUNDED' WHERE booking_id=$1 AND status='SUCCESS'",
      [id]
    );

    await client.query('COMMIT');

    await createNotification(
      userId, 'BOOKING_CANCELLED',
      'Booking Cancelled',
      `Your booking ${booking.rows[0].booking_reference} has been cancelled. Refund will be processed in 5-7 business days.`,
      { bookingId: id, bookingRef: booking.rows[0].booking_reference }
    );

    if (req.user!.role === 'ADMIN') {
      await logAudit(userId, 'BOOKING_CANCELLED', 'bookings', id as any, { booking_ref: booking.rows[0].booking_reference });
    }

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

export default router;
