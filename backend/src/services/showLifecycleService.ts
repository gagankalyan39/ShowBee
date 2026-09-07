// ============================================================
// MEMBER 3 & 4 - Show Lifecycle Real-Time Monitor
// Keeps show statuses updated in real time (UPCOMING, STARTED, ENDED)
// and emits WebSocket events when screenings start or conclude.
// Data is always preserved in DB for analytics and audits.
// ============================================================
import cron from 'node-cron';
import { query } from '../db';
import { getIO } from '../socket';

export function startShowLifecycleService() {
  // Run every 30 seconds to monitor show lifecycle in real time
  cron.schedule('*/30 * * * * *', async () => {
    try {
      // Find shows that recently ended (within last 40 seconds)
      const recentlyEnded = await query(`
        SELECT sh.id, sh.movie_id, m.title as movie_title, sh.start_time, sh.end_time
        FROM shows sh
        JOIN movies m ON sh.movie_id = m.id
        WHERE sh.end_time <= NOW()
          AND sh.end_time >= NOW() - INTERVAL '40 seconds'
      `);

      if (recentlyEnded.rows.length > 0) {
        console.log(`🎬 [Real-Time Lifecycle] ${recentlyEnded.rows.length} screening(s) concluded.`);
        const io = getIO();
        if (io) {
          io.emit('shows_updated', {
            event: 'SHOW_ENDED',
            timestamp: new Date().toISOString(),
            endedShows: recentlyEnded.rows.map(r => ({ id: r.id, movie_id: r.movie_id, title: r.movie_title })),
          });
        }
      }

      // Also notify on shows starting
      const recentlyStarted = await query(`
        SELECT sh.id, sh.movie_id, m.title as movie_title
        FROM shows sh
        JOIN movies m ON sh.movie_id = m.id
        WHERE sh.start_time <= NOW()
          AND sh.start_time >= NOW() - INTERVAL '40 seconds'
      `);

      if (recentlyStarted.rows.length > 0) {
        console.log(`🍿 [Real-Time Lifecycle] ${recentlyStarted.rows.length} screening(s) started.`);
        const io = getIO();
        if (io) {
          io.emit('shows_updated', {
            event: 'SHOW_STARTED',
            timestamp: new Date().toISOString(),
            startedShows: recentlyStarted.rows.map(r => ({ id: r.id, movie_id: r.movie_id, title: r.movie_title })),
          });
        }
      }
    } catch (err: any) {
      console.error('Error in show lifecycle service:', err.message);
    }
  });

  console.log('⚡ Show real-time lifecycle monitor initialized (30s checks)');
}
