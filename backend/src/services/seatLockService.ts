// ============================================================
// MEMBER 3 & 4 - Seat Lock Cleanup Service (Cron + Realtime)
// Releases expired held seats and notifies connected clients
// ============================================================
import cron from 'node-cron';
import { query } from '../db';
import { getIO } from '../socket';

export function startSeatLockCleanupJob() {
  // Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      // Find seats that expired
      const expiredRes = await query(`
        UPDATE show_seats
        SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL
        WHERE status = 'HELD' AND lock_expires_at < NOW()
        RETURNING id, show_id, seat_id
      `);

      if (expiredRes.rows.length > 0) {
        console.log(`🧹 Released ${expiredRes.rows.length} expired seat lock(s)`);
        
        // Notify via Socket.IO
        const io = getIO();
        if (io) {
          // Group by show_id to emit targeted events
          const byShow: Record<string, string[]> = {};
          expiredRes.rows.forEach((r: any) => {
            if (!byShow[r.show_id]) byShow[r.show_id] = [];
            byShow[r.show_id].push(r.seat_id);
          });

          Object.entries(byShow).forEach(([showId, seatIds]) => {
            io.to(`show_${showId}`).emit('seats_released', {
              showId,
              seatIds,
              timestamp: new Date().toISOString()
            });
          });
        }
      }
    } catch (err: any) {
      console.error('Error in seat lock cleanup job:', err.message);
    }
  });

  console.log('⏰ Seat lock background cleanup job scheduled (every 30s)');
}
