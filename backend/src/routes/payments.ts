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
    // Here we simulate: 90% success unless explicitly forced.
    const forceResult = simulateResult || (Math.random() < 0.9 ? 'SUCCESS' : 'FAILED');
    const transactionId = `TXN${uuidv4().replace(/-/g,'').toUpperCase().slice(0,16)}`;

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

      // Mark show_seats as BOOKED
      await client.query(`
        UPDATE show_seats ss SET status='BOOKED', lock_expires_at=NULL
        FROM booking_seats bs
        WHERE bs.booking_id=$1 AND bs.show_seat_id=ss.id
      `, [bookingId]);

      await client.query('COMMIT');

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
        io.to(`user_${userId}`).emit('bookingConfirmed', { bookingId, ref: booking.booking_reference, amount: booking.total_amount });
      } catch {}

      return res.json({
        success: true,
        message: 'Payment successful! Booking confirmed.',
        data: { paymentStatus: 'SUCCESS', transactionId, bookingStatus: 'CONFIRMED', qrCode, booking_reference: booking.booking_reference }
      });

    } else {
      // ── PAYMENT FAILED / CANCELLED ───────────────────────────
      await client.query(`UPDATE bookings SET status='FAILED', updated_at=NOW() WHERE id=$1`, [bookingId]);

      // Release seats back to AVAILABLE
      await client.query(`
        UPDATE show_seats ss SET status='AVAILABLE', locked_by=NULL, lock_expires_at=NULL
        FROM booking_seats bs WHERE bs.booking_id=$1 AND bs.show_seat_id=ss.id
      `, [bookingId]);

      await client.query('COMMIT');

      await createNotification(userId, 'PAYMENT_FAILED', '❌ Payment Failed',
        `Your payment of ₹${booking.total_amount} for booking ${booking.booking_reference} failed. Please try again.`,
        { bookingId, transactionId }
      );

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
