import pool, { getClient } from '../db';

export async function resetSeatsAndShows() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Extend active shows end times into the future so they are bookable
    await client.query(`
      UPDATE shows
      SET start_time = NOW(),
          end_time = NOW() + INTERVAL '30 days'
      WHERE is_active = true
    `);

    // 2. Fetch the primary benchmark show
    const showRes = await client.query(`
      SELECT sh.id, m.title, COUNT(ss.id) as total_seats
      FROM shows sh
      JOIN movies m ON sh.movie_id = m.id
      JOIN show_seats ss ON ss.show_id = sh.id
      WHERE sh.is_active = true
      GROUP BY sh.id, m.title
      HAVING COUNT(ss.id) >= 50
      ORDER BY total_seats DESC, sh.id ASC
      LIMIT 1
    `);

    if (showRes.rows.length === 0) {
      throw new Error('No active show found with at least 50 seats');
    }

    const show = showRes.rows[0];
    const showId = show.id;

    // 3. Reset all seats for this show to AVAILABLE with version 1
    await client.query(`
      UPDATE show_seats
      SET status = 'AVAILABLE',
          locked_by = NULL,
          lock_expires_at = NULL,
          version = 1
      WHERE show_id = $1
    `, [showId]);

    // 4. Delete bookings for this show
    await client.query(`
      DELETE FROM booking_seats
      WHERE show_seat_id IN (SELECT id FROM show_seats WHERE show_id = $1)
    `, [showId]);

    await client.query('COMMIT');

    // 5. Verify double bookings count (must be exactly 0)
    const auditRes = await client.query(`
      SELECT seat_id, COUNT(*)
      FROM show_seats
      WHERE show_id = $1 AND status = 'BOOKED'
      GROUP BY seat_id
      HAVING COUNT(*) > 1
    `, [showId]);

    const result = {
      success: true,
      showId,
      movieTitle: show.title,
      totalSeats: parseInt(show.total_seats),
      doubleBookings: auditRes.rows.length,
    };
    console.log(JSON.stringify(result));
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error resetting seats:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  resetSeatsAndShows()
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}
