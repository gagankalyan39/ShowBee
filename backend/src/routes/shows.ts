// ============================================================
// MEMBER 2 & 3 - Movie Shows & Showtime Scheduler
// ============================================================
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

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
    const { movie_id, screen_id, start_time, end_time, base_price, language_id } = req.body;
    if (!movie_id || !screen_id || !start_time || !end_time || !base_price) {
      return res.status(400).json({ success: false, message: 'Missing required fields for show creation' });
    }

    await client.query('BEGIN');

    const showRes = await client.query(
      `INSERT INTO shows (movie_id, screen_id, start_time, end_time, base_price, language_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [movie_id, screen_id, start_time, end_time, base_price, language_id || null]
    );
    const newShow = showRes.rows[0];

    // Auto-generate show_seats from screen seats
    const seatsRes = await client.query(
      `SELECT s.id, st.price_multiplier 
       FROM seats s 
       JOIN seat_types st ON s.seat_type_id = st.id 
       WHERE s.screen_id = $1`,
      [screen_id]
    );

    for (const seat of seatsRes.rows) {
      const price = parseFloat(base_price) * parseFloat(seat.price_multiplier);
      await client.query(
        `INSERT INTO show_seats (show_id, seat_id, status, price)
         VALUES ($1, $2, 'AVAILABLE', $3)
         ON CONFLICT (show_id, seat_id) DO NOTHING`,
        [newShow.id, seat.id, price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: newShow });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

export default router;
