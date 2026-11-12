// ============================================================
// MEMBER 2 & 3 - Movie Shows & Showtime Scheduler
// ============================================================
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getIO } from '../socket';

const router = Router();

// Helper: Map auditorium row strictly to standard cinema seating tier
function getSeatTierCategory(rowLabel: string): 'REGULAR' | 'PREMIUM' | 'VIP' | 'RECLINER' {
  const r = (rowLabel || '').toUpperCase().trim();
  if (['A', 'B'].includes(r)) return 'REGULAR';
  if (['C', 'D', 'E', 'F'].includes(r)) return 'PREMIUM';
  if (['G', 'H'].includes(r)) return 'VIP';
  return 'RECLINER';
}

// GET /api/shows - Query shows with filters (movie_id, theatre_id, date, city)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { movie_id, theatre_id, date, city } = req.query;
    let sql = `
      SELECT sh.*, 
        m.title as movie_title, m.poster_url, m.duration_mins, m.rating,
        l.name as language_name,
        sc.name as screen_name, sc.screen_type,
        t.id as theatre_id, t.name as theatre_name, t.city as theatre_city, t.address as theatre_address
      FROM shows sh
      JOIN movies m ON sh.movie_id = m.id
      JOIN screens sc ON sh.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN languages l ON sh.language_id = l.id
      WHERE sh.is_active = true AND sc.is_active = true
    `;
    const params: any[] = [];

    if (movie_id) {
      params.push(movie_id);
      sql += ` AND sh.movie_id = $${params.length}`;
    }

    if (theatre_id) {
      params.push(theatre_id);
      sql += ` AND sc.theatre_id = $${params.length}`;
    }

    if (city) {
      params.push(city);
      sql += ` AND LOWER(t.city) = LOWER($${params.length})`;
    }

    if (date) {
      params.push(date);
      sql += ` AND DATE(sh.start_time) = $${params.length}`;
    } else {
      sql += ` AND sh.start_time >= NOW() - INTERVAL '30 minutes'`;
    }

    sql += ` ORDER BY sh.start_time ASC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/shows/movie/:movieId - Grouped shows for a movie by theatre & date
router.get('/movie/:movieId', async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;
    const { date, city, only_upcoming } = req.query;

    // Check movie status
    const movieCheck = await query(`SELECT id, title, status FROM movies WHERE id = $1`, [movieId]);
    if (!movieCheck.rows[0]) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    const movie = movieCheck.rows[0];
    const isComingSoon = movie.status === 'COMING_SOON';

    // Coming Soon movies: ONLY advance booking for next 2 days (Tomorrow & Day 3). NEVER today!
    if (isComingSoon && date === 'today') {
      return res.json({
        success: true,
        data: [],
        is_coming_soon: true,
        message: 'This movie is Coming Soon. Advance booking is open for Tomorrow and Day 3 only.'
      });
    }

    let sql = `
      SELECT 
        t.id as theatre_id, t.name as theatre_name, t.city, t.address, t.amenities,
        sh.id as show_id, sh.start_time, sh.end_time, sh.base_price,
        sc.id as screen_id, sc.name as screen_name, sc.screen_type,
        l.name as language_name,
        CASE 
          WHEN sh.end_time <= NOW() THEN 'ENDED'
          WHEN sh.start_time <= NOW() AND sh.end_time > NOW() THEN 'STARTED'
          ELSE 'UPCOMING'
        END as show_status,
        (sh.start_time > NOW()) as is_bookable,
        (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = sh.id AND ss.status = 'AVAILABLE') as available_seats,
        (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = sh.id) as total_seats
      FROM shows sh
      JOIN screens sc ON sh.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN languages l ON sh.language_id = l.id
      WHERE sh.movie_id = $1 AND sh.is_active = true AND sc.is_active = true
    `;
    const params: any[] = [movieId];

    if (city) {
      params.push(city);
      sql += ` AND LOWER(t.city) = LOWER($${params.length})`;
    }

    if (date) {
      if (date === 'today') {
        sql += ` AND DATE(sh.start_time) = CURRENT_DATE`;
      } else if (date === 'tomorrow') {
        sql += ` AND DATE(sh.start_time) = CURRENT_DATE + INTERVAL '1 day'`;
      } else if (date === 'day3') {
        sql += ` AND DATE(sh.start_time) = CURRENT_DATE + INTERVAL '2 days'`;
      } else if (date === 'day4') {
        sql += ` AND DATE(sh.start_time) = CURRENT_DATE + INTERVAL '3 days'`;
      } else {
        params.push(date);
        sql += ` AND DATE(sh.start_time) = $${params.length}`;
      }
    } else {
      sql += ` AND sh.start_time >= NOW() - INTERVAL '15 minutes'`;
    }

    if (only_upcoming === 'true') {
      sql += ` AND sh.start_time > NOW()`;
    }

    sql += ` ORDER BY t.name ASC, sh.start_time ASC`;

    const result = await query(sql, params);

    // Group by theatre
    const theatreMap = new Map();
    result.rows.forEach((row: any) => {
      if (!theatreMap.has(row.theatre_id)) {
        theatreMap.set(row.theatre_id, {
          id: row.theatre_id,
          name: row.theatre_name,
          city: row.city,
          address: row.address,
          amenities: row.amenities,
          shows: [],
        });
      }
      theatreMap.get(row.theatre_id).shows.push({
        id: row.show_id,
        start_time: row.start_time,
        end_time: row.end_time,
        base_price: parseFloat(row.base_price),
        screen_id: row.screen_id,
        screen_name: row.screen_name,
        screen_type: row.screen_type,
        language: row.language_name,
        show_status: row.show_status,
        is_bookable: row.is_bookable && row.show_status === 'UPCOMING',
        is_concluded: row.show_status === 'ENDED' || new Date(row.end_time) <= new Date(),
        available_seats: parseInt(row.available_seats, 10),
        total_seats: parseInt(row.total_seats, 10),
      });
    });

    res.json({
      success: true,
      is_coming_soon: isComingSoon,
      data: Array.from(theatreMap.values()),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/shows/admin/all - Admin: List shows with occupancy and theatre info
router.get('/admin/all', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { city, movie_id, limit = 500, include_inactive } = req.query;
    let sql = `
      SELECT 
        sh.id, sh.start_time, sh.end_time, sh.base_price, sh.format, sh.is_active,
        m.id as movie_id, m.title as movie_title, m.poster_url, m.duration_mins,
        t.id as theatre_id, t.name as theatre_name, t.city as theatre_city,
        sc.id as screen_id, sc.name as screen_name, sc.screen_type,
        COUNT(ss.id) as total_seats,
        COUNT(ss.id) FILTER (WHERE ss.status = 'BOOKED') as booked_seats,
        COUNT(ss.id) FILTER (WHERE ss.status = 'HELD') as held_seats,
        COUNT(ss.id) FILTER (WHERE ss.status = 'AVAILABLE') as available_seats
      FROM shows sh
      JOIN movies m ON sh.movie_id = m.id
      JOIN screens sc ON sh.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN show_seats ss ON ss.show_id = sh.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (include_inactive !== 'true') {
      sql += ` AND sh.is_active = true`;
    }
    if (city) {
      params.push(city);
      sql += ` AND LOWER(t.city) = LOWER($${params.length})`;
    }
    if (movie_id) {
      params.push(movie_id);
      sql += ` AND sh.movie_id = $${params.length}`;
    }
    sql += `
      GROUP BY sh.id, m.id, t.id, sc.id
      ORDER BY sh.start_time ASC
      LIMIT $${params.length + 1}
    `;
    params.push(Math.min(Number(limit) || 500, 1000));

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/shows/batch - Admin: Create shows across multiple theatres
router.post('/batch', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { 
      movie_id, 
      theatre_ids, 
      dates, 
      times, 
      base_price = 200,
      tier_prices, 
      format = '2D',
      screen_type 
    } = req.body;

    if (!movie_id || !theatre_ids || !Array.isArray(theatre_ids) || theatre_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Movie ID and at least one Theatre ID are required' });
    }

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one date is required (format: YYYY-MM-DD)' });
    }

    if (!times || !Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one showtime is required (format: HH:mm)' });
    }

    // Get movie duration to compute end_time
    const movieRes = await client.query('SELECT duration_mins, language_id FROM movies WHERE id = $1', [movie_id]);
    if (!movieRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    const durationMins = movieRes.rows[0].duration_mins || 150;
    const languageId = movieRes.rows[0].language_id || null;

    await client.query('BEGIN');

    const createdShows: any[] = [];
    let totalSeatsCreated = 0;

    for (const theatreId of theatre_ids) {
      // Find active screens for this theatre
      let screenSql = 'SELECT id, name, screen_type FROM screens WHERE theatre_id = $1 AND is_active = true';
      const screenParams: any[] = [theatreId];
      if (screen_type && screen_type !== 'ALL') {
        screenSql += ' AND (screen_type ILIKE $2 OR name ILIKE $2)';
        screenParams.push(`%${screen_type}%`);
      }
      screenSql += ' ORDER BY name ASC';
      const screensRes = await client.query(screenSql, screenParams);
      
      const targetScreens = screensRes.rows.length > 0 ? [screensRes.rows[0]] : [];
      if (targetScreens.length === 0) {
        const anyScreen = await client.query('SELECT id, name, screen_type FROM screens WHERE theatre_id = $1 AND is_active = true LIMIT 1', [theatreId]);
        if (anyScreen.rows[0]) targetScreens.push(anyScreen.rows[0]);
      }

      for (const screen of targetScreens) {
        // Fetch screen seats with row labels
        const seatsRes = await client.query(
          `SELECT s.id, s.row_label, s.seat_number, st.name as type_name, st.price_multiplier 
           FROM seats s 
           LEFT JOIN seat_types st ON s.seat_type_id = st.id 
           WHERE s.screen_id = $1`,
          [screen.id]
        );

        for (const dateStr of dates) {
          for (const timeStr of times) {
            const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (durationMins + 30) * 60 * 1000);

            // Avoid duplicate identical screening
            const existing = await client.query(
              'SELECT id FROM shows WHERE screen_id = $1 AND start_time = $2',
              [screen.id, startDateTime]
            );
            if (existing.rows.length > 0) continue;

            const finalBasePrice = (tier_prices && tier_prices.REGULAR) ? Number(tier_prices.REGULAR) : (Number(base_price) || 200);
            const insertShowRes = await client.query(
              `INSERT INTO shows (movie_id, screen_id, start_time, end_time, base_price, language_id, format, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, true)
               RETURNING id, movie_id, screen_id, start_time, end_time, base_price`,
              [movie_id, screen.id, startDateTime, endDateTime, finalBasePrice, languageId, format]
            );
            const newShow = insertShowRes.rows[0];
            createdShows.push(newShow);

            // Populate show_seats strictly according to the 4-tier seating hierarchy:
            // Rows A-B: REGULAR | Rows C-F: PREMIUM | Rows G-H: VIP | Rows I-J: RECLINER
            for (const seat of seatsRes.rows) {
              const category = getSeatTierCategory(seat.row_label);
              let seatPrice: number;
              if (tier_prices && tier_prices[category] !== undefined && Number(tier_prices[category]) > 0) {
                seatPrice = Math.round(Number(tier_prices[category]));
              } else {
                const multipliers: Record<string, number> = {
                  REGULAR: 1.0,
                  PREMIUM: 1.25,
                  VIP: 1.75,
                  RECLINER: 2.25,
                };
                seatPrice = Math.round(Number(finalBasePrice) * (multipliers[category] || 1.0));
              }
              await client.query(
                `INSERT INTO show_seats (show_id, seat_id, status, price, version)
                 VALUES ($1, $2, 'AVAILABLE', $3, 1)
                 ON CONFLICT (show_id, seat_id) DO UPDATE SET price = EXCLUDED.price`,
                [newShow.id, seat.id, seatPrice]
              );
              totalSeatsCreated++;
            }
          }
        }
      }
    }

    await client.query('COMMIT');

    try {
      const io = getIO();
      if (io) {
        io.emit('shows_updated', {
          action: 'BATCH_CREATED',
          movie_id,
          theatre_ids,
          count: createdShows.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Socket broadcast error (batch show creation):', e);
    }
    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdShows.length} shows across ${theatre_ids.length} theatres (${totalSeatsCreated} seats initialized).`,
      count: createdShows.length,
      data: createdShows,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// GET /api/shows/:id - Get detailed show with movie & screen details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT sh.*, 
        m.id as movie_id, m.title as movie_title, m.poster_url, m.duration_mins, m.rating, m.synopsis,
        l.name as language_name,
        sc.id as screen_id, sc.name as screen_name, sc.screen_type,
        t.id as theatre_id, t.name as theatre_name, t.city as theatre_city, t.address as theatre_address, t.amenities as theatre_amenities
      FROM shows sh
      JOIN movies m ON sh.movie_id = m.id
      JOIN screens sc ON sh.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN languages l ON sh.language_id = l.id
      WHERE sh.id = $1
    `;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Create Show and auto-populate show_seats
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { movie_id, screen_id, start_time, end_time, base_price, language_id, tier_prices } = req.body;
    if (!movie_id || !screen_id || !start_time || !end_time || !base_price) {
      return res.status(400).json({ success: false, message: 'Missing required fields for show creation' });
    }

    await client.query('BEGIN');

    const finalBasePrice = (tier_prices && tier_prices.REGULAR) ? Number(tier_prices.REGULAR) : (Number(base_price) || 200);

    const showRes = await client.query(
      `INSERT INTO shows (movie_id, screen_id, start_time, end_time, base_price, language_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [movie_id, screen_id, start_time, end_time, finalBasePrice, language_id || null]
    );
    const newShow = showRes.rows[0];

    // Auto-generate show_seats from screen seats with row hierarchy
    const seatsRes = await client.query(
      `SELECT s.id, s.row_label, s.seat_number, st.name as type_name, st.price_multiplier 
       FROM seats s 
       LEFT JOIN seat_types st ON s.seat_type_id = st.id 
       WHERE s.screen_id = $1`,
      [screen_id]
    );

    for (const seat of seatsRes.rows) {
      const category = getSeatTierCategory(seat.row_label);
      let price: number;
      if (tier_prices && tier_prices[category] !== undefined && Number(tier_prices[category]) > 0) {
        price = Math.round(Number(tier_prices[category]));
      } else {
        const multipliers: Record<string, number> = {
          REGULAR: 1.0,
          PREMIUM: 1.25,
          VIP: 1.75,
          RECLINER: 2.25,
        };
        price = Math.round(Number(finalBasePrice) * (multipliers[category] || 1.0));
      }
      await client.query(
        `INSERT INTO show_seats (show_id, seat_id, status, price)
         VALUES ($1, $2, 'AVAILABLE', $3)
         ON CONFLICT (show_id, seat_id) DO UPDATE SET price = EXCLUDED.price`,
        [newShow.id, seat.id, price]
      );
    }

    await client.query('COMMIT');

    try {
      const io = getIO();
      if (io) {
        io.emit('shows_updated', {
          action: 'CREATED',
          movie_id,
          show_id: newShow.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Socket broadcast error (show creation):', e);
    }
    res.status(201).json({ success: true, data: newShow });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// POST /api/shows/batch-delete - Admin: Remove multiple shows at once
router.post('/batch-delete', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { showIds } = req.body;
    if (!showIds || !Array.isArray(showIds) || showIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No show IDs provided for batch removal' });
    }

    await client.query('BEGIN');

    // Cleanly cascade remove payments, booking seats, bookings, and show_seats for all selected shows
    await client.query(`DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE show_id = ANY($1::uuid[]))`, [showIds]);
    await client.query(`DELETE FROM booking_seats WHERE show_seat_id IN (SELECT id FROM show_seats WHERE show_id = ANY($1::uuid[]))`, [showIds]);
    await client.query(`DELETE FROM bookings WHERE show_id = ANY($1::uuid[])`, [showIds]);
    await client.query(`DELETE FROM show_seats WHERE show_id = ANY($1::uuid[])`, [showIds]);
    const deleteRes = await client.query(`DELETE FROM shows WHERE id = ANY($1::uuid[])`, [showIds]);

    await client.query('COMMIT');

    try {
      const io = getIO();
      if (io) {
        io.emit('shows_updated', {
          action: 'BATCH_DELETED',
          show_ids: showIds,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Socket broadcast error (batch show deletion):', e);
    }

    res.json({
      success: true,
      message: `Successfully removed ${deleteRes.rowCount} show(s) and their associated seat matrices.`,
      count: deleteRes.rowCount,
      deleted_ids: showIds
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/shows/:id - Admin: Remove show
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    // Check if show exists
    const showRes = await client.query('SELECT * FROM shows WHERE id = $1', [id]);
    if (!showRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    await client.query('BEGIN');

    // Cleanly cascade remove payments, booking seats, bookings, and show_seats
    await client.query('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE show_id = $1)', [id]);
    await client.query('DELETE FROM booking_seats WHERE show_seat_id IN (SELECT id FROM show_seats WHERE show_id = $1)', [id]);
    await client.query('DELETE FROM bookings WHERE show_id = $1', [id]);
    await client.query('DELETE FROM show_seats WHERE show_id = $1', [id]);
    await client.query('DELETE FROM shows WHERE id = $1', [id]);

    await client.query('COMMIT');

    try {
      const io = getIO();
      if (io) {
        io.emit('shows_updated', {
          action: 'DELETED',
          show_id: id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Socket broadcast error (show deletion):', e);
    }
    res.json({ success: true, message: 'Show and associated seat matrix removed successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

export default router;
