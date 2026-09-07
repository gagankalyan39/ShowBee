// ============================================================
// MEMBER 2 - Movie/Data: Movie Routes (Modular Monolith - Movie Module)
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { createNotificationForAllUsers } from '../services/notificationService';
import { logAudit } from '../services/auditService';
import { getIO } from '../socket';

const router = Router();

// GET /api/movies — with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, language, genre, status, city, date, minPrice, maxPrice, trending, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let conditions: string[] = ['m.is_published = TRUE'];
    let params: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(m.title ILIKE $${idx} OR m.director ILIKE $${idx} OR EXISTS (SELECT 1 FROM movie_cast mc JOIN cast_members cm ON mc.cast_member_id=cm.id WHERE mc.movie_id=m.id AND cm.name ILIKE $${idx}))`);
      params.push(`%${search}%`); idx++;
    }
    if (language) {
      conditions.push(`l.code = $${idx}`);
      params.push(language); idx++;
    }
    if (genre) {
      conditions.push(`EXISTS (SELECT 1 FROM movie_genres mg JOIN genres g ON mg.genre_id=g.id WHERE mg.movie_id=m.id AND g.slug=$${idx})`);
      params.push(genre); idx++;
    }
    if (status) {
      conditions.push(`m.status = $${idx}`);
      params.push(status); idx++;
    }
    if (trending === 'true') {
      conditions.push(`m.is_trending = TRUE`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT m.id, m.title, m.synopsis, m.director, m.rating, m.duration_mins,
             m.release_date, m.poster_url, m.banner_url, m.trailer_url,
             m.status, m.is_trending, m.country, m.created_at,
             l.name AS language, l.code AS language_code,
             COALESCE(json_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
             COALESCE(json_agg(DISTINCT cm.name) FILTER (WHERE cm.name IS NOT NULL), '[]') AS cast
      FROM movies m
      LEFT JOIN languages l ON m.language_id = l.id
      LEFT JOIN movie_genres mg ON mg.movie_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      LEFT JOIN movie_cast mc ON mc.movie_id = m.id
      LEFT JOIN cast_members cm ON cm.id = mc.cast_member_id
      ${whereClause}
      GROUP BY m.id, l.name, l.code
      ORDER BY m.is_trending DESC, m.rating DESC, m.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(Number(limit), offset);

    const countSql = `SELECT COUNT(DISTINCT m.id) FROM movies m LEFT JOIN languages l ON m.language_id=l.id LEFT JOIN movie_genres mg ON mg.movie_id=m.id LEFT JOIN genres g ON g.id=mg.genre_id ${whereClause}`;
    const [result, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2))
    ]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: Number(countResult.rows[0].count),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/movies/:id — full details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT m.*, l.name AS language, l.code AS language_code,
        COALESCE(json_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
        COALESCE(json_agg(DISTINCT cm.name) FILTER (WHERE cm.name IS NOT NULL), '[]') AS cast,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name, 'slug', g.slug)) FILTER (WHERE g.id IS NOT NULL), '[]') AS genre_details,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', cm.id, 'name', cm.name, 'role_type', mc.role_type, 'role_name', mc.role_name)) FILTER (WHERE cm.id IS NOT NULL), '[]') AS cast_details,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', mi.id, 'url', mi.url, 'type', mi.image_type)) FILTER (WHERE mi.id IS NOT NULL), '[]') AS images,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM movies m
      LEFT JOIN languages l ON m.language_id = l.id
      LEFT JOIN movie_genres mg ON mg.movie_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      LEFT JOIN movie_cast mc ON mc.movie_id = m.id
      LEFT JOIN cast_members cm ON cm.id = mc.cast_member_id
      LEFT JOIN movie_images mi ON mi.movie_id = m.id
      LEFT JOIN reviews r ON r.movie_id = m.id AND r.is_approved = TRUE
      WHERE m.id = $1
      GROUP BY m.id, l.name, l.code
    `, [id]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    // Increment view count
    await query('UPDATE movies SET view_count = view_count + 1 WHERE id = $1', [id]);

    // Get reviews
    const reviews = await query(`
      SELECT r.*, u.name AS user_name
      FROM reviews r JOIN users u ON r.user_id = u.id
      WHERE r.movie_id = $1 AND r.is_approved = TRUE
      ORDER BY r.created_at DESC LIMIT 10
    `, [id]);

    res.json({ success: true, data: { ...result.rows[0], reviews: reviews.rows } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/movies — admin create
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, synopsis, director, writer, duration_mins, release_date, rating,
      language_code, country, trailer_url, poster_url, banner_url, status, genres, cast } = req.body;

    const langResult = await query('SELECT id FROM languages WHERE code = $1', [language_code]);
    const language_id = langResult.rows[0]?.id || null;

    const result = await query(`
      INSERT INTO movies (title, synopsis, director, writer, duration_mins, release_date, rating,
        language_id, country, trailer_url, poster_url, banner_url, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [title, synopsis, director, writer, duration_mins, release_date, rating,
        language_id, country, trailer_url, poster_url, banner_url, status || 'COMING_SOON', req.user!.id]);

    const movie = result.rows[0];

    // Insert genres
    if (genres?.length) {
      for (const slug of genres) {
        const g = await query('SELECT id FROM genres WHERE slug = $1', [slug]);
        if (g.rows[0]) await query('INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [movie.id, g.rows[0].id]);
      }
    }

    await logAudit(req.user!.id, 'MOVIE_CREATED', 'movies', movie.id, { title });
    res.status(201).json({ success: true, data: movie });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/movies/:id — admin update
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, synopsis, director, writer, duration_mins, release_date, rating,
      language_code, country, trailer_url, poster_url, banner_url, status } = req.body;

    const langResult = language_code ? await query('SELECT id FROM languages WHERE code = $1', [language_code]) : { rows: [{}] };
    const language_id = langResult.rows[0]?.id;

    const result = await query(`
      UPDATE movies SET title=$1, synopsis=$2, director=$3, writer=$4, duration_mins=$5,
        release_date=$6, rating=$7, language_id=COALESCE($8, language_id), country=$9,
        trailer_url=$10, poster_url=$11, banner_url=$12, status=$13, updated_at=NOW()
      WHERE id=$14 RETURNING *
    `, [title, synopsis, director, writer, duration_mins, release_date, rating,
        language_id, country, trailer_url, poster_url, banner_url, status, id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Movie not found' });

    await logAudit(req.user!.id, 'MOVIE_UPDATED', 'movies', id as any, { title });
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/movies/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM movies WHERE id = $1', [id]);
    await logAudit(req.user!.id, 'MOVIE_DELETED', 'movies', id as any, {});
    res.json({ success: true, message: 'Movie deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/movies/:id/publish — triggers notifications
router.post('/:id/publish', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE movies SET is_published = TRUE, status = COALESCE(NULLIF(status,\'DRAFT\'),\'NOW_SHOWING\'), updated_at=NOW() WHERE id=$1 RETURNING *',
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Movie not found' });

    const movie = result.rows[0];

    // Create notifications for all active users
    await createNotificationForAllUsers(
      'MOVIE_RELEASE',
      `🎬 New Movie: ${movie.title}`,
      `${movie.title} is now available on SHOWBEE. Check it out and book your tickets now!`,
      { movieId: id, posterUrl: movie.poster_url }
    );

    // Emit real-time event
    try {
      const io = getIO();
      io.emit('newMovie', { movieId: id, title: movie.title, posterUrl: movie.poster_url });
    } catch {}

    await logAudit(req.user!.id, 'MOVIE_PUBLISHED', 'movies', id as any, { title: movie.title });
    res.json({ success: true, message: `${movie.title} published and users notified`, data: movie });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/movies/:id/shows — available shows for a movie
router.get('/:id/shows', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { city, date } = req.query;
    let conditions = ['s.movie_id = $1', 's.is_active = TRUE', 's.start_time > NOW()'];
    let params: any[] = [id];
    let idx = 2;

    if (city) { conditions.push(`t.city ILIKE $${idx}`); params.push(`%${city}%`); idx++; }
    if (date) {
      conditions.push(`DATE(s.start_time) = $${idx}`);
      params.push(date); idx++;
    }

    const result = await query(`
      SELECT s.*, sc.name AS screen_name, sc.screen_type, sc.capacity,
             t.name AS theatre_name, t.city, t.address, t.amenities,
             t.id AS theatre_id,
             l.name AS language,
             COUNT(ss.id) FILTER (WHERE ss.status='AVAILABLE') AS available_seats
      FROM shows s
      JOIN screens sc ON s.screen_id = sc.id
      JOIN theatres t ON sc.theatre_id = t.id
      LEFT JOIN languages l ON s.language_id = l.id
      LEFT JOIN show_seats ss ON ss.show_id = s.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.id, sc.id, t.id, l.id
      ORDER BY t.city, t.name, s.start_time
    `, params);

    // Group by theatre
    const byTheatre: any = {};
    for (const row of result.rows) {
      if (!byTheatre[row.theatre_id]) {
        byTheatre[row.theatre_id] = {
          theatre: { id: row.theatre_id, name: row.theatre_name, city: row.city, address: row.address, amenities: row.amenities },
          shows: []
        };
      }
      byTheatre[row.theatre_id].shows.push(row);
    }

    res.json({ success: true, data: Object.values(byTheatre) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/movies/:id/reviews
router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT r.*, u.name AS user_name FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.movie_id = $1 AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/movies/:id/reviews
router.post('/:id/reviews', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, review_text } = req.body;
    const movieId = req.params.id;
    const userId = req.user!.id;

    // Check user has a confirmed booking for this movie
    const bookingCheck = await query(`
      SELECT b.id FROM bookings b
      JOIN shows s ON b.show_id = s.id
      WHERE b.user_id = $1 AND s.movie_id = $2 AND b.status = 'CONFIRMED'
      LIMIT 1
    `, [userId, movieId]);
    if (!bookingCheck.rows[0]) {
      return res.status(403).json({ success: false, message: 'You must have a confirmed booking to review this movie' });
    }

    const result = await query(`
      INSERT INTO reviews (user_id, movie_id, booking_id, rating, review_text)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, movie_id)
      DO UPDATE SET rating=$4, review_text=$5 RETURNING *
    `, [userId, movieId, bookingCheck.rows[0].id, rating, review_text]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
