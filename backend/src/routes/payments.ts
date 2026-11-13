// ============================================================
// MEMBER 3 - Backend/Booking: Payment Routes (Mock Gateway)
// ============================================================
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import { getIO } from '../socket';
import { generateQR } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import { paymentOutcomes } from '../metrics';

const router = Router();

// POST /api/payments — process mock payment
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const { bookingId, method, simulateResult } = req.body;
    const userId = req.user!.id;

    await client.query('BEGIN');

    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id=$1 AND user_id=$2 FOR UPDATE',
      [bookingId, userId]
    );
    if (!bookingResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = bookingResult.rows[0];

    if (booking.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}` });
    }

    // ── MOCK PAYMENT GATEWAY ──────────────────────────────────
    // In a real system, this calls Razorpay/Stripe/PayU.
    // Default to SUCCESS if not specified, or respect simulateResult
    const forceResult = simulateResult || 'SUCCESS';
    const transactionId = `TXN${uuidv4().replace(/-/g,'').toUpperCase().slice(0,16)}`;

    // Re-verify and lock all show_seats associated with this booking in deterministic order
    const seatsCheck = await client.query(`
      SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at, ss.version,
             se.row_label, se.seat_number
      FROM show_seats ss
      JOIN booking_seats bs ON bs.show_seat_id = ss.id
      JOIN seats se ON ss.seat_id = se.id
      WHERE bs.booking_id = $1
      ORDER BY ss.id ASC
      FOR UPDATE
    `, [bookingId]);

    // Check race condition: did hold expire or get acquired by someone else before payment?
    let seatsExpiredOrLost = false;
    let invalidReason = '';

    for (const seat of seatsCheck.rows) {
      if (seat.status !== 'HELD' || seat.locked_by !== userId) {
        seatsExpiredOrLost = true;
        invalidReason = `Seat ${seat.row_label}${seat.seat_number} is no longer reserved by you. Hold was released or acquired concurrently.`;
        break;
      }
      if (new Date(seat.lock_expires_at) <= new Date()) {
        seatsExpiredOrLost = true;
        invalidReason = `Seat reservation for ${seat.row_label}${seat.seat_number} expired before payment was completed.`;
        break;
      }
    }

    if (seatsExpiredOrLost) {
      await client.query(`
        INSERT INTO payments (booking_id, method, amount, status, transaction_id, gateway_response)
        VALUES ($1,$2,$3,'FAILED',$4,$5)
      `, [bookingId, method.toUpperCase(), booking.total_amount, transactionId,
          JSON.stringify({ gateway: 'MockPay', error: invalidReason, timestamp: new Date() })]);

      await client.query(`UPDATE bookings SET status='FAILED', updated_at=NOW() WHERE id=$1`, [bookingId]);
      await client.query('COMMIT');

      paymentOutcomes.labels('failed', method.toUpperCase(), process.env.ARCHITECTURE_LABEL || 'monolith').inc();

      return res.status(409).json({
        success: false,
        message: invalidReason,
        data: { paymentStatus: 'FAILED', transactionId, bookingStatus: 'FAILED' }
      });
    }

    const paymentStatus = forceResult === 'SUCCESS' ? 'SUCCESS' :
                          forceResult === 'CANCELLED' ? 'CANCELLED' : 'FAILED';

    // Insert payment record
    await client.query(`
      INSERT INTO payments (booking_id, method, amount, status, transaction_id, gateway_response)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [bookingId, method.toUpperCase(), booking.total_amount, paymentStatus,
        transactionId, JSON.stringify({ gateway: 'MockPay', timestamp: new Date() })]);

    if (paymentStatus === 'SUCCESS') {
      // ── CONFIRM BOOKING ───────────────────────────────────────
      const qrData = JSON.stringify({
        ref: booking.booking_reference, bookingId, userId,
        amount: booking.total_amount, ts: Date.now()
      });
      const qrCode = await generateQR(qrData);

      await client.query(`
        UPDATE bookings SET status='CONFIRMED', qr_code=$1, updated_at=NOW() WHERE id=$2
      `, [qrCode, bookingId]);

      // Mark show_seats as BOOKED with version increment
      await client.query(`
        UPDATE show_seats ss
        SET status='BOOKED', lock_expires_at=NULL, version=version+1, updated_at=NOW()
        FROM booking_seats bs
        WHERE bs.booking_id=$1 AND bs.show_seat_id=ss.id
          AND ss.status='HELD' AND ss.locked_by=$2
      `, [bookingId, userId]);

      await client.query('COMMIT');
      paymentOutcomes.labels('success', method.toUpperCase(), process.env.ARCHITECTURE_LABEL || 'monolith').inc();

      // Get show details for notification
      const showInfo = await query(`
        SELECT m.title, t.name AS theatre, s.start_time
        FROM bookings b
        JOIN shows s ON b.show_id=s.id
        JOIN movies m ON s.movie_id=m.id
        JOIN screens sc ON s.screen_id=sc.id
        JOIN theatres t ON sc.theatre_id=t.id
        WHERE b.id=$1
      `, [bookingId]);
      const si = showInfo.rows[0];
      const showDate = si ? new Date(si.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '';

      // Booking confirmed notification
      await createNotification(
        userId, 'BOOKING_CONFIRMED',
        '🎟️ Booking Confirmed!',
        `Your booking for ${si?.title || 'your movie'} at ${si?.theatre || ''} on ${showDate} has been confirmed. Ref: ${booking.booking_reference}`,
        { bookingId, bookingRef: booking.booking_reference, transactionId }
      );

      // Real-time emit
      try {
        const io = getIO();
        if (io) {
          io.to(`user_${userId}`).emit('bookingConfirmed', { bookingId, ref: booking.booking_reference, amount: booking.total_amount });
          io.emit('seat_status_update', {
            showId: booking.show_id,
            seatIds: seatsCheck.rows.map((r: any) => r.id),
            status: 'BOOKED',
            lockedBy: userId,
          });
        }
      } catch {}

      return res.json({
        success: true,
        message: 'Payment successful! Booking confirmed.',
        data: { paymentStatus: 'SUCCESS', transactionId, bookingStatus: 'CONFIRMED', qrCode, booking_reference: booking.booking_reference }
      });

    } else {
      // ── PAYMENT FAILED / CANCELLED ───────────────────────────
      await client.query(`UPDATE bookings SET status='FAILED', updated_at=NOW() WHERE id=$1`, [bookingId]);

      // Release seats back to AVAILABLE with version increment
      await client.query(`
        UPDATE show_seats ss
        SET status='AVAILABLE', locked_by=NULL, lock_expires_at=NULL, version=version+1, updated_at=NOW()
        FROM booking_seats bs
        WHERE bs.booking_id=$1 AND bs.show_seat_id=ss.id
          AND ss.status='HELD' AND ss.locked_by=$2
      `, [bookingId, userId]);

      await client.query('COMMIT');
      paymentOutcomes.labels(paymentStatus.toLowerCase(), method.toUpperCase(), process.env.ARCHITECTURE_LABEL || 'monolith').inc();

      await createNotification(userId, 'PAYMENT_FAILED', '❌ Payment Failed',
        `Your payment of ₹${booking.total_amount} for booking ${booking.booking_reference} failed. Please try again.`,
        { bookingId, transactionId }
      );

      try {
        const io = getIO();
        if (io) {
          io.emit('seat_status_update', {
            showId: booking.show_id,
            seatIds: seatsCheck.rows.map((r: any) => r.id),
            status: 'AVAILABLE',
            lockedBy: null,
          });
        }
      } catch {}

      return res.status(402).json({
        success: false,
        message: paymentStatus === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed. Please try again.',
        data: { paymentStatus, transactionId, bookingStatus: 'FAILED' }
      });
    }
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/payments/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT p.*, b.booking_reference, b.user_id FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.id=$1 AND (b.user_id=$2 OR $3='ADMIN')
    `, [req.params.id, req.user!.id, req.user!.role]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
